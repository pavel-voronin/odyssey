import {returnSource,returnReason,returnsOn} from './return-state.js';
import {actorView} from '../actor-view.js';
import {physicalDistance} from '../geometry.js';
import {rootWorld} from '../world-ref.js';
import {recordPersonRemains} from './remains.js';
import {selfDrivenActor,syncActiveActor} from '../actor-projection.js';
// A return consumes the existing body; neither an archive nor an estate is an inventory.
export function returnPerson(input,caster,b,task,relic,ctx){
 const s=rootWorld(input),p=s.people[b?.source.id],q=caster.returnRite,a=s.areas[caster.area];
 if(!returnsOn(s)||!returnSource(s,b)||!caster.alive||!q||q.used||q.lastAction!==s.tick||q.task!==task||task.prepared!==3||q.relic!==relic||!returnReason(s,caster,b)||b.position.area!==caster.area||physicalDistance(a,caster.x,b.position.x)>2||!s.areas[relic.area]?.objects.some(o=>o.id===relic.object&&o.kind==='relic'&&o.taken))return false;
 const h=s.actorStates[p.id],episode={version:1,body:b.id,deathId:b.deathId,at:s.tick,caster:caster.id,reason:task.reason,form:'revenant',cohesion:3,spent:0,lastDay:s.tick,price:{...relic,quantity:1}};
 b.returned={person:p.id,at:s.tick,caster:caster.id};b.stage='returned';b.substance.nextDecay=null;
 p.returnEpisode=episode;p.alive=true;p.health=Math.max(1,Math.ceil((p.maxHealth||100)*.3));p.race='revenant';p.status='resident';p.area=b.position.area;p.x=b.position.x;p.agenda.task=null;p.needs.hunger=0;p.needs.energy=40;delete p.remainsId;
 const area=s.areas[p.area];area.population ||= [];if(!area.population.includes(p.id))area.population.push(p.id);
 if(h){h.alive=true;h.hp=h.maxHp*p.health/(p.maxHealth||100);h.race=p.race;h.hunger=0;h.energy=40;h.area=p.area;h.x=p.x;h.goal=null;h.combat=null;h.transit=null;delete h.remainsId;
  if(s.observation?.person!==p.id||h.actorMode==='npc'){h.actorMode='npc';s.nextNPCObservation=Math.max(s.nextNPCObservation||0,...Object.values(s.actorStates).filter(v=>v.actorGeneration<0).map(v=>-v.actorGeneration))+1;h.actorGeneration=-s.nextNPCObservation;h.npcProfile ||= {version:1,job:p.agenda.job,observedAt:s.tick};}
  else {h.actorGeneration=s.nextGeneration++;}
  h.life={phase:h.actorMode==='npc'?'resident':'wandering',ended:false,home:null,motive:'Вернулся из смерти',reflectAfter:s.tick+6000,episode:{at:s.tick,deathId:b.deathId,body:b.id}};
  h.lastAction='rest';h.intent='Прийти в себя после обряда';h.reason=task.reason;
  if(s.observation?.person===p.id){s.generation=h.actorGeneration;delete s.observation.focus;}
  if(p.actorLink){Object.assign(p.actorLink,{health:p.health,energy:40,hunger:0,area:p.area,x:p.x});}
  ctx.log(actorView(s,h),h.name+' возвращается в том же теле. Реликвия израсходована; прежняя смерть остаётся в истории.','story');
 }
 s.changes.push({tick:s.tick,text:p.name+' возвращается после обряда '+caster.name+'.'});return true;
}
// Physical consequences continue even if new rituals are disabled. No load-time catch-up.
export function returnedBodyTick(s,ctx){for(const p of Object.values(s.people)){const q=p.returnEpisode;if(!q||!p.alive||s.tick-q.lastDay<240)continue;const days=Math.floor((s.tick-q.lastDay)/240),spent=Math.min(q.cohesion,days);q.cohesion-=spent;q.spent+=spent;q.lastDay+=days*240;if(q.cohesion)continue;
 const h=s.actorStates[p.id];if(h&&selfDrivenActor(s,h)){const view=actorView(s,h);ctx.die(view,{name:'Распад связности возвращённого тела'});syncActiveActor(view,true);}else{p.alive=false;p.health=0;p.status='dead';p.died=s.tick;p.deathCause='Распад связности возвращённого тела';recordPersonRemains(s,p);}
}}
