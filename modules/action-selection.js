// A goal is an executable method, never ownership of the underlying affair.
// Evaluators are pure; only the ordinary selected planner/action may mutate.
export const ACTION_STATUSES=['ready','progressing','waiting','blocked','done','invalid'];
export function stateKey(value){const text=typeof value==='string'?value:JSON.stringify(value);let a=2166136261,b=2246822519;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export const executable=o=>o?.available!==false&&!['waiting','blocked','done','invalid'].includes(o?.status||o?.readiness?.status);
export function availableAffairs(options){return options.filter(executable);}
export function actionKey(g){return [g.quest||g.commitment||g.service||g.story||'personal',g.kind,g.area,g.object||g.person||g.property||g.job||''].join('/');}
export function deferMethod(h,g,result,signature,tick){
 const m=h.actionSelection ||= {version:1,deferred:[],attempts:[],last:null};
 const key=actionKey(g),old=m.deferred.find(e=>e.key===key);if(old?.signature===signature&&old.reason===result.reason)return old;
 m.deferred=m.deferred.filter(e=>e.key!==key);m.deferred.push({key,area:g.area,kind:g.kind,step:JSON.parse(JSON.stringify(g)),at:tick,reason:result.reason,retryOn:result.retryOn||'related-change',signature});if(m.deferred.length>8)m.deferred.shift();
 m.last={tick,key,status:'blocked',reason:result.reason};
}
export function deferredMethod(h,g,signature){return h.actionSelection?.deferred.find(e=>e.key===actionKey(g)&&e.signature===signature)||null;}
export function parkMethod(h,g){const m=h.actionSelection ||= {version:1,deferred:[],attempts:[],last:null};m.paused ||= [];m.paused=m.paused.filter(e=>actionKey(e)!==actionKey(g));m.paused.push(JSON.parse(JSON.stringify(g)));if(m.paused.length>8)m.paused.shift();}
export function reconsiderMethods(s,assess,revision){
 const h=s.hero,m=h.actionSelection;if(!m||!h.goal||h.combat||h.transit||h.carriedBy||['rest','campPitch','provision','eat','forage','brothEat','patientClinic'].includes(h.goal.kind))return false;
 const current=h.goal,rank=current.selectionOrder??0,options=m.deferred.filter(e=>e.signature!==revision(s,e.step)&&assess(s,e.step).status==='ready').sort((a,b)=>(a.step.selectionOrder??0)-(b.step.selectionOrder??0)||a.at-b.at||a.key.localeCompare(b.key));
 const chosen=options.find(e=>(e.step.selectionOrder??0)<rank||['routeWait','localRecovery','leisure','directionInspect'].includes(current.kind));if(!chosen)return false;
 m.paused ||= [];m.paused=m.paused.filter(e=>actionKey(e)!==actionKey(current));m.paused.push(JSON.parse(JSON.stringify(current)));if(m.paused.length>8)m.paused.shift();
 h.goal={...chosen.step,started:s.tick};m.deferred=m.deferred.filter(e=>e!==chosen);h.intent='Вернуться к доступному делу';h.reason='Изменилась относящаяся причина. Сохранённые шаги прежнего дела можно продолжить.';return true;
}
export function executionResult(h,g,before,after,tick,{status=null,reason=null,retryOn=null,finiteWaiting=false,attemptBasis=after}={}){
 const m=h.actionSelection ||= {version:1,deferred:[],attempts:[],last:null},key=actionKey(g);
 let result=status;if(!result){if(before!==after)result='progressed';else if(h.goal===null)result='completed';else result='interrupted';}
 // The two-attempt adapter is only for handlers without a precise evaluator.
 if(result==='interrupted'&&!finiteWaiting){
  const old=m.attempts.find(e=>e.key===key&&e.basis===attemptBasis),count=(old?.count||0)+1;
  m.attempts=m.attempts.filter(e=>e.key!==key);m.attempts.push({key,basis:attemptBasis,count:Math.min(2,count)});if(m.attempts.length>8)m.attempts.shift();
  if(count>=2){result='blocked';reason ||= 'Обработчик дважды не изменил состояние шага. Нужна новая относящаяся возможность.';retryOn ||= 'related-change';}
 }else m.attempts=m.attempts.filter(e=>e.key!==key);
 m.last={tick,key,status:result,...(reason?{reason}:{}),...(retryOn?{retryOn}:{})};return m.last;
}
