import {LOCAL_FOODS} from './food-stores.js';
import {foodSourceState} from './food-source-state.js';
import {enabled} from '../rules.js';
import {adultPerson,personAgeAt} from './age-state.js';
import {carriedFood} from './stores.js';
import {rememberPracticalRole} from './skill-branches.js';
import {observeNPCPlace} from './npc-knowledge.js';
import {revealArea,revealRoad} from '../actor-atlas.js';

const building=new WeakSet();
export const beginDomesticConstruction=s=>building.add(s);
export function endDomesticConstruction(s){building.delete(s);for(const p of Object.values(s.people))initializeDomestic(s,p);}
export const domesticOn=s=>enabled(s,'identity')&&enabled(s,'supply');
export const domesticBody=(s,p)=>{const h=s.hero?.lineage===p?.id?s.hero:s.actorStates?.[p?.id];return h&&h.actorMode!=='npc'?h:p;};
export const domesticStock=(s,p)=>carriedFood(p,domesticBody(s,p)?.inventory||p.actorLink?.inventory);
export function domesticWays(s,p,h=null){
 const b=h||domesticBody(s,p),a=s.areas[b?.area],ways=[];if(!a)return ways;
 const stock=carriedFood(p,b.inventory||p.actorLink?.inventory);if(stock>=4)ways.push({kind:'carried',area:a.id,units:stock});
 const root=s.areas[a.city]||a,near=[...new Set([a,root,...[...(a.links||[]),...(root.links||[])].map(id=>s.areas[id]).filter(x=>x&&!x.interior&&x.realm===a.realm&&x.era===a.era)])];
 const source=near.find(x=>x.forage?.localFood&&p.localFood?.methods[x.forage.localFood.kind]&&p.localFood.tools[x.forage.localFood.kind==='fish'?'line':'knife']?.owner===p.id&&p.localFood.tools[x.forage.localFood.kind==='fish'?'line':'knife'].state==='working'&&x.forage.stock>0);
 if(source&&foodSourceState(s,source)?.available)ways.push({kind:'forage',area:source.id,source:source.forage.localFood.id,food:source.forage.localFood.kind});
 const town=near.find(x=>x.civic?.food>=4&&!x.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved));
 if(town){if(town.civic.treasury>=4)ways.push({kind:'work-buy',area:town.id,job:'market',units:4});ways.push({kind:'local-relief',area:town.id,units:Math.min(4,town.civic.food)});}
 return ways;
}
// Constructors only; no money, tools or food are issued by this profile.
export function initializeDomestic(s,p,h=null,{kind='birth'}={}){
 if(!h&&(building.has(s)||!s.society||!s.logistics))return null;
 if(!domesticOn(s)||!p?.alive||p.domestic||!s.areas[(h||p).area]||p.role==='герой'&&!h)return null;
 const b=h||p,adult=adultPerson(s,p),ways=adult?domesticWays(s,p,h):[],parents=(p.parents||[]).filter(id=>s.people[id]?.alive&&s.people[id].area===b.area),mode=adult&&ways.length>=2?'independent':parents.length?'dependent':'distress';
 const q=p.domestic={version:1,origin:{kind,at:s.tick,area:b.area,role:h?.profession||p.agenda.job,age:personAgeAt(p,s.tick)},mode,ways,sources:{},contacts:parents,care:{guardian:adult?null:parents[0]||null,requests:[],lessons:{},receipts:[],given:[],lastAt:-1,serial:0},risk:null};
 if(adult){const a=s.areas[b.area],root=s.areas[a.city]||a,local=[a,root,...(root.links||[]).map(id=>s.areas[id])].find(x=>x?.forage?.localFood&&p.localFood?.methods[x.forage.localFood.kind]);if(local){const node=local.forage.localFood;q.sources[node.id]={area:local.id,kind:node.kind,method:p.localFood.methods[node.kind].id,at:s.tick,origin:'local-origin'};}}
 if(adult)rememberPracticalRole(s,p,h);
 if(h?.atlas){const root=s.areas[s.areas[b.area]?.city]||s.areas[b.area];revealArea(s,b.area);if(root.id!==b.area){revealArea(s,root.id);revealRoad(s,b.area,root.id);}for(const way of ways)if(way.area!==b.area){const from=s.areas[b.area].links.includes(way.area)?b.area:root.links.includes(way.area)?root.id:null;if(from){revealArea(s,way.area);revealRoad(s,from,way.area);}}}
 else observeNPCPlace(s,p);
 return q;
}
export function localMethodAllowed(s,p,a,kind){const q=p.domestic;if(!q||!a)return true;if(q.origin.kind==='actual-contact'&&Number.isSafeInteger(p.localFood?.methods[kind]?.recordedAt)&&p.localFood.methods[kind].recordedAt<=q.origin.at)return true;const id=a.forage?.localFood?.id;return Boolean(q.sources[id]?.kind===kind);}
export function validateDomestic(s,fail){const time=(n,min=0)=>Number.isSafeInteger(n)&&n>=min&&n<=s.tick;for(const p of Object.values(s.people)){const q=p.domestic;if(!q)continue;if(q.version!==1||!['birth','actual-contact'].includes(q.origin?.kind)||!time(q.origin.at)||!s.areas[q.origin.area]||typeof q.origin.role!=='string'||!['independent','dependent','distress'].includes(q.mode)||!Array.isArray(q.ways)||q.ways.length>4||!q.sources||!Array.isArray(q.contacts)||q.contacts.some(id=>!s.people[id])||!q.care||!time(q.care.lastAt,-1)||!Number.isSafeInteger(q.care.serial)||q.care.serial<0||!Array.isArray(q.care.receipts)||q.care.receipts.length>16||!Array.isArray(q.care.requests)||q.care.requests.length>8||q.care.guardian!==null&&!s.people[q.care.guardian])fail(p.id+'.domestic');for(const w of q.ways)if(!['carried','forage','work-buy','local-relief'].includes(w.kind)||!s.areas[w.area])fail(p.id+'.domestic-way');for(const [id,v]of Object.entries(q.sources))if(!s.areas[v.area]||s.areas[v.area].forage?.localFood?.id!==id||!['fish','mushroom'].includes(v.kind)||v.method!==LOCAL_FOODS[v.kind]?.method||!time(v.at)||!['local-origin','lesson'].includes(v.origin)||v.origin==='local-origin'&&v.at!==q.origin.at||v.origin==='lesson'&&(q.care.lessons[id]?.completed!==v.at||!q.care.lessons[id]?.teachers.includes(v.teacher)))fail(p.id+'.local-method');for(const r of q.care.receipts)if(!time(r.at)||!s.people[r.adult]||!s.people[r.child]||r.child!==p.id||!['food','lesson','refusal','maturity'].includes(r.kind)||r.kind==='food'&&(r.units!==1||!s.people[r.owner]||r.before-r.after!==1)||r.kind==='lesson'&&(!s.areas[r.area]||!['fish','mushroom'].includes(r.food)))fail(p.id+'.care-receipt');for(const r of q.care.requests)if(!s.people[r.person]||!time(r.at)||r.retryAt!==r.at+16||typeof r.reason!=='string')fail(p.id+'.care-request');}}

