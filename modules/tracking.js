import {observationRadius,observeDevelopment} from './development-skills.js';
import {physicalDistance} from '../geometry.js';
import {trackingOn,localEdgeTraces,trailClarity} from './edge-traces.js';
import {knowsPracticalMethod,recordPracticalTracking} from './skill-branches.js';
import {localContact} from './npc-contacts.js';
import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';
import {knownArea,knownRoad} from '../actor-atlas.js';
const threatened=(s,b)=>s.areas[b.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&!o.hidden&&physicalDistance(s.areas[b.area],b.x,o.x)<=9);
const ensure=p=>p.tracking ||= {version:1,notes:[],lastActionTick:-1};
export function localTrails(s,h=s.hero){
 const a=s.areas[h.area],near=localEdgeTraces(s,h);
 if(!trackingOn(s)||h.transit)return near;
 for(const o of a.objects){const t=o.trace;if(o.kind!=='creatureTrace'||!Number.isFinite(t.direction)||t.expires<=s.tick||physicalDistance(a,h.x,o.x)>observationRadius(s,h.lineage||h.id,12))continue;
  near.push({id:o.id,source:{kind:'enemy',id:t.enemy},from:a.id,to:a.id,fromX:o.x,toX:o.x,at:t.created,expires:t.expires,wet:Boolean(t.wet),x:o.x,direction:t.direction,species:t.species});}
 return near;
}
function sourceHere(s,n,h=s.hero){
 const a=s.areas[h.area];
 if(n.source.kind==='person'){const q=localContact(s,n.source.id,h.area);return q&&q.person.alive&&physicalDistance(a,h.x,q.x)<=12;}
 if(n.source.kind==='enemy')return a.objects.some(o=>o.id===n.source.id&&o.kind==='enemy'&&o.alive&&!o.resolved&&!o.hidden&&physicalDistance(a,h.x,o.x)<=30);
 const pets=[...h.companions,...(a.population||[]).flatMap(id=>s.people[id]?.pets||[]),...a.objects.filter(o=>o.existingPet).map(o=>o.existingPet)];return pets.some(c=>{const b=c.packCargo?.body||c.petCustody?.body;return c.uid===n.source.id&&c.hp>0&&b?.area===h.area&&physicalDistance(a,h.x,b.x)<=12;});
}
export function confirmTracking(s,p=s.people[s.hero.lineage],body=s.hero){
 if(!trackingOn(s)||!p?.alive||body.transit)return;
 for(const n of p.tracking?.notes||[]){if(n.confirmedAt!==undefined||n.studiedAt>=s.tick||s.tick-n.at>240||![n.from,n.to].includes(body.area)||!sourceHere(s,n,body))continue;
  n.confirmedAt=s.tick;n.area=body.area;if(recordPracticalTracking(s,p,n))break;
 }
}
function teacherReady(s,p){const h=s.hero,q=p&&localContact(s,p.id,h.area);return Boolean(q&&p.needs&&p.alive&&p.role!=='ребёнок'&&p.id!==h.lineage&&physicalDistance(s.areas[h.area],h.x,q.x)<=9&&knowsPracticalMethod(s,p.id,'tracking')&&!p.needs?.sleeping&&(p.needs?.energy??100)>=35&&p.health>=(p.maxHealth||100)*.7&&!p.agenda?.task&&(p.agenda?.sociability??0)>=.45&&(h.relations[p.id]?.trust??0)>=0&&!threatened(s,q)&&npcController(s,p)==='personal'&&canStartNPCActivity(s,p));}
export function trackingPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!trackingOn(s)||h.transit||h.combat||h.energy<25||h.hunger>60||!['ranger'].includes(h.profession)&&!knowsPracticalMethod(s,p.id,'tracking'))return false;
 const tasks=h.quests.filter(q=>q.status==='active');
 const trail=localTrails(s).find(t=>(!tasks.length||tasks.some(q=>q.recipient===t.source.id))&&t.source.id!==h.lineage&&!p.tracking?.notes.some(n=>n.trace===t.id&&n.at===t.at));if(!trail)return false;
 const teacher=trailClarity(s,trail)==='fresh'&&!knowsPracticalMethod(s,p.id,'tracking')&&(s.areas[h.area].population||[]).map(id=>s.people[id]).find(p=>teacherReady(s,p));
 ctx.goal(s,teacher?'trackLesson':'trackStudy',h.area,h.x,teacher?'Разобрать настоящий след с наставником':'Изучить настоящий след','Одно отдельное действие: след не выдаёт тайный адрес своего источника.',{trace:trail.id,traceAt:trail.at,...(teacher?{teacher:teacher.id,person:teacher.id}:{})});return true;
}
function rememberTrail(s,p,body,trail){const quality=trailClarity(s,trail,s.areas[body.area]),direction=quality==='fresh'&&knowsPracticalMethod(s,p.id,'tracking')?(trail.passage?'passage':trail.direction||(trail.from===body.area?(trail.fromX===100?1:-1):trail.toX===5?1:-1)):null;
 const n={id:'tracking/'+trail.id+'/'+trail.at,trace:trail.id,source:{...trail.source},from:trail.from,to:trail.to,at:trail.at,area:body.area,studiedArea:body.area,studiedAt:s.tick,quality,direction};observeDevelopment(s,p.id,'trail/'+trail.id+'/'+trail.at,{factKey:'trail/'+trail.id,factVersion:trail.at});const m=ensure(p);m.notes.push(n);if(m.notes.length>8)m.notes.shift();m.lastActionTick=s.tick;
 return n;
}
export function trackingAction(s,ctx){
 const h=s.hero,p=s.people[h.lineage],g=h.goal;if(!trackingOn(s)||!['trackStudy','trackLesson'].includes(g?.kind)||h.energy<2||threatened(s,h))return false;
 const trail=localTrails(s).find(t=>t.id===g.trace&&t.at===g.traceAt);h.goal=null;if(!trail||p.tracking?.lastActionTick>=s.tick)return false;
 const m=ensure(p);if(m.notes.some(n=>n.trace===trail.id&&n.at===trail.at))return false;
 if(g.kind==='trackLesson'){
  if(knowsPracticalMethod(s,p.id,'tracking')||trailClarity(s,trail)!=='fresh')return false;
  const teacher=s.people[g.teacher];if(!teacherReady(s,teacher)||!npcAction(s,teacher,'personal'))return false;
  teacher.needs.energy=Math.max(0,teacher.needs.energy-1);
  (p.skillPractice ||= {}).tracking ||= {operations:[],total:0};p.skillPractice.tracking.method={id:'read-trail-direction',learnedAt:s.tick,origin:'lesson',teacher:teacher.id,teacherName:teacher.name,source:[trail.id]};
 }
 const quality=trailClarity(s,trail),direction=quality==='fresh'&&knowsPracticalMethod(s,p.id,'tracking')?(trail.direction||(trail.from===h.area?(trail.fromX===100?1:-1):trail.toX===5?1:-1)):null;
 const n=rememberTrail(s,p,h,trail);
 h.energy-=2;h.lastAction='study';
 ctx.log(s,quality!=='fresh'?'След размыт или слишком стар: надёжного направления нет.':direction?`След ${direction==='passage'?'ведёт через этот проход':direction>0?'уходит вправо':'уходит влево'}. Это прежний проход, не текущий адрес.`:'След изучен. Чтобы проверить догадку, нужна последующая собственная встреча с источником.','knowledge');
 // A learned reading may change a real route, but never force pursuit.
 if(direction&&trail.source.kind==='enemy'&&(h.personality.courage<.65||h.energy<60)){
  const a=s.areas[h.area],escape=a.links.find(id=>knownArea(s,id)&&knownRoad(s,a.id,id)&&Math.sign(Number(id.slice(1))-Number(a.id.slice(1)))===-direction);
  if(escape)ctx.goal(s,'explore',escape,50,'Обойти направление свежего хищного следа','Последний известный след предупреждает о риске. Это выбор знакомого пути, не чтение скрытого тела.');
 }else if(direction&&trail.to!==h.area&&trail.source.kind==='person'&&m.notes.some(note=>note.source.kind==='person'&&note.source.id===trail.source.id&&note.confirmedAt!==undefined)&&h.quests.some(q=>q.status==='active'&&q.recipient===trail.source.id)&&knownArea(s,trail.to)&&knownRoad(s,h.area,trail.to))ctx.goal(s,'explore',trail.to,trail.toX,'Проверить прежний путь нужного человека','След мог устареть: человек не обязан оставаться там.');
 return true;
}
export function trackingHTML(s,escape){const m=s.people[s.hero.lineage]?.tracking;if(!m?.notes.length)return '';return '<p class="detail-label">ЛИЧНЫЕ СЛЕДЫ</p>'+m.notes.slice(-4).map(n=>'<p>'+escape(n.source.kind==='person'?'След человека':n.source.kind==='pet'?'След животного':'След существа')+' · '+escape(s.tick-n.at<80?'недавняя запись':s.tick-n.at<240?'раньше в этот день':'давняя запись')+' · '+escape(n.quality==='washed'?'размыт':n.quality==='faded'?'давний':n.direction?(n.direction==='passage'?'через проход':n.direction>0?'направо':'налево'):n.confirmedAt!==undefined?'учебная запись':'направление ещё не прочитано')+(n.confirmedAt!==undefined?' · подтверждён собственной встречей':' · источник после осмотра ещё не встречен')+'.</p>').join('');}

// Called only inside the existing personal act phase, after ordinary needs.
export function npcTrackingTurn(s,p){
 const body={id:p.id,area:p.area,x:p.x,companions:p.pets||[],transit:p.roadTransit};confirmTracking(s,p,body);
 if(!trackingOn(s)||!p.alive||threatened(s,body)||p.needs?.sleeping||p.agenda?.task||(p.agenda?.curiosity??0)<.65||p.needs.energy<25||p.needs.hunger>60||p.health<(p.maxHealth||100)*.7||p.tracking?.lastActionTick>=s.tick||npcController(s,p)!=='personal')return false;
 const trail=localTrails(s,body).find(t=>t.source.id!==p.id&&!p.tracking?.notes.some(n=>n.trace===t.id&&n.at===t.at));if(!trail)return false;
 p.agenda.task={kind:'trackStudy',target:p.area,x:p.x,trace:trail.id,traceAt:trail.at};rememberTrail(s,p,body,trail);p.needs.energy-=2;p.agenda.task=null;p.agenda.due=s.tick+8;return true;
}
