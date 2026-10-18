import {branchPactsOn,assessPactAid,rememberPactChoice,performedPactAid} from './branch-pact-state.js';
import {publishAidNews} from './witness-news.js';
import {confirmWord} from './word-custom.js';
import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {knowsPracticalMethod,recordPracticalAid,skillBranchesEnabled,practicalSkill} from './skill-branches.js';
import {PROFESSIONS} from '../content.js';
import {detailedActors,selfDrivenActor} from '../actor-projection.js';
import {actorView} from '../actor-view.js';
import {rootWorld} from '../world-ref.js';
import {npcController} from './npc-control.js';
import {localContact,missContact,initializeNPCContacts,NPC_CONTACT_LIMIT} from './npc-contacts.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {moral} from './common.js';
export const AID_POLICY={need:.55,hearing:12,cooldown:240,requestTicks:80,energy:3};
const on=s=>enabled(s,'personal-aid');
const wounded=p=>p.health>0&&p.health<(p.maxHealth||100)*AID_POLICY.need;
function note(s,p,text){if(!p?.alive||!p.agenda)return;p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();}
function tell(s,h,p,text,type,ctx){note(s,p,text);ctx.log(actorView(s,h),text,type,p.area);const root=rootWorld(s),patient=root.actorStates?.[p.id];if(patient&&root.hero.lineage!==p.id)ctx.log(actorView(root,patient),text,type,p.area,{relay:false});}

export function medicalKnowledge(s,h){
 if(!enabled(s,'identity'))return null;
 const known=[];
 if(knowsPracticalMethod(s,h.lineage,'aid'))known.push({id:'field-dressing',name:'Полевая повязка',rank:1,former:false,origin:practicalSkill(s,h.lineage,'aid').method.origin});
 for(const p of PROFESSIONS)if(['healing','spirit'].includes(p.skill)){
  const current=p.id===h.profession,record=h.career.records?.[p.id],rank=current?h.career.rank:record?.rank;
  if(current&&rank>=1||!current&&rank>=2)known.push({id:p.id,name:p.name,rank,former:!current});
 }
 return known.sort((a,b)=>b.rank-a.rank||Number(a.id==='field-dressing')-Number(b.id==='field-dressing')||a.id.localeCompare(b.id))[0]||null;
}
export function aidMethod(s,h){
 const knowledge=medicalKnowledge(s,h);
 if(knowledge&&h.inventory.herbs>0)return {resource:'herbs',fraction:Math.min(.6,.12+knowledge.rank*.04),knowledge};
 return h.inventory.potions>0?{resource:'potions',fraction:.25,knowledge:null}:null;
}

