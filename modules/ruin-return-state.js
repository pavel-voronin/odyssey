import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {dwellingActor,dwellingHere,dwellingReady} from './dwelling-state.js';
export const ruinRecoveryOn=s=>['ruin-recovery','building-ruins','facades','goods-cycle','home-building'].every(k=>enabled(s,k));
export const repairRaw=profile=>2*(Math.max(0,2-(profile.structure?.roof??3))+Math.max(0,2-(profile.structure?.walls??3)));
export function ruinRight(s,p,a,building){
 const house=a.dwellingPlot?.house;if(house?.building===building&&house.owner===p.id)return {kind:'owner',room:house.room,title:house.title};
 const f=a.foundedSettlement;if(f?.housing.building===building&&f.founders.includes(p.id)&&!a.neighborHousing?.released[p.id])return {kind:'founder',room:null,title:f.foundation};
 return null;
}
export function observeOwnRuins(s,p){
 if(!ruinRecoveryOn(s)||!p?.alive)return;const h=dwellingActor(s,p),a=s.areas[h?.area||p.area];if(!a||a.interior||h?.transit||p.roadTransit)return;
 for(const profile of a.facades?.profiles||[]){const right=ruinRight(s,p,a,profile.id),o=a.objects.find(o=>o.building===profile.id&&['rest','door'].includes(o.kind));if(!right||!o||!dwellingHere(s,p,a,o.x,24))continue;
  const notes=p.ruinMemory ||= {},roof=profile.structure?.roof??3,walls=profile.structure?.walls??3;
  notes[profile.id]={version:1,area:a.id,building:profile.id,x:o.x,seen:s.tick,witness:p.id,right:right.kind,title:right.title,room:right.room,roof,walls,food:a.civic?.food||0,safe:!a.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(a,e.x,o.x)<28)};
  const keys=Object.keys(notes);if(keys.length>12){keys.sort((a,b)=>notes[a].seen-notes[b].seen);delete notes[keys[0]];}
 }
}
export {dwellingActor as ruinActor,dwellingHere as ruinHere,dwellingReady as ruinReady};
