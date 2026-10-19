import {enabled} from '../rules.js';
import {profession} from '../content.js';

export const SKILL_METHODS={
 magic:{name:'Практика знакомых чар',method:'measured-ward',label:'Размеренное слово укрытия',threshold:3},
 sailing:{name:'Судовое дело',method:'check-cargo-lashing',label:'Проверка крепления груза',threshold:2},
 tracking:{name:'Чтение следов',method:'read-trail-direction',label:'Направление настоящего следа',threshold:2},
 craft:{name:'Ремесло',method:'fit-working-part',label:'Подгонка рабочей детали',threshold:3},
 aid:{name:'Полевая помощь',method:'field-dressing',label:'Полевая повязка',threshold:3},
 trade:{name:'Торговля',method:'check-account',label:'Проверка расчёта',threshold:2}
};
export const skillBranchesEnabled=s=>enabled(s,'skill-branches')&&enabled(s,'identity');
export function practicalSkill(s,id,branch){return s.people[id]?.skillPractice?.[branch]||null;}
export function knowsPracticalMethod(s,id,branch){return skillBranchesEnabled(s)&&practicalSkill(s,id,branch)?.method?.id===SKILL_METHODS[branch]?.method;}
function ensure(s,id,branch){const p=s.people[id];if(!p)return null;return(p.skillPractice ||= {})[branch] ||= {operations:[],total:0};}
function roleMethod(s,id,branch,source,origin='role'){
 const state=ensure(s,id,branch);if(state.method)return;
 state.method={id:SKILL_METHODS[branch].method,recordedAt:s.tick,origin,source:[source]};
}
// Retain current-role or explicitly recorded professional knowledge without
// inventing past practice points or reapplying rank to character attributes.
export function rememberPracticalRole(s,p,h=null){
 if(!skillBranchesEnabled(s)||!p?.alive)return;
 const current=h||s.actorStates?.[p.id]||(s.hero?.lineage===p.id?s.hero:null);
 const heroRole=current?.alive&&current.actorMode!=='npc'&&!current.life?.ended?profession(current.profession):null;
 if(heroRole){
  if(heroRole.skill==='trade')roleMethod(s,p.id,'trade','profession/'+heroRole.id);
  if(['healing','spirit'].includes(heroRole.skill))roleMethod(s,p.id,'aid','profession/'+heroRole.id);
 }else{
  if(p.agenda?.job==='merchant')roleMethod(s,p.id,'trade','occupation/merchant');
  if(p.agenda?.job==='healer')roleMethod(s,p.id,'aid','occupation/healer');
 }
 for(const [id,record]of Object.entries(current?.career?.records||{})){
  if(!Number.isFinite(record.rank)||record.rank<2)continue;const old=profession(id);
  if(old.skill==='trade')roleMethod(s,p.id,'trade','career/'+id,'career');
  if(['healing','spirit'].includes(old.skill))roleMethod(s,p.id,'aid','career/'+id,'career');
 }
}
function stamp(event,branch,id){
 event.skillCredits ||= [];if(!event.skillCredits.some(c=>c.branch===branch&&c.id===id))event.skillCredits.push({branch,id});
}
function credit(s,actor,branch,event,extra={}){
 if(!skillBranchesEnabled(s)||!s.people[actor]?.alive||!event?.id||event.tick!==s.tick)return null;
 const state=ensure(s,actor,branch);if(state.lastTick>=s.tick||state.operations.some(e=>e.id===event.id))return null;
 const record={id:event.id,tick:s.tick,area:event.area,credits:[{branch,id:event.id}],...extra};state.operations.push(record);state.total++;state.lastTick=s.tick;if(state.operations.length>16)state.operations.shift();stamp(event,branch,event.id);
 if(!['craft','magic'].includes(branch)&&!state.method&&state.total>=SKILL_METHODS[branch].threshold)state.method={id:SKILL_METHODS[branch].method,learnedAt:s.tick,origin:'practice',source:state.operations.slice(-SKILL_METHODS[branch].threshold).map(e=>e.id)};
 return record;
}
export function recordPracticalAid(s,event){
 const patient=s.people[event?.patient];
 if(!patient?.alive||event.actor===event.patient||!(event.after>event.before)||patient.health!==event.after||!(event.spent>0)||!['herbs','potions','medicine'].includes(event.resource))return null;
 const request=patient.aidRequest===event&&event.status==='helped'&&event.finished===s.tick;
 const camp=s.hero.pairCamp?.care===event&&event.kind==='medicine'&&event.outcome==='shared'&&event.donor===event.actor&&event.recipient===event.patient;
 if(!request&&!camp)return null;
 return credit(s,event.actor,'aid',event,{patient:event.patient,recovered:event.after-event.before,resource:event.resource,spent:event.spent});
}
export function recordPracticalTrade(s,event){
 if(!skillBranchesEnabled(s)||!['food','tools'].includes(event?.kind)||!['buy','sell'].includes(event.side)||!(event.quantity>0)||!(event.total>0))return null;
 const a=s.areas[event.area],h=s.actorStates?.[event.actor]||(s.hero?.lineage===event.actor?s.hero:null);
 const stock=a?.goods?.history.includes(event)&&event.actor&&['market-buy','market-sell'].includes(event.reason);
 const owned=event.side==='buy'&&event.kind==='tools'&&(h?.bag?.some(item=>item.tradeReceipt===event)||a?.objects.some(o=>o.owner===event.actor&&(o.repair?.purchase===event||o.workTool?.repair?.purchase===event||o.workTool?.lastRepair?.part?.tradeReceipt===event)));
 if(!stock&&!owned)return null;
 const old=practicalSkill(s,event.actor,'trade');
 // This first method needs experience with both existing commodity types.
 // Moving the same food/tool through any number of markets cannot farm it.
 if(old?.kinds?.includes(event.kind))return null;
 const result=credit(s,event.actor,'trade',event,{kind:event.kind,side:event.side,quantity:event.quantity,paid:event.total});
 if(result){const state=practicalSkill(s,event.actor,'trade');state.kinds ||= [];state.kinds.push(event.kind);}return result;
}
// The existing craft ledger remains its single authority. This only makes the
// already granted credit explicit on the real restoration event.
export function stampPracticalCraft(s,actor,event,id){
 if(!skillBranchesEnabled(s)||!s.people[actor]?.alive||event?.tick!==s.tick)return;
 const state=practicalSkill(s,actor,'craft');if(state?.operations.some(e=>e.id===id&&e.tick===s.tick))stamp(event,'craft',id);
}
export function recordPracticalToolRepair(s,a,o,event){
 const t=o?.workTool,r=t?.lastRepair,part=r?.part;
 if(!skillBranchesEnabled(s)||!enabled(s,'craft-practice')||!enabled(s,'property')||!enabled(s,'property-damage')||!a?.objects.includes(o)||o.state!=='intact'||t.state!=='working'||event?.kind!=='tool-repair'||event.tick!==s.tick||r?.tick!==s.tick||r.actor!==event.actor||r.episode!==t.episode||!part||!(part.units>0||part.kind==='workPart'&&part.partType==='clamp-guide'))return null;
 const id=t.id+'/episode/'+t.episode,eventId=event.id;event.id=id;event.area=a.id;const result=credit(s,r.actor,'craft',event,{property:o.id,tool:t.id,episode:t.episode,method:r.method});
 if(!result&&eventId===undefined)delete event.id;return result;
}
export function canBargain(s,id,native=false){return native||knowsPracticalMethod(s,id,'trade');}
export function fieldMedicineCost(s,id){return knowsPracticalMethod(s,id,'aid')?1:2;}

