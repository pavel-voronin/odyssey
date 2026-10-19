import {areaStep,physicalDistance} from '../geometry.js';
import {rootWorld} from '../world-ref.js';
import {profile} from './common.js';
import {collectionItems} from './collection-state.js';
import {isRopeItem,ropeKnots,ropeBusy,navigationToolsOn} from './navigation-tool-state.js';
import {itemLocation} from './item-originals.js';
import {knowsPracticalMethod,recordPracticalSailing} from './skill-branches.js';
import {selfDrivenActor} from '../actor-projection.js';
const on=s=>s.rules?.['skill-branches']!==false&&s.rules?.identity!==false&&s.rules?.ferry!==false&&s.rules?.travel!==false;
const actor=(s,id)=>s.hero?.lineage===id?s.hero:s.actorStates?.[id];
const body=(s,id)=>{const h=actor(s,id);return h&&selfDrivenActor(s,h)?h:s.people[id];};
const energy=b=>b.lineage?b:b.needs;
const hold=s=>s.areas[s.ferry.deck].objects.find(o=>o.id===s.ferry.cargo?.id);
export function loadFerryCargo(input,amount,source){
 const s=rootWorld(input),f=s.ferry;if(!f||!(amount>0)||!on(s)&&!f.cargo)return;
 let c=f.cargo;if(!c){if(f.food!==amount)return;c=f.cargo={version:1,id:f.id+'/provisions',owner:f.owner,created:s.tick,loaded:0,consumed:0,lost:0,batch:0,secure:null,loads:[],operations:[],storms:[]};s.areas[f.deck].objects.push({id:c.id,kind:'ferryCargo',name:'Судовая провизия',x:42,owner:f.owner,items:[]});}
 for(const e of c.operations)if(e.status==='secured'){e.status='opened';e.openedAt=s.tick;}
 c.loaded+=amount;c.batch++;c.secure=null;c.loads.push({at:s.tick,amount,source});if(c.loads.length>8)c.loads.shift();
}
export function consumeFerryFood(s){if(s.ferry.cargo)s.ferry.cargo.consumed++;}
function rope(s,id){const own=collectionItems(s,id).find(i=>isRopeItem(i)&&!i.rope.attached&&!ropeBusy(s,i.id,id));if(own)return {item:own,personal:true};const item=hold(s)?.items.find(i=>isRopeItem(i)&&!i.rope.attached);return item?{item,personal:false}:null;}
function basic(s,id){const h=actor(s,id);return id===s.ferry.captain||ropeKnots(s,id)||h&&selfDrivenActor(s,h)&&profile(h).skill==='sea';}
export function cargoWorkReady(s,id){const f=s.ferry,b=body(s,id),c=f?.cargo;return Boolean(on(s)&&navigationToolsOn(s)&&c&&f.food>0&&!c.secure&&f.phase==='docked'&&s.tick<f.departure&&s.people[f.owner]?.alive&&s.people[f.captain]?.alive&&s.people[f.captain].area===f.deck&&!s.people[f.captain].needs?.sleeping&&s.people[id]?.alive&&s.people[id].sailingCargoTick!==s.tick&&b&&[f.port,f.deck].includes(b.area)&&!b.combat&&!s.people[id].needs?.sleeping&&(energy(b)?.energy||0)>=12&&basic(s,id)&&rope(s,id));}
export function secureFerryCargo(s,id,{boarding=false}={}){
 if(!cargoWorkReady(s,id))return false;const f=s.ferry,c=f.cargo,b=body(s,id),material=rope(s,id),o=hold(s);if(!o||boarding&&(b.area!==f.port||physicalDistance(s.areas[f.port],b.x,50)>3)||!boarding&&(b.area!==f.deck||id!==f.captain&&!f.passengers[id]||physicalDistance(s.areas[f.deck],b.x,o.x)>3))return false;
 if(material.personal){const h=actor(s,id),p=s.people[id];for(const list of [h?.bag,p.looseItems,p.legacy?.keepsakes].filter(Boolean)){const at=list.indexOf(material.item);if(at>=0)list.splice(at,1);}o.items.push(material.item);itemLocation(s,material.item,{kind:'cache',area:f.deck,object:o.id});material.item.history.push({tick:s.tick,text:'Передано команде для крепления судовой провизии.'});}
 const event={id:c.id+'/load/'+c.batch+'/secure',ship:f.id,area:f.deck,actor:id,tick:s.tick,securedAt:s.tick,voyage:f.voyage+1,batch:c.batch,rope:material.item.id,confirmedBy:f.captain,status:'secured'};
 c.secure={actor:id,rope:material.item.id,at:s.tick,batch:c.batch,checked:knowsPracticalMethod(s,id,'sailing')};if(c.secure.checked){c.secure.inspector=id;c.secure.inspectedAt=s.tick;}c.operations.push(event);if(c.operations.length>8)c.operations.shift();
 material.item.rope.uses.push({tick:s.tick,kind:'cargo',area:f.deck,actor:id,cargo:c.id});if(material.item.rope.uses.length>8)material.item.rope.uses.shift();energy(b).energy-=4;s.people[id].sailingCargoTick=s.tick;if(b.lineage)b.lastAction='work';return true;
}
export function confirmCargoDeparture(s){const f=s.ferry;for(const e of f.cargo?.operations||[]){if(e.status!=='secured'||e.voyage!==f.voyage)continue;e.status='departed';e.tick=s.tick;recordPracticalSailing(s,e);}}
export function ferryCargoStorm(s){const f=s.ferry,c=f.cargo;if(!c)return;const secured=c.secure&&hold(s)?.items.some(i=>i.id===c.secure.rope),loss=Math.min(f.food,secured?(c.secure.checked?0:1):2);f.food-=loss;c.lost+=loss;c.storms.push({at:s.tick,voyage:f.voyage,lost:loss,secured:Boolean(secured),checked:Boolean(secured&&c.secure.checked)});if(c.storms.length>8)c.storms.shift();}
function wantsLesson(s,id){const f=s.ferry,b=body(s,id);return on(s)&&s.people[id]?.alive&&!s.people[id].needs?.sleeping&&b&&!b.combat&&(s.people[f.captain].agenda?.sociability??0)>=.3&&(b.lineage?profile(b).skill==='sea'||b.personality.curiosity>=.65:(s.people[id].agenda?.curiosity??0)>=.65)&&(b.lineage?b.hp/b.maxHp:s.people[id].health/(s.people[id].maxHealth||100))>=.65&&!knowsPracticalMethod(s,id,'sailing')&&knowsPracticalMethod(s,f.captain,'sailing')&&f.cargo?.secure&&!f.cargo.secure.checked&&f.food>0&&(energy(b)?.energy||0)>=25&&(b.lineage?b.hunger:b.needs.hunger)<60;}
export function requestCargoLesson(s,id){const t=s.ferry.passengers[id];if(t&&wantsLesson(s,id))t.cargoLesson={status:'asked',asked:s.tick,teacher:s.ferry.captain};}
export function captainCargoTurn(s){
 const f=s.ferry,p=s.people[f.captain];if(!on(s)||f.phase!=='docked'||s.tick>=f.departure||!p?.alive||p.area!==f.deck||!s.people[f.owner]?.alive||p.needs.sleeping||p.needs.hunger>60||p.health<(p.maxHealth||100)*.65||p.sailingCargoTick===s.tick)return false;
 for(const [id,t]of Object.entries(f.passengers)){const r=t.cargoLesson;if(r?.status!=='asked'||!wantsLesson(s,id)||p.needs.energy<12)continue;r.status='granted';r.granted=s.tick;p.needs.energy--;p.sailingCargoTick=s.tick;return true;}
 if(hold(s)&&physicalDistance(s.areas[f.deck],p.x,hold(s).x)>3)return false;
 if(cargoWorkReady(s,p.id))return secureFerryCargo(s,p.id);
 if(f.food>0&&f.cargo?.secure&&!f.cargo.secure.checked&&knowsPracticalMethod(s,p.id,'sailing')&&p.needs.energy>=12){f.cargo.secure.checked=true;f.cargo.secure.inspector=p.id;f.cargo.secure.inspectedAt=s.tick;p.needs.energy-=2;p.sailingCargoTick=s.tick;return true;}return false;
}
export function passengerCargoTurn(s,id,ctx={}){
 const f=s.ferry,t=f.passengers[id],b=body(s,id),p=s.people[id];if(!on(s)||!t||!p?.alive||!b||b.area!==f.deck||p.sailingCargoTick===s.tick||p.needs?.sleeping||b?.combat||f.phase!=='docked'||s.tick>=f.departure||(b.lineage?b.hunger:b.needs.hunger)>60)return false;
 const r=t.cargoLesson,o=hold(s),hasWork=r?.status==='granted'&&wantsLesson(s,id)||f.food>0&&f.cargo?.secure&&!f.cargo.secure.checked&&knowsPracticalMethod(s,id,'sailing')||cargoWorkReady(s,id);
 if(hasWork&&o&&physicalDistance(s.areas[f.deck],b.x,o.x)>3&&energy(b).energy>=1){const before=b.x;b.x+=areaStep(s.areas[f.deck],b.x,o.x,6);energy(b).energy--;p.sailingCargoTick=s.tick;if(b.lineage){b.distance+=physicalDistance(s.areas[f.deck],before,b.x);b.lastAction='walk';}return true;}
 if(r?.status==='granted'&&wantsLesson(s,id)&&energy(b).energy>=2){
  (p.skillPractice ||= {}).sailing ||= {operations:[],total:0};p.skillPractice.sailing.method={id:'check-cargo-lashing',learnedAt:s.tick,origin:'lesson',teacher:r.teacher,teacherName:s.people[r.teacher].name,source:[f.cargo.id+'/load/'+f.cargo.batch]};r.status='done';r.finished=s.tick;energy(b).energy-=2;p.sailingCargoTick=s.tick;f.cargo.secure.checked=true;f.cargo.secure.inspector=id;f.cargo.secure.inspectedAt=s.tick;if(b.lineage)b.lastAction='study';ctx.log?.(s,'На настоящем креплении показана проверка груза. Шторм и повреждения корпуса остаются возможны.','skill');return true;
 }
 if(f.food>0&&f.cargo?.secure&&!f.cargo.secure.checked&&knowsPracticalMethod(s,id,'sailing')&&energy(b).energy>=2){f.cargo.secure.checked=true;f.cargo.secure.inspector=id;f.cargo.secure.inspectedAt=s.tick;energy(b).energy-=2;p.sailingCargoTick=s.tick;if(b.lineage)b.lastAction='work';ctx.log?.(s,'Проверено и подтянуто крепление конкретной судовой провизии.','equipment');return true;}
 if(cargoWorkReady(s,id)&&secureFerryCargo(s,id)){ctx.log?.(s,'Одна настоящая верёвка держит судовую провизию. Оплата уже купленного билета не возвращается.','equipment');return true;}return false;
}
export function cargoHTML(s,escape){const f=s.ferry,c=f?.cargo;if(!c||!([f.deck,f.port].includes(s.hero.area)||s.hero.transit?.ferry?.id===f.id))return '';return '<p class="detail-label">СУДОВАЯ ПРОВИЗИЯ</p><p>'+f.food+' порц. · '+escape(!c.secure?'груз не закреплён':c.secure.checked?'крепление проверено':'крепление требует проверки')+'. '+(c.secure?'Переданная верёвка остаётся на судне. ':'')+'Крепление защищает только этот запас.</p>';}
