import {enabled} from '../rules.js';import {physicalDistance,areaStep} from '../geometry.js';import {selfDrivenActor} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';import {partyBodySpent} from './party-combat-policy.js';
import {profile} from './common.js';import {skillBranchesEnabled,knowsPracticalMethod,recordPracticalMechanic} from './skill-branches.js';
import {driveRetry} from './mechanic-drive-state.js';
const on=s=>skillBranchesEnabled(s)&&enabled(s,'mechanisms');
const actor=(s,p)=>selfDrivenActor(s,p.id)?s.actorStates[p.id]:null;
const body=(s,p)=>actor(s,p)||localContact(s,p.id,p.area);
const memory=p=>p.mechanicMemory ||= {version:1,known:[],consents:[],lastActionTick:-1};
const node=(s,key)=>s.edges[key]?.lift||s.edges[key]?.mechanism;
const station=n=>n.console||n.lever;
const object=(s,n)=>s.areas[station(n).area]?.objects.find(o=>o.id===station(n).id);
const owner=(s,n)=>object(s,n)?.owner||s.areas[station(n).area]?.home?.owner||null;
const bounded=(list,entry,max=8)=>{list.push(entry);if(list.length>max)list.shift();};
function safe(s,p,n,reach=9){const b=p&&body(s,p),h=p&&actor(s,p),a=b&&s.areas[b.area],o=n&&object(s,n);return Boolean(on(s)&&p?.alive&&p.status!=='captive'&&!p.needs.sleeping&&b&&!h?.transit&&!h?.combat&&o&&b.area===station(n).area&&physicalDistance(a,b.x,o.x)<=reach&&(h?h.energy:p.needs.energy)>=3&&(h?h.hunger:p.needs.hunger)<65&&(h?h.hp/h.maxHp:p.health/(p.maxHealth||100))>=.65&&!a.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&!e.hidden&&physicalDistance(a,b.x,e.x)<=18));}
function claim(s,p,inTurn=false){return !partyBodySpent(s,p)&&(actor(s,p)||npcController(s,p)==='personal'&&canStartNPCActivity(s,p,{inTurn})&&(inTurn? !enabled(s,'npc-control')||p.actionControl?.tick===s.tick&&p.actionControl.owner==='personal'&&p.actionControl.phases.every(x=>x==='act'):npcAction(s,p,'personal','mechanic')));}
function spend(s,p,cost){const h=actor(s,p);if(h){h.energy-=cost;h.lastAction='mechanism';}else p.needs.energy-=cost;memory(p).lastActionTick=s.tick;}
export function mechanicBasic(s,p){const h=actor(s,p);return Boolean(h&&['time','craft'].includes(profile(h).skill)||!h&&p.agenda?.job==='artisan'||knowsPracticalMethod(s,p.id,'craft')||p.toolSkills?.clamp||p.mechanicMemory?.fitKnowledge||p.skillPractice?.mechanic?.operations.length);}
export function drivePermission(s,p,n){const id=owner(s,n);return !id||id===p.id||s.people[id]?.alive&&p.mechanicMemory?.consents.some(r=>r.node===n.id&&r.owner===id&&r.episode===(n.drive?.current?.episode??0));}
function consentOwner(s,p,n){const q=s.people[owner(s,n)],a=p&&body(s,p),b=q&&localContact(s,q.id,a?.area);return q?.alive&&q.id!==p.id&&!q.needs.sleeping&&b&&physicalDistance(s.areas[a.area],a.x,b.x)<=12&&q.needs.energy>=15&&q.needs.hunger<=60&&npcController(s,q)==='personal'&&canStartNPCActivity(s,q)&&!partyBodySpent(s,q)&&!q.agenda?.task&&((q.agenda?.duty??0)>=.5||(actor(s,p)?.relations[q.id]?.trust??0)>=10)?q:null;}
export function askDriveConsent(s,p,key,ctx={}){
 const n=node(s,key),id=n&&owner(s,n),q=s.people[id],a=p&&body(s,p),b=q&&body(s,q);if(!n||!safe(s,p,n)||!id||id===p.id||drivePermission(s,p,n)||!q?.alive||q.needs.sleeping||!b||b.area!==a.area||physicalDistance(s.areas[a.area],a.x,b.x)>12||q.needs.energy<15||q.needs.hunger>60||npcController(s,q)!=='personal'||!canStartNPCActivity(s,q)||partyBodySpent(s,q)||q.agenda?.task||(q.agenda?.duty??0)<.5&&(actor(s,p)?.relations[q.id]?.trust??0)<10||!claim(s,p)||!npcAction(s,q,'personal','mechanic-consent'))return false;
 spend(s,p,1);spend(s,q,1);ctx.meetPerson?.(s,q.id,ctx,1);bounded(memory(p).consents,{node:n.id,owner:id,at:s.tick,episode:n.drive?.current?.episode??0});ctx.log?.(s,q.name+' разрешает работу с этим приводом. Деталь и труд остаются за мастером.','choice');return true;
}
export function diagnoseDrive(s,p,key,ctx={}){
 const n=node(s,key);if(!n||!knowsPracticalMethod(s,p.id,'mechanic')||!safe(s,p,n)||!drivePermission(s,p,n)||!claim(s,p))return false;
 spend(s,p,2);const cause=n.console?(n.status==='dismantled'?'dismantled':n.drive?.current?'worn-part':n.status==='broken'?'unfitted-drive':n.charge.remaining?'working':'empty-charge'):'closed'===n.state?'healthy-closed':'healthy-open',note={node:n.id,key,area:station(n).area,x:station(n).x,at:s.tick,cause,episode:n.drive?.current?.episode??0,part:cause==='worn-part'?n.drive.current.part:null,status:n.status||n.state};const m=memory(p),i=m.known.findIndex(r=>r.node===n.id);if(i>=0)m.known.splice(i,1);bounded(m.known,note);
 ctx.log?.(s,({['worn-part']:'Заедает изношенная деталь привода. Нужны настоящая подгонка и сменный материал.',['healthy-closed']:'Решётка исправна и просто закрыта. Ремонт не нужен; порядок рычага этим не раскрыт.',['empty-charge']:'Привод исправен, но заряд исчерпан. Подгонка не создаст топливо.',['healthy-open']:'Решётка исправна и открыта.',working:'Подъёмник исправен и заряжен. Ремонт не нужен.',dismantled:'Подъёмник разобран: одного осмотра недостаточно.', 'unfitted-drive':'Старый привод не подогнан. Это прежняя задача восстановления, не новая поломка от износа.'})[cause],'craft');return true;
}
export function fitLiftDrive(s,p,key,ctx={},{inTurn=false}={}){
 const n=s.edges[key]?.lift,d=n?.drive,j=d?.current;if(!j||n.status!=='broken'||n.parts.length!==2||!n.parts.some(i=>i.id===j.part)||!safe(s,p,n)||!drivePermission(s,p,n)||!mechanicBasic(s,p)||d.work&&d.work.actor!==p.id||!d.work&&!(p.marketCargo?.tools>=1)||!claim(s,p,inTurn))return false;
 if(!d.work){memory(p).fitKnowledge ||= {at:s.tick,source:'actual-fit-start',role:actor(s,p)?.profession||p.agenda?.job||p.role,node:n.id,episode:j.episode,job:n.id+'/fit/'+j.episode};const before=p.marketCargo.tools;p.marketCargo.tools--;d.work={id:n.id+'/fit/'+j.episode,actor:p.id,episode:j.episode,part:j.part,started:s.tick,steps:[],material:{kind:'tools',owner:p.id,before,after:p.marketCargo.tools,quantity:1}};}
 const w=d.work;if(w.episode!==j.episode)return false;spend(s,p,3);w.steps.push(s.tick);if(w.steps.length<3){ctx.log?.(s,'Подгоняется настоящая деталь привода. Материал уже вложен.','craft');return true;}
 const receipt={...w,key,tick:s.tick,area:n.console.area,node:n.id,ride:j.ride,part:j.part,finished:s.tick};bounded(d.repairs,receipt);const part=n.parts.find(i=>i.id===j.part);part.history.push({tick:s.tick,text:'Подогнана после настоящего износа: '+p.name+'.'});n.status='ready';n.repair=0;n.wear=0;d.current=null;d.work=null;s.graphRevision=(s.graphRevision||0)+1;recordPracticalMechanic(s,p,receipt);ctx.log?.(s,'Та же деталь подогнана. Подъёмник исправен; оставшийся заряд не изменился.','craft');return true;
}
export function learnDriveLesson(s,p,q,key,ctx={}){
 const n=node(s,key),a=p&&body(s,p),b=q&&body(s,q);if(!n?.drive?.current||n.status!=='broken'||n.parts.length!==2||actor(s,p)&&!actor(s,p).memory.people.includes(q?.id)||!safe(s,p,n)||!drivePermission(s,p,n)||knowsPracticalMethod(s,p.id,'mechanic')||!mechanicBasic(s,p)&&(actor(s,p)?.personality.curiosity??p.agenda?.curiosity??0)<.65||!q?.alive||!knowsPracticalMethod(s,q.id,'mechanic')||!b||b.area!==a.area||physicalDistance(s.areas[a.area],a.x,b.x)>9||q.needs.sleeping||(q.agenda?.sociability??0)<.3&&(actor(s,p)?.relations[q.id]?.trust??0)<10||q.needs.energy<30||q.needs.hunger>55||q.health<(q.maxHealth||100)*.75||npcController(s,q)!=='personal'||q.agenda.task||!canStartNPCActivity(s,q)||partyBodySpent(s,q)||!claim(s,p)||!npcAction(s,q,'personal','drive-lesson'))return false;
 spend(s,p,2);spend(s,q,1);const v=(p.skillPractice ||= {}).mechanic ||= {operations:[],total:0};v.method={id:'diagnose-drive',origin:'lesson',learnedAt:s.tick,teacher:q.id,teacherName:q.name,node:n.id,episode:n.drive.current.episode,source:[n.id+'/wear/'+n.drive.current.episode]};ctx.log?.(s,q.name+' показывает причину заедания на настоящей изношенной детали. Осмотр не чинит её.','skill');return true;
}
export function driveAction(s,ctx){const h=s.hero,g=h.goal,p=s.people[h.lineage];const result=g.kind==='driveInspect'?diagnoseDrive(s,p,g.key,ctx):g.kind==='driveConsent'?askDriveConsent(s,p,g.key,ctx):learnDriveLesson(s,p,s.people[g.person],g.key,ctx);h.goal=result?g.resume||null:null;return result;}
export function blockedDrivePlan(s,n,key,ctx,note){
 const h=s.hero,p=s.people[h.lineage],m=p.mechanicMemory,from=station(n),target=object(s,n);if(!n.drive?.current||n.status==='dismantled')return false;
 const assign=(kind,operation,intent,extra={})=>{ctx.goal(s,kind,from.area,from.x,intent,'Материал, согласие и труд проверяются у настоящего привода; осмотр сам не чинит его.',{key,object:target.id,operation,resume:structuredClone(h.goal),...extra});return true;};
 if(safe(s,p,n,30)){
 if(!drivePermission(s,p,n)){if(consentOwner(s,p,n))return assign('driveConsent',null,'Попросить разрешение на работу',{person:owner(s,n)});}
  else{
   const old=m?.known.find(r=>r.node===n.id);if(knowsPracticalMethod(s,p.id,'mechanic')&&(!old||old.episode!==n.drive.current.episode))return assign('driveInspect',null,'Проверить причину заедания');
   if(mechanicBasic(s,p)&&(n.drive.work?.actor===p.id||!n.drive.work&&p.marketCargo?.tools>=1))return assign('liftWork','repair','Подогнать изношенную деталь');
   if(!knowsPracticalMethod(s,p.id,'mechanic')&&(mechanicBasic(s,p)||h.personality.curiosity>=.65)){
    const teacher=Object.values(s.people).find(q=>{const b=localContact(s,q.id,h.area);return q.id!==p.id&&h.memory.people.includes(q.id)&&b&&physicalDistance(s.areas[h.area],h.x,b.x)<=12&&knowsPracticalMethod(s,q.id,'mechanic')&&((q.agenda?.sociability??0)>=.3||(h.relations[q.id]?.trust??0)>=10)&&!q.needs.sleeping&&npcController(s,q)==='personal'&&!q.agenda?.task;});if(teacher)return assign('driveLesson',null,'Попросить урок на неисправном приводе',{person:teacher.id});
   }
  }
 }
 h.goal=null;note.after=s.tick+48;note.driveRetry=driveRetry(s,p);ctx.log?.(s,'Для нынешнего ремонта не хватает доступного способа, материала или согласия. Он выбирает известный обход.','plan');return true;
}
export function driveRevision(s,g){const p=s.people[s.hero.lineage],n=node(s,g.key),b=n&&station(n),a=s.areas[s.hero.area],q=g.person&&s.people[g.person],at=q&&localContact(s,q.id,a.id),visible=n&&b.area===a.id&&physicalDistance(a,s.hero.x,b.x)<=24;return [driveRetry(s,p),visible?[n.id,n.status||n.state,n.drive?.current,n.drive?.work,object(s,n)?.owner,consentOwner(s,p,n)?.id]:null,at&&physicalDistance(a,s.hero.x,at.x)<=24?[q.id,q.alive,q.needs.sleeping,q.needs.energy>=30,q.needs.hunger<=55,q.health>=(q.maxHealth||100)*.75,npcController(s,q),Boolean(q.agenda?.task),(q.agenda?.sociability??0)>=.3,(q.agenda?.duty??0)>=.5]:null];}
export function driveReadiness(s,g){
 const h=s.hero,p=s.people[h.lineage],n=node(s,g.key),b=n&&station(n);if(!n||!on(s))return {status:'blocked',reason:'Привод или способ сейчас недоступен.',retryOn:'mechanic-source'};
 if(h.area!==b.area||physicalDistance(s.areas[h.area],h.x,b.x)>9)return {status:'ready'};
 if(!safe(s,p,n))return {status:'blocked',reason:'У привода нет безопасных условий для работы.',retryOn:'body-or-local-safety'};
 if(g.kind==='driveConsent'){if(drivePermission(s,p,n))return {status:'done',reason:'Разрешение уже есть.'};if(!consentOwner(s,p,n))return {status:'blocked',reason:'Владелец сейчас не согласен или не может участвовать.',retryOn:'local-owner'};}
 if(g.kind==='driveInspect'&&!knowsPracticalMethod(s,p.id,'mechanic'))return {status:'blocked',reason:'Способ диагностики ещё не освоен.',retryOn:'mechanic-method'};
 if(g.kind==='driveLesson'){const q=s.people[g.person],at=q&&localContact(s,q.id,h.area);if(!n.drive?.current||n.status!=='broken'||n.parts.length!==2||!q?.alive||!h.memory.people.includes(q.id)||!at||physicalDistance(s.areas[h.area],h.x,at.x)>9||!knowsPracticalMethod(s,q.id,'mechanic')||q.needs.sleeping||(q.agenda?.sociability??0)<.3&&(h.relations[q.id]?.trust??0)<10||q.needs.energy<30||q.needs.hunger>55||q.health<(q.maxHealth||100)*.75||npcController(s,q)!=='personal'||q.agenda?.task||!canStartNPCActivity(s,q)||partyBodySpent(s,q))return {status:'blocked',reason:'Нет доступного добровольного урока на неисправном устройстве.',retryOn:'mechanic-teacher'};}
 if(g.kind!=='driveConsent'&&!drivePermission(s,p,n))return {status:'blocked',reason:'Нет действительного согласия владельца.',retryOn:'owner-consent'};
 if(g.kind==='liftWork'&&g.operation==='repair'){
  if(!n.drive?.current||n.status!=='broken')return {status:'done',reason:'Эта неисправность уже устранена.'};
  if(!mechanicBasic(s,p)||n.drive.work&&n.drive.work.actor!==p.id||!n.drive.work&&!(p.marketCargo?.tools>=1))return {status:'blocked',reason:'Для подгонки нужны известный способ и свой конечный материал.',retryOn:'mechanic-material-or-method'};
 }
 return {status:'ready'};
}
export function planGrateDiagnosis(s,p,g,ctx){
 if(!knowsPracticalMethod(s,p.id,'mechanic')||!safe(s,p,g,30)||!drivePermission(s,p,g))return false;const note=p.mechanicMemory?.known.find(r=>r.node===g.id);if(note?.status===g.state)return false;
 ctx.goal(s,'driveInspect',g.lever.area,g.lever.x,'Проверить причину закрытого прохода','Закрытая исправная решётка и изношенный привод требуют разных действий.',{key:[g.from,g.to].sort().join('|'),object:g.lever.id,resume:structuredClone(s.hero.goal)});return true;
}
export function mechanicHTML(s,escape){const rows=s.people[s.hero.lineage]?.mechanicMemory?.known||[];return rows.length?'<p class="detail-label">ОСМОТР ПРИВОДОВ</p>'+rows.slice(-4).map(r=>'<p>'+escape(s.areas[r.area]?.name||r.area)+' · '+escape(({['worn-part']:'изношенная деталь',['healthy-closed']:'исправная закрытая решётка',['healthy-open']:'исправная открытая решётка',['empty-charge']:'нет заряда',working:'исправен',dismantled:'разобран','unfitted-drive':'не подогнан'})[r.cause])+'. Личный осмотр; с тех пор состояние могло измениться.</p>').join(''):'';}
export function npcMechanicTurn(s,p,ctx){
 if(!on(s)||actor(s,p)||!p.alive||p.agenda?.task||!mechanicBasic(s,p)||p.needs.energy<30||p.needs.hunger>55||p.health<(p.maxHealth||100)*.75||!canStartNPCActivity(s,p,{inTurn:true})||npcController(s,p)!=='personal')return false;
 for(const o of s.areas[p.area]?.objects||[]){const n=o.kind==='liftConsole'&&s.edges[o.key]?.lift;if(!n?.drive?.current||n.status!=='broken'||n.drive.work&&n.drive.work.actor!==p.id||!n.drive.work&&!(p.marketCargo?.tools>=1)||!safe(s,p,n,30)||!drivePermission(s,p,n))continue;
  if(physicalDistance(s.areas[p.area],p.x,o.x)>9){if(!claim(s,p,true))return false;p.x+=areaStep(s.areas[p.area],p.x,o.x,6);spend(s,p,1);return true;}
  return fitLiftDrive(s,p,o.key,ctx,{inTurn:true});
 }
 return false;
}
