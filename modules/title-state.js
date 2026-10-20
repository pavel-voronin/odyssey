import {physicalDistance} from '../geometry.js';
import {authorityAt,authorityBody} from './authority-state.js';
import {diplomaticReady,nearDiplomat,diplomaticSpeech} from './diplomacy-state.js';
export const titleOn=s=>['title-enforcement','property','property-contracts','territorial-authorities','politics','people','npc-control','finances'].every(k=>s.rules[k]!==false);
export const titleLaw=(a,officer,at,origin='charter')=>({version:1,id:a.id+'/contract-law/1',authority:a.id,officer,since:at,origin,rule:'performance-or-finite-restitution'});
export const titleRoom=(s,c)=>s.areas[c.area]?.objects.find(o=>o.id===c.property&&o.kind==='workshop');
export function titleReady(s,p,inTurn=false){const b=p&&authorityBody(s,p.id);return titleOn(s)&&diplomaticReady(s,p)&&(p.titleLastAt??-1)<s.tick&&(b===s.hero||!b.lineage&&inTurn&&p.actionControl?.tick===s.tick&&p.actionControl.owner==='personal'&&p.actionControl.phases.includes('act'));}
export function titleSpend(s,p){const b=authorityBody(s,p.id);if(b.lineage){b.energy=Math.max(0,b.energy-1);b.lastAction='talk';}else p.needs.energy--;p.titleLastAt=s.tick;}
export function titleContact(s,p,q){return diplomaticReady(s,p)&&diplomaticReady(s,q)&&nearDiplomat(s,p,q)&&diplomaticSpeech(s,p,q);}
export function titleProof(s,c){const o=titleRoom(s,c),r=c.completed;return Boolean(c.accepted&&c.credit===c.creditValue&&c.credit>0&&Number.isSafeInteger(c.acceptedAt)&&r?.actor===c.buyer&&r.payer===c.buyer&&r.damageAt===c.damageAt&&o?.history.some(e=>e.kind==='repair'&&e.tick===r.tick&&e.actor===c.buyer&&e.payer===c.buyer&&e.damageAt===c.damageAt));}
export function titleMemo(s,p,q){(p.titleKnown ||= {})[q.id]={id:q.id,contract:q.contract,property:q.property,area:q.area,officer:q.officer,at:s.tick,status:q.status,reason:q.reason,outcome:q.decision?.outcome||null,owner:q.decision?.to||null,amount:q.decision?.amount||0};}
export function titleOffice(s,p,q){const a=s.authorities?.byId[q.authority],head=s.people[q.officer],b=authorityBody(s,p.id),o=titleRoom(s,q);return Boolean(a?.ruler===q.officer&&a.titleLaw?.id===q.law?.id&&head&&o&&b.area===q.area&&nearDiplomat(s,p,head)&&physicalDistance(s.areas[q.area],b.x,o.x)<=3&&authorityAt(s,q.area)?.id===a.id);}

export function titleRevision(s,g){const p=s.people[s.hero.lineage],q=s.titleCases?.byId[g.case],local=q&&authorityBody(s,p.id).area===q.area&&p.titleKnown?.[q.id];return [s.rules['title-enforcement'],p.titleKnown,local&&[q.law?.id,q.status,q.ack?.at,q.officer===p.id&&s.tick>=q.until,[q.buyer,q.seller,q.officer].map(id=>{const x=s.people[id];return titleContact(s,p,x)?[id,authorityBody(s,id).x]:null;})]];}
