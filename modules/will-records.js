import {socketRoots} from './socket-items.js';import {authorityBody} from './authority-state.js';import {relatedPeople} from './npc-contacts.js';import {physicalDistance} from '../geometry.js';
export const willRecord=(s,id)=>Object.values(s.testaments?.byOwner||{}).flatMap(m=>Object.values(m.records)).find(r=>r.id===id)||null;
export const ownerWill=s=>s.testaments?.byOwner||{};
export const willOriginal=(s,id)=>socketRoots(s).find(i=>i.id===id)||null;
export const makeEstateLaw=(a,officer,at,origin)=>({version:1,id:a.id+'/estate-law/1',authority:a.id,officer,since:at,origin,rule:'witnessed-carried-item'});
export function knownWillRecipient(s,p,q){const b=authorityBody(s,p.id),other=q&&authorityBody(s,q.id),present=other?.area===b.area&&['resident','wandering'].includes(q.status)&&physicalDistance(s.areas[b.area],b.x,other.x)<=12,remembered=p.navigation?.contacts?.some(n=>n.person===q?.id)||Object.hasOwn(b.lineage?b.relations||{}:p.agenda.bonds||{},q?.id);return Boolean(q?.alive&&q.id!==p.id&&q.role!=='ребёнок'&&(present||remembered)&&(relatedPeople(p,q)||(b.lineage?b.relations?.[q.id]?.trust:p.agenda.bonds?.[q.id])>=20));}
export function willNear(s,p,q,range=3){const a=authorityBody(s,p.id),b=authorityBody(s,q.id);return a.area===b.area&&physicalDistance(s.areas[a.area],a.x,b.x)<=range;}
export function willHeldItem(s,p,id){const item=willOriginal(s,id),holder=item?.physical?.holder;return holder?.kind==='person'&&holder.id===p.id?item:null;}
export const plainWillAsset=i=>i&&['weapon','armor','charm'].includes(i.slot)&&!i.kind&&!i.textCopy&&!i.libraryLoan&&!i.libraryTheft&&!i.testament;
export function willAssetOwner(e,item){return e?.testament?.outcome==='effective'&&e.testament.item===item?(Object.hasOwn(e.testament,'currentHeir')?e.testament.currentHeir:e.testament.recipient):e?.heir??null;}
export function courtReceiver(s,c){const e=s.people[c.decedent]?.estate;return c.status==='unresolved'&&s.people[c.submitter]?.alive?c.submitter:willAssetOwner(e,c.item);}
export function willHold(s,item,actor=null){return Object.values(s.testamentCases?.byId||{}).some(c=>(c.item===item||c.document===item)&&c.custody==='court'&&!(actor&&c.item===item&&['recognized','refused','unresolved'].includes(c.status)&&courtReceiver(s,c)===actor));}
