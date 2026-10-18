import {localContact} from './modules/npc-contacts.js';
import {observeExistingPerson,createNextStory} from './engine.js';
import {hasDue,restartClock} from './clock.js';
import {personLocation} from './person-location.js';

// Player observation knowledge is separate from every body's private knowledge.
export function rememberObservers(s){
 const knowledge=s.observerKnowledge ||= {version:1,people:{}};
 const remember=(id,observed=false)=>{const p=s.people[id];if(!p)return;const k=knowledge.people[id] ||= {name:p.name};if(observed)k.observed=true;};
 for(const h of Object.values(s.actorStates||{}))remember(h.lineage,true);
 for(const id of s.hero.memory.people)remember(id);
 if(!s.hero.transit)for(const p of Object.values(s.people))if(localContact(s,p.id,s.hero.area)){
  remember(p.id);Object.assign(knowledge.people[p.id],{name:p.name,seen:s.tick,place:s.areas[s.hero.area].name});
 }
 return knowledge;
}
export function observablePerson(s,id){
 const p=s.people[id],h=s.actorStates?.[id];
 if(!p?.alive||!Number.isFinite(p.health)||p.health<=0||p.role==='ребёнок'||p.agenda?.job==='student')return false;
 if(h&&!h.alive)return false;
 return Boolean(personLocation(s,id));
}
export function observerChoices(s){
 const knowledge=rememberObservers(s);
 return Object.entries(knowledge.people).filter(([id])=>id!==s.hero.lineage&&observablePerson(s,id)).map(([id,k])=>({
  id,name:k.name,description:!s.hero.transit&&localContact(s,id,s.hero.area)?'Рядом · '+s.areas[s.hero.area].name:k.observed?'Уже наблюдали':k.place?'Последняя встреча: '+k.place:'Знакомый житель'
 })).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
}
export function observerRequest(s,kind,person,target){
 rememberObservers(s);
 if(kind!=='new'&&(kind!=='person'||person===s.hero.lineage||!s.observerKnowledge.people[person]||!observablePerson(s,person)))return null;
 return {kind,person,from:s.hero.lineage,sequence:s.observation.sequence,target};
}
export function commitObserverRequest(s,clock,request,now){
 if(!request||hasDue(clock,request.target))return false;
 if(request.from!==s.hero.lineage||request.sequence!==s.observation.sequence)return false;
 if(request.kind==='person'&&(!s.observerKnowledge?.people[request.person]||!observablePerson(s,request.person)))return false;
 const changed=request.kind==='new'?createNextStory(s,{allowLiving:true}):request.kind==='person'&&observeExistingPerson(s,request.person);
 if(!changed)return false;rememberObservers(s);restartClock(clock,now);return true;
}
