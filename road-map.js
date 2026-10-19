import {roadMapModel,knownMapLayers,mapScopeProposal,MAP_SCOPES,SCOPE_NAMES,MAP_BODY_NAMES} from './map-view-model.js';
export {roadMapModel,knownMapLayers,SCOPE_NAMES} from './map-view-model.js';

export class RoadMapRenderer{
 constructor({createCanvas=()=>document.createElement('canvas')}={}){this.createCanvas=createCanvas;this.scale=1;this.offset={x:0,y:0};this.model=null;this.cacheKey=null;this.background=null;this.builds=0;this.scope='auto';this.layer='current';this.inspect=false;this.views=new Map();this.autoScope=null;}
 setView({scope=this.scope,layer=this.layer,inspect=this.inspect}={}){this.scope=scope==='auto'||MAP_SCOPES.includes(scope)?scope:'auto';this.layer=layer;this.inspect=Boolean(inspect);}
 saveView(){if(this.viewKey&&this.focus)this.views.set(this.viewKey,{knownLayer:this.model?.layer,focus:{...this.focus},offset:{...this.offset},scale:this.scale,baseScale:this.baseScale,following:this.following,fitted:this.fitted});}
 update(s){
  const actor=s.seed+'/'+s.hero.lineage;if(this.world!==s||this.actor!==actor){if(this.world){this.layer='current';this.inspect=false;}this.world=s;this.actor=actor;this.views.clear();this.viewKey=null;this.autoScope=null;this.candidate=null;}
  const proposal=mapScopeProposal(s);if(!this.autoScope){this.autoScope=proposal;this.candidate=null;}else if(proposal===this.autoScope)this.candidate=null;else if(this.candidate!==proposal){this.candidate=proposal;this.candidateTick=s.tick;}else if(s.tick>this.candidateTick){this.autoScope=proposal;this.candidate=null;}
  const scope=this.scope==='auto'?this.layer==='current'?this.autoScope:'region':this.scope,next=roadMapModel(s,{inspect:this.inspect,scope,layer:this.layer});
  const key=next&&next.layer+'/'+next.scope;if(key!==this.viewKey){this.saveView();this.viewKey=key;const saved=key&&this.views.get(key);if(saved)Object.assign(this,{...saved,focus:{...saved.focus},offset:{...saved.offset}});else{this.offset={x:0,y:0};this.scale={overview:1,region:1,local:2}[scope]||1;this.baseScale=this.scale;this.focus=next?{...(next.marker||next.nodes[0].point)}:null;this.following=Boolean(next?.marker);this.fitted=scope!=='overview';}}
  this.model=next;const allowed=new Set((next?.layers||knownMapLayers(s)).map(l=>l.id));for(const [key,view]of this.views)if(!allowed.has(view.knownLayer))this.views.delete(key);return next;
 }
 pan(dx,dy){if(!this.model)return;this.offset.x-=dx/this.scale;this.offset.y-=dy/this.scale;this.following=false;}
 zoom(factor){if(!this.model)return;this.scale=Math.max(this.baseScale*.25,Math.min(this.baseScale*4,this.scale*factor));this.fitted=true;}
 follow(){if(this.layer!=='current'){this.layer='current';this.update(this.world);}this.offset={x:0,y:0};if(this.model){this.focus={...(this.model.marker||this.model.nodes[0].point)};this.following=Boolean(this.model.marker);}}