export function planAidRequest(s,p){
 if(!on(s)||!p?.alive||!wounded(p)||p.role==='ребёнок'||npcController(s,p)!=='personal'||(p.aidAfter||0)>s.tick)return false;
 if(p.aidRequest?.status==='pending'&&p.aidRequest.until>=s.tick)return false;
 if(p.aidRequest?.status==='pending')p.aidRequest.status='expired';
 const near=detailedActors(s).filter(h=>selfDrivenActor(s,h)&&h.lineage!==p.id&&!h.combat&&localContact(s,h.lineage,p.area)&&Math.abs(h.x-p.x)*areaScale(s.areas[h.area])<=40).sort((a,b)=>Math.abs(a.x-p.x)*areaScale(s.areas[p.area])-Math.abs(b.x-p.x)*areaScale(s.areas[p.area])||a.lineage.localeCompare(b.lineage))[0];
 let contact=near?{person:near.lineage,area:p.area,x:near.x}:null;
 if(!contact&&enabled(s,'npc-contacts')&&enabled(s,'npc-knowledge')){
  contact=(p.navigation?.contacts||[]).filter(c=>c.medical&&c.missingAt==null).map(c=>({contact:c,path:npcKnownRoute(p,p.area,c.area,knownNPCHazards(s,p))})).filter(c=>c.path.length>0&&c.path.length<=5).sort((a,b)=>a.path.length-b.path.length||a.contact.person.localeCompare(b.contact.person))[0]?.contact;
 }
 if(!contact)return false;
 p.agenda.task={kind:'askAid',target:contact.area,x:near&&Math.abs(near.x-p.x)*areaScale(s.areas[p.area])<=AID_POLICY.hearing?p.x:contact.x,remaining:1,person:contact.person,addressName:s.areas[contact.area].name,knownNavigation:contact.area!==p.area};
 if(contact.area!==p.area)p.status='wandering';return true;
}
export function aidVisitTarget(s,p,t){
 if(!on(s)){p.agenda.task=null;return false;}
 if(p.area===t.target){const body=localContact(s,t.person,p.area);if(body)t.x=Math.abs(body.x-p.x)*areaScale(s.areas[p.area])<=AID_POLICY.hearing?p.x:body.x;}
 return true;
}
export function finishAidRequest(s,p,t,ctx){
 const body=localContact(s,t.person,p.area),h=s.actorStates?.[t.person];
 p.agenda.task=null;p.agenda.due=s.tick+48;p.aidAfter=s.tick+AID_POLICY.cooldown;
 if(!on(s)||!p.alive||!wounded(p))return false;
 if(!h||!selfDrivenActor(s,h)||!body||Math.abs(body.x-p.x)*areaScale(s.areas[p.area])>AID_POLICY.hearing){const text=body?'Прежний помощник сейчас не может взяться за лечение.':'По прежнему адресу помощника не оказалось. Новое местоположение неизвестно.';if(!body)missContact(s,p,t.person);note(s,p,text);const own=rootWorld(s).actorStates?.[p.id];if(own)ctx.log(actorView(s,own),text,'npc',p.area);else if(s.hero.area===p.area&&!s.hero.transit)ctx.log(s,text,'npc',p.area);return false;}
 const id=p.id+'/aid/'+s.tick;p.aidRequest={id,to:h.lineage,helperName:h.name,area:p.area,x:p.x,asked:s.tick,until:s.tick+AID_POLICY.requestTicks,status:'pending',health:p.health,maximum:p.maxHealth||100};
 if(branchPactsOn(s)&&h.branchPact&&(p.home||p.agenda.home)===p.area)p.aidRequest.residence={area:p.area,faction:s.areas[p.area].faction};
 if(!h.memory.people.includes(p.id))h.memory.people.push(p.id);
 if(enabled(s,'relationships'))h.relations[p.id] ||= {trust:0,met:s.tick,lastSeen:s.tick,helped:0};
 tell(s,h,p,`${p.name} просит помочь: ему совсем плохо, а доступного лечения сейчас не нашлось.`,'talk',ctx);return true;
}