export function validateDomesticActions(s,fail){const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;for(const p of Object.values(s.people)){const q=p.domestic;if(!q)continue;if(q.care.waitingAt!==undefined&&(!time(q.care.waitingAt)||!s.people[q.care.waitingFor]))fail(p.id+'.lesson-wait');if(!Array.isArray(q.care.given)||q.care.given.length>16||q.care.given.some(r=>!time(r.at)||r.adult!==p.id||!s.people[r.child]||!['food','lesson'].includes(r.kind)))fail(p.id+'.care-given');if(q.matured!==undefined&&!time(q.matured)||q.care.receipts.length!==Math.min(16,q.care.serial))fail(p.id+'.domestic-history');for(const r of q.care.receipts)if(r.purchase&&(!s.areas[r.purchase.area]?.civic||r.purchase.stockBefore-r.purchase.stockAfter!==1||r.purchase.walletBefore-r.purchase.walletAfter!==r.purchase.cost||r.purchase.cost<1))fail(p.id+'.care-purchase');for(const r of q.care.receipts)if(r.kind==='lesson'&&(![0,1].includes(r.paid)||!Number.isFinite(r.pupilBefore)||!Number.isFinite(r.pupilAfter)||r.pupilAfter<0||r.pupilBefore-r.pupilAfter!==r.paid||r.teacherAfter-r.teacherBefore!==r.paid))fail(p.id+'.lesson-money');for(const [id,l]of Object.entries(q.care.lessons)){if(!s.areas[l.area]||s.areas[l.area].forage?.localFood?.id!==id||!s.people[l.teacher]||!time(l.started)||!Array.isArray(l.steps)||l.steps.length>2||!Array.isArray(l.teachers)||l.teachers.length!==l.steps.length||l.teachers.some(id=>!s.people[id])||l.steps.some((t,i)=>!time(t)||t<l.started||i&&t<=l.steps[i-1])||l.completed!==undefined&&(l.completed!==l.steps[1]||q.sources[id]?.at!==l.completed))fail(p.id+'.domestic-lesson');}const r=q.risk;if(r&&(!s.areas[r.area]||s.areas[r.area].forage?.localFood?.id!==r.source||!time(r.started)||!Array.isArray(r.steps)||r.steps.length<1||r.steps.length>3||r.steps.some((t,i)=>!time(t)||t<r.started||i&&t<=r.steps[i-1])||!['working','food','poison','nothing','empty'].includes(r.status)||r.status==='working'&&r.steps.length>=3||r.status!=='working'&&(!time(r.ended??r.steps.at(-1))||r.retryAt!==(r.ended??r.steps.at(-1))+24||r.status!=='empty'&&r.removed!==1)))fail(p.id+'.domestic-risk');}}
