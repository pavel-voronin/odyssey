import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {bodyRemains} from './remains.js';
import {remainsLocation} from '../remains-position.js';
export const neighborState=a=>(a.neighborHousing ||= {version:1,serial:0,lastHostTick:-1,released:{},requests:{},pending:{},claims:{}});
export function observeVacantBeds(s,a,host){
 const m=neighborState(a);for(const id of a.foundedSettlement.founders){const p=s.people[id];if(p?.alive||m.released[id])continue;
  const body=bodyRemains(s,p),b=body?remainsLocation(s,body):enabled(s,'remains')?null:{area:p?.area,x:p?.x};if(!b||b.transit||b.area!==a.id||physicalDistance(a,host.x,b.x)>12)continue;
  m.released[id]={person:id,witness:host.id,tick:s.tick,body:body?.id??null,x:b.x};
 }return m;
}
export function occupiedBeds(s,a){const f=a.foundedSettlement,m=a.neighborHousing,founders=f.founders.filter(id=>!m?.released[id]),guests=Object.values(m?.requests||{}).filter(r=>['help','lease'].includes(r.mode)&&r.until>s.tick&&!founders.includes(r.guest));return founders.length+guests.length;}
export function recordFoundationCooperation(s,a,r){
 const ids=[...new Set(r.steps.map(e=>e.actor))].filter(id=>{const p=s.people[id];return p?.alive&&!p.needs.sleeping&&p.area===a.id&&physicalDistance(a,p.x,a.refugeSite.x)<=12;});if(ids.length<2)return;
 const effects=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)for(const [from,to]of [[ids[i],ids[j]],[ids[j],ids[i]]]){const p=s.people[from],before=p.agenda.bonds[to]||0,after=enabled(s,'relationships')?Math.min(100,before+1):before;p.agenda.bonds[to]=after;effects.push({from,to,before,after});}
 neighborState(a).cooperation={source:r.id,tick:s.tick,participants:ids,effects};
}
