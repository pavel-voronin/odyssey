import {selfDrivenActor} from '../actor-projection.js';
import {registerEraDomain,finishWorldChange,ERA_PAUSE} from './world-changes.js';
import {causewaysOn} from './causeway-state.js';
import {economyNetwork,assessEconomy} from './causeway-economy.js';
registerEraDomain('economy',{capture:economyNetwork,assess:assessEconomy});
export function causewayWorldTick(s){
 for(const e of Object.values(s.edges)){const q=e.causeway;if(!q)continue;
  for(const r of q.passages)if(r.outcome==='crossing'&&s.tick>r.at){const p=s.people[r.actor],h=s.hero.lineage===r.actor?s.hero:s.actorStates?.[r.actor],cross=(selfDrivenActor(s,h)?h:p)?.fordCrossing;if(!p?.alive||cross?.causeway?.id!==r.id){r.outcome='interrupted';r.ended=s.tick;}}
  if(!causewaysOn(s)||s.rules.fords===false||q.status!=='done'||!q.firstDelivery)continue;const cause=s.chronology.worldChanges?.causes['cause/'+q.id];if(!cause||cause.period||cause.lastAssessment===s.tick)continue;
  const signature=JSON.stringify([s.graphRevision,q.firstDelivery.id,q.maintenance.remaining>0,s.rules['world-eras'],s.rules['historical-calendar']]),pending=cause.status==='stability-pending',last=s.chronology.periodHistory?.entries.filter(e=>e.kind==='historical').at(-1),cooldown=cause.status==='cooldown'&&s.tick>=(last?.startTick??0)+ERA_PAUSE;
  if(q.eraChecked===signature&&!pending&&!cooldown)continue;q.eraChecked=signature;finishWorldChange(s,q.id,{newState:'Построенный публичный настил освоен настоящим грузовым рейсом '+q.firstDelivery.convoy,recordOnly:true});
 }
}
