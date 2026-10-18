import {calendar} from './calendar.js';
import {areaEnvironment} from './area-environment.js';
const hex=values=>'#'+values.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const byte=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const cache=new Map(),LIMIT=4096;
export const MAX_GRADE_PIXELS=4194304;
export function sceneProfile(s,a,weather){
  a=areaEnvironment(s,a);
  if(a.interior)return {key:'room',multiply:'#f2e8d6',lift:'#060402',underground:true};
  const clock=calendar(s.tick),underground=a.realm==='underground'||['cave','dungeon','undercity'].includes(a.type);
  let multiply=underground?[.76,.8,.88]:clock.night?[.56,.65,.79]:clock.phase==='Вечер'?[.91,.9,.94]:[.98,.99,.97],lift=underground?[4,6,10]:clock.night?[4,7,12]:clock.phase==='Вечер'?[6,3,5]:[2,2,3];
  if(!underground&&['rain','storm','cloud','fog','snow'].includes(weather.id)){const storm=weather.id==='storm';multiply=multiply.map((v,i)=>v*([storm?.86:.95,storm?.91:.97,1][i]));lift=lift.map((v,i)=>v+[0,1,3][i]);}
  const mult=hex(multiply.map(v=>v*255)),add=hex(lift);return {key:mult+'/'+add,multiply:mult,lift:add,underground};
}
export function profileColor(color,profile){
  if(!profile||typeof color!=='string'||!/^#[\da-f]{6}([\da-f]{2})?$/i.test(color))return color;
  const key=profile.key+'/'+color;if(cache.has(key))return cache.get(key);
  const source=byte(color),mult=byte(profile.multiply),lift=byte(profile.lift),result=hex(source.map((v,i)=>v*mult[i]/255*(1-lift[i]/255)+lift[i]))+color.slice(7);
  if(cache.size>=LIMIT)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
}
export function profileCacheSize(){return cache.size;}
// Only Scene's color writes pass here. Native methods keep their original receiver.
export function profileContext(context,getProfile){
  const methods=new Map(),gradients=new WeakMap(),styles=new Set(['fillStyle','strokeStyle','shadowColor']);let raw=new Map();const stack=[];
  return new Proxy(context,{
    get(target,key){
      if(styles.has(key)&&raw.has(key))return raw.get(key);
      if(methods.has(key))return methods.get(key);
      const value=target[key];if(typeof value!=='function')return value;
      let method=value.bind(target);
      if(key==='save')method=()=>{stack.push(new Map(raw));target.save();};
      if(key==='restore')method=()=>{if(stack.length)raw=stack.pop();target.restore();};
      if(['createLinearGradient','createRadialGradient','createConicGradient'].includes(key))method=(...args)=>{
        const gradient=value.apply(target,args),proxy=new Proxy(gradient,{get(g,k){return k==='addColorStop'?(offset,color)=>g.addColorStop(offset,profileColor(color,getProfile())):typeof g[k]==='function'?g[k].bind(g):g[k];}});gradients.set(proxy,gradient);return proxy;
      };
      methods.set(key,method);return method;
    },
    set(target,key,value){if(styles.has(key)){raw.set(key,value);target[key]=gradients.get(value)||profileColor(value,getProfile());}else target[key]=value;return true;}
  });
}
export class SceneGrade{
  constructor(output){this.output=output;this.profile=null;this.colors=profileContext(output,()=>this.profile);this.buffer=null;this.bufferContext=null;this.unavailable=false;}
  begin(width,height,dpr,profile,mode='buffer'){
    this.profile=profile;
    if(!profile||mode==='legacy')return {context:this.output,mode:'legacy',finish(){}};
    if(mode!=='palette'&&!this.unavailable&&Math.round(width*dpr)*Math.round(height*dpr)<=MAX_GRADE_PIXELS){
      try{
        if(!this.buffer){
          this.buffer=typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):document.createElement('canvas');this.bufferContext=this.buffer.getContext('2d');if(!this.bufferContext)throw Error('No buffer context');
          this.output.save();this.output.globalCompositeOperation='multiply';let supported=this.output.globalCompositeOperation==='multiply';this.output.globalCompositeOperation='screen';supported&&=this.output.globalCompositeOperation==='screen';this.output.restore();if(!supported)throw Error('No blend support');
        }
        const w=Math.round(width*dpr),h=Math.round(height*dpr);if(this.buffer.width!==w||this.buffer.height!==h){this.buffer.width=w;this.buffer.height=h;}
        this.bufferContext.setTransform(dpr,0,0,dpr,0,0);
        return {context:this.bufferContext,mode:'buffer',finish:()=>{
          const c=this.output;c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';c.drawImage(this.buffer,0,0,width,height);
          c.globalCompositeOperation='multiply';c.fillStyle=profile.multiply;c.fillRect(0,0,width,height);
          c.globalCompositeOperation='screen';c.fillStyle=profile.lift;c.fillRect(0,0,width,height);c.restore();
        }};
      }catch{this.unavailable=true;this.buffer=null;this.bufferContext=null;}
    }
    return {context:this.colors,mode:'palette',finish(){}};
  }
  destroy(){if(this.buffer){this.buffer.width=1;this.buffer.height=1;}this.buffer=null;this.bufferContext=null;}
}
