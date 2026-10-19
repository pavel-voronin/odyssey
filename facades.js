import {houseProfile,scenery} from './scenery.js';
export function facadeLayout(profile){
  const width=Math.max(24,profile.width||60),half=width/2,floors=Math.max(1,Math.floor(profile.floors||1)),porch=Boolean(profile.porch&&width>=30),reserve=porch?12:8;
  const doorX=Math.max(-half+reserve+3,Math.min(half-reserve-3,(profile.door||0)*half*.55)),windows=[];
  const wanted=Math.max(0,Math.min(3,Math.floor(profile.windows??2))),gap=3;
  for(let floor=0;floor<floors;floor++){
    const intervals=floor?[[-half+3,half-3]]:[[-half+3,doorX-reserve-gap],[doorX+reserve+gap,half-3]];
    const zones=intervals.filter(([l,r])=>r>l).map(([l,r])=>{const shutters=Boolean(profile.shutters&&r-l>=20),outer=shutters?10:7;return {l,r,shutters,outer,capacity:Math.max(0,Math.floor((r-l+gap)/(outer*2+gap))),count:0};});
    for(let i=0;i<wanted;i++){const zone=zones.filter(z=>z.count<z.capacity).sort((a,b)=>(b.r-b.l)/(b.count+1)-(a.r-a.l)/(a.count+1)||a.l-b.l)[0];if(!zone)break;zone.count++;}
    for(const zone of zones)for(let i=0;i<zone.count;i++){
      const x=zone.count===1?(zone.l+zone.r)/2:zone.l+zone.outer+i*(zone.r-zone.l-zone.outer*2)/(zone.count-1),y=-floor*44-36;
      windows.push({x,y,floor,shutters:zone.shutters,bounds:{left:x-zone.outer,right:x+zone.outer,top:y-2,bottom:y+14}});
    }
  }
  return {version:1,width,floors,door:{x:doorX,left:doorX-reserve,right:doorX+reserve,top:porch?-34:-31,bottom:0},porch,windows};
}
function count(a){if(a.foundedSettlement)return 1;return a.district==='Жилой посад'?5:a.district==='Мастерские'?3:a.district?2:a.type==='village'?3:['port','undercity'].includes(a.type)?2:0;}
export function initializeAreaFacades(s,a){
  const amount=count(a);if(!amount)return;
  a.facades ||= {version:1,profiles:[]};
  if(a.facades.profiles.length<amount){const view=scenery(s.seed,a);for(let index=a.facades.profiles.length;index<amount;index++){const profile=houseProfile(s.seed,a,index,view);a.facades.profiles.push({...profile,id:`${a.id}-building-${index}`,facade:facadeLayout(profile)});}}
  if(a.district==='Мастерские'){const o=a.objects.find(o=>o.kind==='workshop');if(o)o.building ??=a.facades.profiles[1].id;}
}
export function initializeFacades(s){
  if(s.facadeAreaCount===s.nextArea)return;
  for(const a of Object.values(s.areas)){if(['village','port','undercity'].includes(a.type)&&!a.city&&s.rules.districts!==false)continue;initializeAreaFacades(s,a);}
  s.facadeAreaCount=s.nextArea;
}