 project(p,width,height){return {x:width/2+(p.x-this.focus.x-this.offset.x)*this.scale,y:42+Math.max(0,height-78)/2+(p.y-this.focus.y-this.offset.y)*this.scale};}
 draw(c,width,height,dpr=1){
  const m=this.model;if(!m)return null;
  if(!this.fitted){let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(const n of m.nodes){left=Math.min(left,n.point.x);right=Math.max(right,n.point.x);top=Math.min(top,n.point.y);bottom=Math.max(bottom,n.point.y);}const fit=Math.min(1,(width-40)/Math.max(40,right-left),(height-90)/Math.max(40,bottom-top));this.scale=this.baseScale=Math.max(Number.EPSILON,fit);this.focus={x:(left+right)/2,y:(top+bottom)/2};this.fitted=true;}
  if(this.following&&m.marker){const at=this.project(m.marker,width,height);if(Math.abs(at.x-width/2)>width*.3||at.y<52||at.y>height-40){this.focus={x:m.marker.x,y:m.marker.y};this.offset={x:0,y:0};}}
  const cacheKey=JSON.stringify([m.topology,width,height,dpr,this.scale,this.focus,this.offset]);
  if(this.cacheKey!==cacheKey){this.background ||= this.createCanvas();this.background.width=Math.round(width*dpr);this.background.height=Math.round(height*dpr);const b=this.background.getContext('2d');b.setTransform(dpr,0,0,dpr,0,0);this.paintBase(b,width,height);this.cacheKey=cacheKey;this.builds++;}
  c.setTransform(dpr,0,0,dpr,0,0);c.drawImage(this.background,0,0,width,height);const p=m.marker&&this.project(m.marker,width,height);this.marker=p;
  if(!p){c.fillStyle='#d3c6a0';c.font='10px system-ui';c.textAlign='center';c.fillText(this.fit(c,MAP_BODY_NAMES[m.body]||'',width-24),width/2,height-10);return null;}
  c.save();c.beginPath();c.rect(0,38,width,Math.max(0,height-65));c.clip();c.strokeStyle='#172526';c.lineWidth=4;c.fillStyle='#f1cd7f';c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#f1e7cc';c.font='600 11px system-ui';c.textAlign='center';const label=this.fit(c,m.marker.name,Math.min(140,width-24)),half=c.measureText(label).width/2+6;if(p.x>=0&&p.x<=width)c.fillText(label,Math.max(half,Math.min(width-half,p.x)),p.y-12);c.restore();
  return p;
 }
 fit(c,text,max){let s=String(text||'');if(c.measureText(s).width<=max)return s;while(s.length&&c.measureText(s+'…').width>max)s=s.slice(0,-1);return s+'…';}
 paintBase(c,width,height){
  c.fillStyle='#1a282b';c.fillRect(0,0,width,height);c.strokeStyle='#294044';c.lineWidth=.5;
  const raw=48*this.scale,spacing=raw*Math.pow(2,Math.max(0,Math.ceil(Math.log2(24/raw))));for(let x=((width/2-(this.focus.x+this.offset.x)*this.scale)%spacing+spacing)%spacing;x<width;x+=spacing){c.beginPath();c.moveTo(x,38);c.lineTo(x,height-27);c.stroke();}
  for(let y=48;y<height-27;y+=Math.max(24,spacing)){c.beginPath();c.moveTo(0,y);c.lineTo(width,y);c.stroke();}
  c.save();c.beginPath();c.rect(0,38,width,Math.max(0,height-65));c.clip();
  for(const road of this.model.roads){const [a,b]=road.ends.map(p=>this.project(p,width,height));c.strokeStyle=road.kind==='sea'?'#79b3c5':road.kind==='portal'||road.kind==='time'?'#bf9ed4':'#879782';c.globalAlpha=road.priority<=({overview:0,region:1,local:2}[this.model.scope])?1:.22;c.lineWidth=road.priority===0?2:1;c.setLineDash(road.kind==='road'?[]:[3,4]);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}c.globalAlpha=1;c.setLineDash([]);
  const labels=[],label=(text,x,ys)=>{const w=c.measureText(text).width;x=Math.max(w/2+5,Math.min(width-w/2-5,x));for(const y of ys){const box={x:x-w/2-3,y:y-10,w:w+6,h:14};if(box.y<40||box.y+box.h>height-43||labels.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;c.fillText(text,x,y);labels.push(box);return;}};
  if(this.model.marker){const p=this.project(this.model.marker,width,height),w=c.measureText(this.model.marker.name).width;labels.push({x:p.x-w/2-6,y:p.y-24,w:w+12,h:17});}
  for(const link of this.model.connectors){const p=this.project(link.point,width,height);if(p.x<0||p.x>width||p.y<40||p.y>height-43)continue;c.strokeStyle='#baa2d0';c.lineWidth=1;c.setLineDash([2,2]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+10,p.y-18);c.stroke();c.setLineDash([]);c.fillStyle='#d2b5e3';c.font='10px system-ui';c.textAlign='center';label(this.fit(c,'↗ '+link.name,Math.min(130,width-24)),p.x+35,[p.y-21,p.y-35,p.y+30]);}
  for(const node of [...this.model.nodes].sort((a,b)=>(a.id===this.model.area?-1:a.priority)-(b.id===this.model.area?-1:b.priority))){const p=this.project(node.point,width,height);if(p.x<-120||p.x>width+120||p.y<22||p.y>height-18)continue;c.strokeStyle='#728272';c.lineWidth=2;c.beginPath();const [start,end]=node.segment.map(at=>this.project(at,width,height));c.moveTo(start.x,start.y);c.lineTo(end.x,end.y);c.stroke();c.globalAlpha=node.labelVisible?1:.3;c.fillStyle='#d8d2b5';if(node.camp){c.fillStyle='#c3aa80';c.lineWidth=2;c.beginPath();c.moveTo(p.x-5,p.y+3);c.lineTo(p.x+5,p.y+3);c.moveTo(p.x-3,p.y);c.lineTo(p.x+3,p.y+6);c.moveTo(p.x,p.y);c.lineTo(p.x,p.y-7);c.stroke();c.beginPath();c.arc(p.x,p.y-8,2.5,0,Math.PI*2);c.fill();}else if(['village','port','citadel','undercity'].includes(node.type)){c.fillRect(p.x-4,p.y-6,8,8);c.beginPath();c.moveTo(p.x-6,p.y-6);c.lineTo(p.x,p.y-11);c.lineTo(p.x+6,p.y-6);c.fill();}else{c.beginPath();c.arc(p.x,p.y,2.5,0,Math.PI*2);c.fill();}c.font='10px system-ui';c.textAlign='center';c.fillStyle='#ced4c6';if(node.labelVisible){const text=this.fit(c,node.name,Math.min(125,width-24));label(text,p.x,[p.y+17,p.y-14,p.y+30,p.y-27]);}c.globalAlpha=1;}
  c.restore();c.fillStyle='#b1bdb1';c.font='9px system-ui';c.textAlign='left';c.fillText(this.fit(c,SCOPE_NAMES[this.model.scope]+' · '+this.model.layerName,width-20),10,height-29);
 }
}