export function recordPracticalTracking(s,p,note){
 if(!p?.tracking?.notes.includes(note)||note.confirmedAt!==s.tick||note.studiedAt>=s.tick||note.quality!=='fresh')return null;
 const state=practicalSkill(s,p.id,'tracking');if(state?.method||state?.operations.some(e=>e.source===note.source.id))return null;
 note.tick=s.tick;return credit(s,p.id,'tracking',note,{source:note.source.id,trace:note.trace,studiedAt:note.studiedAt});
}

export function recordPracticalSailing(s,event){
 if(!s.ferry?.cargo?.operations.includes(event)||event.status!=='departed'||event.voyage!==s.ferry.voyage||event.confirmedBy!==s.ferry.captain)return null;
 const old=practicalSkill(s,event.actor,'sailing');if(old?.method||old?.operations.some(e=>e.ship===event.ship&&e.voyage===event.voyage))return null;
 return credit(s,event.actor,'sailing',event,{ship:event.ship,voyage:event.voyage,batch:event.batch,rope:event.rope,securedAt:event.securedAt,confirmedBy:event.confirmedBy});
}

export function recordPracticalWard(s,event){
 const h=s.hero;if(h.magic.wardLastImpact!==event||h.magic.wardActive?.cast!==event.cast||h.combat!==event.enemy||!(event.before>event.after))return null;const q=practicalSkill(s,h.lineage,'magic');if(q?.total>=3||q?.operations.some(e=>e.enemy===event.enemy))return null;return credit(s,h.lineage,'magic',event,{enemy:event.enemy,cast:event.cast,castAt:event.castAt,paid:event.paid,raw:event.raw,before:event.before,after:event.after,form:event.form});
}