export function aidAssessment(s,h,p){
 const method=aidMethod(s,h),request=p.aidRequest;
 if(!method)return {help:false,reason:'Нет подходящего лекарства или знаний, чтобы оказать помощь.'};
 if(h.hp<h.maxHp*Math.max(.55,.35+(1-h.personality.courage)*.28)||h.energy<30||h.hunger>=75)return {help:false,reason:'Собственное состояние сейчас не позволяет заботиться о другом.'};
 const trust=h.relations[p.id]?.trust||0,urgency=(1-p.health/(p.maxHealth||100))*40+h.personality.generosity*20+Math.max(-10,Math.min(15,trust*.3));
 const order=Object.values(s.workOrders||{}).find(c=>c.helper===h.lineage&&c.status==='active'),pressure=order?4+Math.max(0,30-(order.deadline-s.tick)/5):0;
 const promise=h.quests.some(q=>q.status==='active')?10:0,personal=h.commitments.personal?.status==='active'?12:0,cost=18+(1-h.personality.generosity)*25+pressure+promise+personal;
 return assessPactAid(s,h,p,{help:urgency>=cost,method,urgency,cost,reason:urgency>=cost?'Раны человека важнее небольшой задержки.':pressure>10?'Срок оплаченного дела слишком близок. Он не берётся за помощь.':promise||personal?'Собственное обязательство сейчас перевешивает просьбу.':'Не хочет тратить свои припасы на чужие заботы.',request:request.id});
}
export function respondAid(s,ctx){
 const h=s.hero;if(!on(s)||h.combat||h.transit||h.goal?.kind==='aidPerson')return false;
 const pending=Object.values(s.people).filter(p=>p.aidRequest?.to===h.lineage&&p.aidRequest.status==='pending'&&p.aidRequest.until>=s.tick&&npcController(s,p)==='personal'&&localContact(s,p.id,h.area)&&Math.abs((localContact(s,p.id,h.area)?.x??Infinity)-h.x)*areaScale(s.areas[h.area])<=AID_POLICY.hearing).sort((a,b)=>a.health/(a.maxHealth||100)-b.health/(b.maxHealth||100)||a.id.localeCompare(b.id))[0];
 if(!pending)return false;const assessment=aidAssessment(s,h,pending),r=pending.aidRequest;rememberPactChoice(s,h,pending,assessment);
 if(!assessment.help){r.status='declined';r.answered=s.tick;r.reason=assessment.reason;h.lastAction='talk';h.speech='Сейчас не смогу.';tell(s,h,pending,`${h.name} отвечает на просьбу ${pending.name}: ${assessment.reason}`,'choice',ctx);return true;}
 const word=confirmWord(s,pending,h,r,{urgent:true});
 if(word.mode==='urgent'&&pending.wordCustom?.form==='witness')tell(s,h,pending,pending.name+': «Не до свидетелей. Сейчас нужна помощь».','talk',ctx);
 r.status='agreed';r.answered=s.tick;publishAidNews(s,pending);
 const body=localContact(s,pending.id,h.area);ctx.goal(s,'aidPerson',body.area,body.x,'Помочь: '+pending.name,assessment.method.knowledge?.former?`Пригодятся прежние знания: ${assessment.method.knowledge.name}. Другие дела пока подождут.`:assessment.reason,{person:pending.id,aid:r.id});return false;
}
export function aidTarget(s){
 const h=s.hero,g=h.goal;if(g?.kind!=='aidPerson')return true;
 const p=s.people[g.person],r=p?.aidRequest,body=localContact(s,g.person,h.area);
 if(!on(s)||!p?.alive||p.health<=0||!body||body.area!==g.area||npcController(s,p)!=='personal'||r?.id!==g.aid||r.to!==h.lineage||r.status!=='agreed'||r.until<s.tick){h.goal=null;return false;}g.x=body.x;return true;
}
export function performAid(s,ctx){
 const h=s.hero,g=h.goal,p=s.people[g?.person];if(g?.kind!=='aidPerson'||!aidTarget(s)||!p||Math.abs(h.x-p.x)*areaScale(s.areas[h.area])>1)return false;
 const r=p.aidRequest,method=aidMethod(s,h),maximum=p.maxHealth||100;
 if(!method||p.health>=maximum*.85){r.status=method?'unneeded':'unable';h.goal=null;h.lastAction='talk';tell(s,h,p,method?'Состояние просившего уже улучшилось. Дополнительные припасы не понадобились.':`${h.name} не смог помочь: подходящего лекарства больше не осталось.`,'choice',ctx);return false;}
 h.inventory[method.resource]--;h.energy=Math.max(0,h.energy-AID_POLICY.energy);const before=p.health;p.health=Math.min(maximum,p.health+Math.max(1,Math.round(maximum*method.fraction)));
 r.status='helped';r.finished=s.tick;r.resource=method.resource;r.recovered=p.health-before;r.knowledge=method.knowledge?.id||null;performedPactAid(s,h,p);publishAidNews(s,p);h.goal=null;h.lastAction='heal';h.speech='Прижми повязку.';moral(s,2);ctx.gainXp(s,3);
 if(skillBranchesEnabled(s))recordPracticalAid(s,Object.assign(r,{tick:s.tick,actor:h.lineage,patient:p.id,before,after:p.health,spent:1}));
 (p.agenda.bonds ||= {})[h.lineage]=Math.min(100,(p.agenda.bonds[h.lineage]||0)+4);
 if(enabled(s,'relationships')){const relation=h.relations[p.id] ||= {trust:0,met:s.tick,lastSeen:s.tick,helped:0};relation.trust=Math.min(100,relation.trust+4);relation.helped++;relation.lastSeen=s.tick;}
 if(enabled(s,'npc-contacts')){initializeNPCContacts(s,p);let contact=p.navigation.contacts.find(c=>c.person===h.lineage);if(!contact){contact={person:h.lineage};p.navigation.contacts.push(contact);}Object.assign(contact,{name:h.name,area:h.area,place:s.areas[h.area].name,x:h.x,seen:s.tick,medical:true,missingAt:null});if(p.navigation.contacts.length>NPC_CONTACT_LIMIT)p.navigation.contacts.sort((a,b)=>a.seen-b.seen).splice(0,p.navigation.contacts.length-NPC_CONTACT_LIMIT);}
 tell(s,h,p,`${h.name} помогает ${p.name}: ${method.resource==='herbs'?'расходует лечебную траву и свои знания':'отдаёт собственное зелье'}. Состояние улучшается: +${r.recovered} здоровья. Другие дела остаются в силе.`,'heal',ctx);return true;
}
