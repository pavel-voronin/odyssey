import {npcController} from './npc-control.js';
import {refugeOn} from './refuge-state.js';
import {neighborState,occupiedBeds,observeVacantBeds} from './neighbor-housing-state.js';
import {physicalDistance} from '../geometry.js';
import {localContact,relatedPeople} from './npc-contacts.js';
import {structurallySound} from './building-condition.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {confirmWord} from './word-custom.js';
import {publishHousingNews} from './witness-news.js';
import {enabled} from '../rules.js';
const hostAt=(s,a)=>a.foundedSettlement.founders.map(id=>s.people[id]).find(p=>p?.alive&&p.role!=='ребёнок'&&!p.needs.sleeping&&p.health>0&&npcController(s,p)==='personal'&&localContact(s,p.id,a.id));
const ready=p=>p?.alive&&p.role!=='ребёнок'&&!p.needs.sleeping&&p.health>0;
export function neighborRestPlan(s,p){
 const stay=p.houseStay,a=s.areas[p.area],f=a?.foundedSettlement;if(!refugeOn(s)||!ready(p)||!stay||stay.until<=s.tick||stay.area!==a?.id||p.needs.energy>=85||!f||f.housing.id!==stay.house)return false;
 const r=a.neighborHousing?.requests[p.id];if(!r||r.id!==stay.receipt||!['help','lease'].includes(r.mode))return false;p.agenda.task={kind:'housingRest',target:a.id,x:f.housing.x,remaining:1};return true;
}
export function neighborHousingPlan(s,p){
 const a=s.areas[p.area],f=a?.foundedSettlement;if(!refugeOn(s)||!f||!ready(p)||f.founders.includes(p.id)||p.home===a.id||p.houseStay?.until>s.tick||p.housingAfter>s.tick||p.migration)return false;
 if(p.housingRequest?.mode==='waiting'&&a.neighborHousing?.pending[p.id]){p.agenda.task={kind:'housingWait',target:a.id,x:f.housing.x,remaining:1};return true;}
 if(p.agenda.task&&!['visit','rest','return','housingAsk'].includes(p.agenda.task.kind)||!(p.refugeGroup||p.lastMigration!==undefined||p.needs.energy<60||p.agenda.task?.kind==='visit'))return false;
 const host=hostAt(s,a);if(!host||physicalDistance(a,p.x,f.housing.x)>28)return false;
 p.agenda.task={kind:'housingAsk',target:a.id,x:host.x,remaining:1,person:host.id};return true;
}
function emit(s,a,r,ctx){publishHousingNews(s,a,r);if(s.hero.area===a.id&&!s.hero.transit)ctx.log(s,r.text,'talk');}
function finish(s,a,p,host,r,mode,reason,ctx){
 const m=neighborState(a);Object.assign(r,{mode,reason,tick:s.tick,until:['help','lease'].includes(mode)?s.tick+240:s.tick,paid:0});
 if(mode==='lease'){const before=marketWallet(s,p.id),hostBefore=marketWallet(s,host.id);setActorMoney(s,p,before-2);setActorMoney(s,host,hostBefore+2);r.paid=2;r.money={before,after:before-2,hostBefore,hostAfter:hostBefore+2};}
 if(['help','lease'].includes(mode))p.houseStay={area:a.id,house:a.foundedSettlement.housing.id,host:host.id,receipt:r.id,until:r.until};
 if(mode==='claim'&&!m.claims[p.id]){m.claims[p.id]={request:r.id,tick:s.tick};const ids=Object.keys(m.claims).sort((x,y)=>m.claims[x].tick-m.claims[y].tick);if(ids.length>32)delete m.claims[ids[0]];r.effects=[];for(const [from,to]of [[host,p],[p,host]]){const before=from.agenda.bonds[to.id]||0,after=enabled(s,'relationships')?Math.max(-100,before-1):before;from.agenda.bonds[to.id]=after;r.effects.push({from:from.id,to:to.id,before,after});}}
 r.text=mode==='help'?host.name+' предоставляет свободное место в общем доме на день без платы. Гость: '+p.name+'.':mode==='lease'?host.name+' и '+p.name+' договариваются о месте на день за ◈2.':mode==='claim'?p.name+' настаивает на занятом месте. '+host.name+' сохраняет места семьи; возник личный спор.':reason==='capacity'?host.name+': свободных мест нет; даже отсутствующий родственник сохраняет своё место.':reason==='word'?host.name+' не заключает договор без согласованного свидетельства.':reason==='poor'?p.name+' пока не может оплатить предложенное место.':'Общий дом пока недоступен.';
 p.housingRequest=r;p.housingAfter=r.until>s.tick?r.until:s.tick+240;if(['housingAsk','housingWait'].includes(p.agenda.task?.kind))p.agenda.task=null;p.agenda.due=s.tick+8;delete m.pending[p.id];m.requests[p.id]=structuredClone(r);
 const keys=Object.keys(m.requests).sort((x,y)=>m.requests[x].tick-m.requests[y].tick);while(keys.length>32){const id=keys.find(id=>m.requests[id].until<=s.tick);if(!id)break;delete m.requests[id];keys.splice(keys.indexOf(id),1);}emit(s,a,r,ctx);return true;
}
export function neighborHousingAction(s,p,ctx){
 const t=p.agenda.task;if(!['housingAsk','housingRest','housingWait'].includes(t?.kind))return false;if(!refugeOn(s))return true;
 const a=s.areas[p.area],f=a?.foundedSettlement;
 if(t.kind==='housingRest'){const stay=p.houseStay,rest=a?.objects.find(o=>o.id===stay?.house);if(stay?.until>s.tick&&stay.area===a.id&&f?.housing.id===stay.house&&physicalDistance(a,p.x,t.x)<=2&&rest&&!rest.closed&&structurallySound(a.facades?.profiles.find(b=>b.id===f.housing.building))){p.needs.energy=Math.min(100,p.needs.energy+8);stay.restedAt=s.tick;}p.agenda.task=null;p.agenda.due=s.tick+8;return true;}
 if(t.kind==='housingWait'){const r=p.housingRequest;if(r?.mode==='waiting'&&s.tick-r.started>=96){Object.assign(r,{mode:'withdrawn',reason:'expired',tick:s.tick,until:s.tick,text:p.name+' не дожидается ответа о ночлеге.'});if(a?.neighborHousing)delete a.neighborHousing.pending[p.id];p.housingAfter=s.tick+240;}p.agenda.task=null;p.agenda.due=s.tick+8;return true;}
 if(!f||p.houseStay?.until>s.tick||p.housingAfter>s.tick){p.agenda.task=null;return true;}
 const host=s.people[t.person],h=host&&localContact(s,host.id,p.area);if(!ready(p)||!ready(host)||!f.founders.includes(host.id)||!h||physicalDistance(a,p.x,h.x)>12){p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
 const m=neighborState(a);if(Object.keys(m.pending).length>=8&&!m.pending[p.id]){p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
 if(!m.pending[p.id]){const r={version:1,id:f.id+'/housing/'+(++m.serial),area:a.id,guest:p.id,host:host.id,started:s.tick,form:p.culture===host.culture?'direct':'formal',mode:'waiting',tick:s.tick,until:s.tick,paid:0};m.pending[p.id]=r;p.housingRequest=r;}
 p.agenda.task=null;p.agenda.due=s.tick+8;return true;
}
export function neighborHostTurn(s,host,ctx){
 if(!refugeOn(s)||!ready(host)||npcController(s,host)!=='personal')return false;const a=s.areas[host.area],f=a?.foundedSettlement,m=a?.neighborHousing;if(!f||!m||m.lastHostTick===s.tick)return false;
 const r=Object.values(m.pending).filter(r=>r.host===host.id).sort((a,b)=>a.started-b.started||a.id.localeCompare(b.id))[0];if(!r)return false;
 const p=s.people[r.guest],g=p&&localContact(s,p.id,a.id);if(!ready(p)||!g||physicalDistance(a,host.x,g.x)>12){if(s.tick-r.started>=96){delete m.pending[r.guest];if(p){Object.assign(r,{mode:'withdrawn',reason:'expired',tick:s.tick,until:s.tick,text:'Просьба о ночлеге осталась без личной встречи.'});p.housingRequest=r;p.housingAfter=s.tick+240;}}return false;}
 m.lastHostTick=s.tick;observeVacantBeds(s,a,host);
 const profile=a.facades?.profiles.find(b=>b.id===f.housing.building),rest=a.objects.find(o=>o.id===f.housing.id);if(!rest||rest.closed||!structurallySound(profile))return finish(s,a,p,host,r,'refused','closed',ctx);
 r.capacity=f.housing.capacity;r.occupied=occupiedBeds(s,a);if(r.occupied>=r.capacity){const claim=p.agenda.duty<.3&&p.needs.hunger>50;return finish(s,a,p,host,r,claim?'claim':'refused','capacity',ctx);}
 const kin=relatedPeople(p,host),friend=(host.agenda.bonds[p.id]||0)>0;r.basis=kin?'kin':friend?'familiar':'stranger';const mode=kin||friend?'help':'lease';
 if(mode==='lease'&&marketWallet(s,p.id)<2)return finish(s,a,p,host,r,'refused','poor',ctx);
 const word=confirmWord(s,host,{lineage:p.id,x:p.x},r);if(!word.allowed){if(word.mode==='refused')return finish(s,a,p,host,r,'refused','word',ctx);r.mode='waiting';r.tick=s.tick;r.until=s.tick;p.housingRequest=r;return true;}
 return finish(s,a,p,host,r,mode,'space',ctx);
}
