import {carriedFood} from './stores.js';
import {partyPrepared} from './party-needs.js';
import {actionKey,deferMethod,parkMethod} from './action-selection.js';

// Uses the same personal unavailable-method memory as ordinary selection.
export function dependency(s,parent,child,revision,requirement=null){
 if(!parent||!child||actionKey(parent)===actionKey(child))return;
 const h=s.hero,m=h.actionSelection ||= {version:1,deferred:[],attempts:[],last:null};
 m.dependencies ||= [];
 const key=actionKey(parent),next=actionKey(child),old=m.dependencies.find(e=>e.key===key&&e.child===next);
 if(!old){m.dependencies=m.dependencies.filter(e=>e.key!==key);m.dependencies.push({key,child:next,parent:JSON.parse(JSON.stringify(parent)),at:s.tick,requirement});if(m.dependencies.length>8)m.dependencies.shift();}
 deferMethod(h,parent,{status:'blocked',reason:'Для дела нужен исполнимый подготовительный шаг: '+child.kind+'.',retryOn:'dependency-resources'},revision(s,parent),s.tick);
}
function reject(s,g,r,revision){
 const h=s.hero;deferMethod(h,g,r,revision(s,g),s.tick);
 // Propagate to bounded canonical parents, preserving their exact partial work.
 const seen=new Set([actionKey(g)]);
 for(let i=0;i<8;i++){
  const link=h.actionSelection?.dependencies?.find(e=>seen.has(e.child)&&!seen.has(e.key));if(!link)break;
  seen.add(link.key);deferMethod(h,link.parent,{...r,reason:'Подготовка недоступна: '+r.reason},revision(s,link.parent),s.tick);
 }
 h.reason=r.reason;h.goal=null;
}
// Every transformation is followed by fresh admission. Four transitions are a
// bound on evaluation, never a budget of four physical actions.
export function admitAction(s,{assess,revision,select,transform=()=>false,progress,accepted=()=>{}}){
 const h=s.hero,seen=new Set();let transitions=0;
 while(h.goal){
  const g=h.goal,key=actionKey(g)+'/'+revision(s,g),r=assess(s,g);
  if(seen.has(key)||transitions>=4){reject(s,g,{status:'blocked',reason:seen.has(key)?'Подготовительная зависимость образует неизменный цикл.':'Предел четырёх замен шага: требуется другое доступное дело.',retryOn:'dependency-resources'},revision);select(s);return false;}
  seen.add(key);
  if(!['ready','progressing','waiting'].includes(r.status)){
   if(r.status==='blocked')reject(s,g,r,revision);else h.goal=null;
   const before=progress(s,g);if(select(s)||before!==progress(s,g))return false;
   transitions++;continue;
  }
  if(r.status==='waiting')return false;
  if(r.status==='progressing'){accepted(s,g);return true;}
  const before=progress(s,g);transform(s);
  if(before!==progress(s,g))return false;
  if(h.goal&&h.goal!==g){dependency(s,g,h.goal,revision);transitions++;continue;}
  if(!h.goal)return false;
  accepted(s,h.goal);return true;
 }
 return false;
}
export function preparationAccepted(s,g,log){
 const h=s.hero,last=h.planning.last,link=h.actionSelection?.dependencies?.find(e=>e.child===actionKey(g)&&e.requirement);
 if(!last||!link||last.accepted===actionKey(g))return;
 last.accepted=actionKey(g);log(s,`${h.name} выбирает доступную подготовку: ${h.intent}.`,'plan');
}
export function preparationProgress(s,g){
 const h=s.hero,m=h.actionSelection;if(!m?.dependencies)return;
 for(const link of [...m.dependencies]){
  const need=link.requirement;if(!need||link.child!==actionKey(g)&&g.preparation?.parent!==link.key||h.energy<need.energy||h.hp<need.health||h.magic.mana<need.mana)continue;
  if(!partyPrepared(s,need)||need.rations!==undefined&&carriedFood(s.people[h.lineage],h.inventory)<need.rations)continue;
  if(h.planning.last){h.planning.last.prepared=true;h.planning.preparations++;}
  m.dependencies=m.dependencies.filter(e=>e!==link);m.deferred=m.deferred.filter(e=>e.key!==link.key);parkMethod(h,link.parent);
 }
}
