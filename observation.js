import {invalidateNPCControl} from './modules/npc-control.js';
import {initializeActorProjections} from './actor-projection.js';
// A person owns one detailed actor state. hero is the compatibility reference to it.
export function initializeObservation(s){
 const h=s.hero;if(!h?.lineage)return;

 for(const [id,actor]of Object.entries(s.actorStates))if(actor===h&&id!==h.lineage)throw new Error('Личность персонажа не может меняться при смене владельца вещи');
 s.actorStates[h.lineage]=h;
 s.observation ||= {person:h.lineage,sequence:s.generation,started:s.tick};
 invalidateNPCControl(s);s.observation.version=1;s.observation.person=h.lineage;s.observation.sequence ??=s.generation;s.observation.started ??=s.tick;initializeActorProjections(s);
}
export function observingBodyActive(s){return Boolean(s.hero.alive&&!s.hero.life.ended);}
export function syncObservedPerson(s){
 const h=s.hero,p=s.people[h.lineage];if(!p)return;
  if(h.actorMode==='npc')return;
 if(observingBodyActive(s)){p.area=h.area;p.x=h.x;p.health=Math.max(0,Math.ceil((p.maxHealth||100)*h.hp/h.maxHp));p.alive=true;}
}
export function observationPayload(s){
 const other={...s.actorStates};delete other[s.hero.lineage];
 // The observed state is serialized in the current hero slot exactly once.
 return {...s,hero:{...s.hero,actorJournal:undefined},actorStates:other};
}
