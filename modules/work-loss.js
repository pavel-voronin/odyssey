import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {JOBS} from '../content.js';
import {questMeaning} from './intention-choice.js';
import {knownServiceAllows,questServiceBlocked} from './service-access.js';
const on=s=>enabled(s,'work-loss')&&enabled(s,'work')&&enabled(s,'property');
function life(h){return h.workLife ||= {last:null,loss:null};}
export function rememberWorkplace(s,g){
 if(!on(s)||g.job!=='repair'||!g.workspace?.id)return;
 life(s.hero).last={id:g.workspace.id,area:g.workshop?.area||s.hero.area,owner:g.workspace.owner||s.hero.lineage,job:g.job,worked:s.tick};
}
export function recordWorkplaceLoss(s,ctx,anchor,observed){
 if(!on(s)||!anchor?.id)return false;
 const h=s.hero,state=life(h),previous=state.loss;
 if(previous?.id===anchor.id&&previous.observed>=(state.last?.id===anchor.id?state.last.worked:-1))return false;
 const known=h.property.known[anchor.id],name=known?.name||'Прежняя мастерская';
 state.loss={id:anchor.id,area:anchor.area||h.area,owner:anchor.owner||known?.owner||null,observed:observed??s.tick,status:'pending',name};
 h.intent='Рабочее место закрыто';h.reason='Прежний рабочий план стал недоступен. Он решит, чему теперь уделить время.';
 ctx.log(s,`${name} больше не даёт рабочего места. Прежний план работы потерял опору; он решит, чему теперь уделить время.`,'choice');return true;
}
function family(s,id){
 if(!enabled(s,'lineage')||!s.hero.memory.people.includes(id))return false;
 const p=s.people[s.hero.lineage],other=s.people[id];if(!p||!other)return false;
 return (p.parents||[]).includes(id)||(other.parents||[]).includes(p.id)||(p.parents||[]).some(id=>(other.parents||[]).includes(id));
}
export function reconsiderWorkLoss(s,ctx,currentQuest){
 if(!on(s))return false;
 const h=s.hero;if(h.combat||h.transit||h.energy<23||h.hp<h.maxHp*(.35+(1-h.personality.courage)*.28))return false;
 const last=h.workLife?.last,known=last&&h.property.known[last.id];
 // Remembered closure, not a remote inspection of the current workshop.
 if(known&&known.state!=='intact'&&known.seen>=last.worked&&(h.career.lastChange??0)<=last.worked)recordWorkplaceLoss(s,ctx,last,known.seen);
 const loss=h.workLife?.loss;if(!loss||loss.status!=='pending')return false;
 if((h.career.lastChange??0)>loss.observed){loss.status='superseded';return false;}
 if(currentQuest?.deadline&&currentQuest.deadline-s.tick<=24)return false;
 const routes=new Map(),route=id=>{if(!routes.has(id))routes.set(id,ctx.knownRoute(s,h.area,id));return routes.get(id);};
 const quests=enabled(s,'quests')?h.quests.filter(q=>q.status==='active'&&!questServiceBlocked(s,q)&&['rescue','medicine','herbs','supply'].includes(q.kind)&&(family(s,q.person)||family(s,q.giver))).flatMap(q=>{
  const ready=ctx.questReady(s,q),target=ready?q.source:q.target;if(!knownArea(s,target)||!route(target).length)return [];
  return [{q,...questMeaning(s,q,ready)}];
 }).sort((a,b)=>b.value-a.value||String(a.q.id).localeCompare(String(b.q.id))):[];
 // The knowledge-map key is authoritative, including for legacy entries.
 const workspaces=Object.entries(h.property.known).filter(([id,k])=>id!==loss.id&&k.state==='intact'&&knownArea(s,k.area)&&knownServiceAllows(s,s.areas[k.area],'employment',{job:'repair'})&&route(k.area).length&&(k.owner===h.lineage||h.gold>=2)).map(([id,k])=>({...k,id})).sort((a,b)=>route(a.area).length-route(b.area).length||a.id.localeCompare(b.id));
 const craft=20+h.career.rank*7+Math.min(18,(h.counters.peacefulWork||0)/3)+(h.career.path==='peaceful'?12:0),chosen=quests[0];
 if(chosen&&(!workspaces.length||chosen.value>craft)){
  ctx.planQuest(s,chosen.q);if(h.goal?.quest===chosen.q.id){loss.status='family';loss.decided=s.tick;loss.quest=chosen.q.id;h.reason='Прежнее рабочее место закрыто. Теперь он может уделить время уже данному семейному обещанию. '+chosen.reason;ctx.log(s,`${h.name} после потери работы возвращается к семейному делу «${chosen.q.title||chosen.q.kind}».`,'plan');return true;}
 }
 if(workspaces.length){const place=workspaces[0],job=JOBS.find(j=>j.id==='repair');loss.status='craft';loss.decided=s.tick;loss.target=place.id;
  ctx.goal(s,'work',place.area,42,'Продолжить ремесло в другой мастерской','Прежнее место закрыто, но навык и желание работать остались. Он знает другую мастерскую; доступ придётся получить на месте.',{job:job.id,remaining:job.duration,motive:'reorient',workplace:{id:place.id,area:place.area,owner:place.owner}});
  ctx.log(s,`${h.name} выбирает другую известную мастерскую: ${s.areas[place.area].name}. Прежние заработок и мастерство остаются с ним.`,'plan');return true;
 }
 loss.status='open';loss.decided=s.tick;ctx.log(s,`${h.name} пока не знает подходящего рабочего места или семейного дела. Он оставляет прежнюю работу и ищет другое занятие.`,'plan');return false;
}
