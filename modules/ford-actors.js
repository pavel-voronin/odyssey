import {quakeBlocked} from './quake-state.js';
import {observeRupture} from './quake-knowledge.js';
import {npcMetricGate} from './metric-route.js';
import {fordPassage,fordChoice} from './fords.js';
import {liftAt,npcLiftPassage} from './lift-policy.js';
const taskTag=g=>g&&JSON.stringify([g.kind,g.area,g.started??null,g.quest??null]);
function restoreView(h,view){h.intent=view.intent;h.reason=view.reason;h.action=view.action||'ПУТЬ';}
export function resumeFordTaskView(s){const h=s.hero,g=h.goal;if(g?.fordTaskView&&g.fordDetour&&h.area===g.area){restoreView(h,g.fordTaskView);delete g.fordTaskView;delete g.fordWait;delete g.fordDetour;}}
function heroResult(s,r,ctx){const h=s.hero;if(r.status==='arrived'){h.x=r.crossing.arrivalX;ctx.enter(s,r.crossing.to);if(h.goal&&taskTag(h.goal)===r.crossing.goalTag){restoreView(h,h.goal.fordTaskView||r.crossing);delete h.goal.fordTaskView;delete h.goal.fordWait;}else{h.intent='Осмотреться после переправы';h.reason='Берег достигнут. Теперь можно решить, куда идти дальше.';h.action='ПУТЬ';}h.lastAction='walk';ctx.log(s,'Брод позади. Под ногами снова твёрдая земля.','travel');}else{h.lastAction='travel';h.action='ПЕРЕПРАВА';h.intent='Перейти брод';h.reason='Он нащупывает дно и осторожно переходит к другому берегу.';}return true;}
export function heroFordProgress(s,ctx){const h=s.hero;if(!h.fordCrossing)return false;const r=fordPassage(s,h,h.fordCrossing.to,h.fordCrossing.arrivalX);if(['crossing','arrived','held'].includes(r.status))return heroResult(s,r,ctx);h.lastAction='wait';if(r.status==='aborted')ctx.log(s,r.reason,'travel');return true;}
export function heroFordGate(s,next,arrivalX,ctx){const h=s.hero,r=fordPassage(s,h,next,arrivalX);if(r.status==='clear'){if(h.goal?.fordWait&&h.goal.fordTaskView){restoreView(h,h.goal.fordTaskView);delete h.goal.fordWait;delete h.goal.fordTaskView;}return false;}if(r.started){Object.assign(r.crossing,h.goal?.fordTaskView||{intent:h.intent,reason:h.reason,action:h.action});r.crossing.goalTag=taskTag(h.goal);}if(['crossing','arrived','held'].includes(r.status))return heroResult(s,r,ctx);
 if(r.status==='closed'){const g=h.goal;g.fordTaskView ||= {intent:h.intent,reason:h.reason,action:h.action};const choice=fordChoice(s,h,g.area,r,{avoid:ctx.fordAvoided?(id=>ctx.fordAvoided(s,id)):undefined});h.lastAction='wait';
  if(choice.kind==='bypass'){g.fordDetour={target:g.area,path:choice.path};h.intent='Обойти высокий брод';h.reason='Он помнит обход. Дорога длиннее, зато не придётся ждать у воды.';ctx.log(s,`${h.name} сворачивает на знакомую дорогу в обход брода.`,'plan');}
  else if(choice.kind==='wait'){g.fordWait={edge:r.edge,expected:choice.expected};h.intent='Дождаться мелкой воды';h.reason='Вода ещё высока. По зарубкам на столбе он ожидает скорый спад, но мог ошибиться.';if(g.fordNotice!==r.edge){g.fordNotice=r.edge;ctx.log(s,`${h.name} ждёт у зарубленного столба. Кажется, вода скоро спадёт.`,'travel');}}
  else{h.goal=null;h.intent='Отложить переправу';h.reason='Он не готов ждать на берегу. Сначала займётся более насущным делом.';ctx.log(s,`${h.name} откладывает переправу: ожидание сейчас обойдётся слишком дорого.`,'plan');}
 }else{h.lastAction='wait';h.goal=null;ctx.log(s,'На этом участке он не находит надёжного прохода. Пора сменить планы.','travel');}return true;
}
// Caller already owns the person's one action and movement/cargo. This adapter
// never locates the person or transfers goods, including on the arriving tick.
export function npcFordGate(s,p,to,arrivalX,holder,target,{carrier=false,cargoFood=0}={}){
 if(!p.roadTransit&&quakeBlocked(s,p.area,to)){observeRupture(s,p,p.area,to,{atGate:true});return {status:'unavailable',reason:'rupture'};}
 const metric=npcMetricGate(s,p,to,arrivalX,{carrier,cargoFood,canCamp:holder?.movement==='physical'&&s.society.journeys.includes(holder)});if(metric)return metric;
 if(p.liftTransit||liftAt(s,p.area,to))return npcLiftPassage(s,p,to,arrivalX);
 const r=fordPassage(s,p,to,arrivalX,{carrier});if(r.status!=='closed')return r;
 const choice=fordChoice(s,p,target,r,{carrier,cargoFood});if(choice.kind==='bypass')return {status:'bypass',path:choice.path};if(choice.kind==='defer')return {status:'defer',until:choice.until};return {status:'waiting',expected:choice.expected};
}
