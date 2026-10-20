import {diplomaticSpeech} from './diplomacy-state.js';
import {authorityBody,authorityAt} from './authority-state.js';import {physicalDistance} from '../geometry.js';import {npcController} from './npc-control.js';import {itemWorking} from './item-condition.js';
export const serviceMasksOn=s=>['service-masks','stealth','equipment','item-originals','people','npc-control','territorial-authorities','politics'].every(k=>s.rules[k]!==false);
export const maskBody=(s,id)=>authorityBody(s,id);
export const maskItems=(s,id)=>{const b=maskBody(s,id);return b?.lineage?[...b.bag,...Object.values(b.equipment).filter(Boolean)]:s.people[id]?.looseItems||[];};
export const heldServiceSign=(s,id,item=null)=>maskItems(s,id).find(i=>i.serviceSign?.version===1&&i.serviceSign.state==='ready'&&(!item||i.id===item)&&itemWorking(i))||null;
export function maskReady(s,p){const b=p&&maskBody(s,p.id);return Boolean(serviceMasksOn(s)&&p?.alive&&p.role!=='ребёнок'&&b&&!b.transit&&!b.combat&&!p.roadTransit&&!p.liftTransit&&!p.fordCrossing&&!p.needs.sleeping&&!p.ailment&&(b.lineage?b.hp>0:p.health>0)&&(b.lineage?b.energy:p.needs.energy)>=20&&(b.lineage?b.hunger:p.needs.hunger)<60&&(b.lineage||npcController(s,p)==='personal'));}
export function maskContact(s,p,q){const a=p&&maskBody(s,p.id),b=q&&maskBody(s,q.id);return maskReady(s,p)&&maskReady(s,q)&&a.area===b.area&&diplomaticSpeech(s,p,q)&&physicalDistance(s.areas[a.area],a.x,b.x)<=4;}
export function actualServiceProof(s,id,state){const p=s.people[id],d=p?.borderDuty,b=s.authorities?.border;return d?.active&&d.issuer===state&&s.tick<d.until&&b?.guard===id&&d.edge===b.edge?{kind:'paid-duty',person:id,issuer:d.issuer,edge:d.edge,since:d.since,until:d.until}:null;}
export function acceptedServiceRole(s,g,id){const r=g?.roleMemory?.[id],b=maskBody(s,id);return serviceMasksOn(s)&&['accepted','verified'].includes(r?.status)&&s.tick<=r.until&&b?.area===g.area&&Boolean(heldServiceSign(s,id,r.item));}
export function maskRevision(s,g){if(!g.kind.startsWith('mask'))return null;const p=s.people[s.hero.lineage];return [s.rules['service-masks'],p.signCraft,p.roleClaims?.map(id=>s.rolePresentations?.byId[id])];}
