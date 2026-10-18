import {areaOffset} from './geometry.js';
import {actorPartyLeader,selfDrivenActor} from './actor-projection.js';
const validTransit=(s,t)=>t&&!t.unknown&&s.areas[t.from]&&s.areas[t.to];
// Actual presence may belong to a group or a recorded journey, never the last drawable scene.
export function personLocation(s,id){
 const p=s.people[id];if(!p?.alive)return null;const h=s.actorStates?.[id],leader=actorPartyLeader(s,id);
 if(leader){if(leader.transit)return validTransit(s,leader.transit)?{transit:leader.transit}:null;return s.areas[leader.area]?{area:leader.area,x:leader.x-areaOffset(s.areas[leader.area],4)}:null;}
 if(selfDrivenActor(s,h)&&validTransit(s,h.transit))return {transit:h.transit};
 if(s.areas[p.area])return {area:p.area,x:p.x};
 const journey=s.society.journeys.find(j=>j.person===id&&!j.journeyVersion&&s.areas[j.from]&&s.areas[j.to]);
 return journey?{transit:{from:journey.from,to:journey.to}}:null;
}
