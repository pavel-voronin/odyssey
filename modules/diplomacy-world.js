import {registerEraDomain,finishWorldChange,ERA_PAUSE} from './world-changes.js';
import {politicsNetwork,assessPolitics} from './diplomacy-network.js';
import {diplomacyOn,proposals} from './diplomacy-state.js';
registerEraDomain('politics',{capture:politicsNetwork,assess:assessPolitics});
export function diplomacyWorldTick(s){
 if(!diplomacyOn(s))return;for(const q of proposals(s)){const agent=s.people[q.agent];if(!agent?.alive){if(q.status==='implemented'&&q.returnStatus==='pending')q.returnStatus='undelivered';else if(['reported','outbound','await-recipient','returning','await-guard'].includes(q.status)){q.status='failed';q.ended=s.tick;q.reason='Поездка прервана гибелью существующего посланника.';}if(agent?.diplomaticDuty)agent.diplomaticDuty.active=false;}if(q.status!=='implemented')continue;const cause=s.chronology.worldChanges?.causes['cause/'+q.id];if(!cause||cause.period||cause.lastAssessment===s.tick)continue;const pending=cause.status==='stability-pending',last=s.chronology.periodHistory?.entries.filter(e=>e.kind==='historical').at(-1),cooldown=cause.status==='cooldown'&&s.tick>=(last?.startTick??0)+ERA_PAUSE;
 const signature=JSON.stringify([s.graphRevision,s.rules['world-eras'],s.rules['historical-calendar'],s.edges[q.edge]?.commonAccess?.id]);if(q.eraChecked===signature&&!pending&&!cooldown)continue;q.eraChecked=signature;finishWorldChange(s,q.id,{newState:'Все люди могут пользоваться общим въездом без прежней пошлины; мандат введён существующим служителем.',recordOnly:true});}
}
