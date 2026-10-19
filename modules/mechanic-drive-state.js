import {skillBranchesEnabled} from './skill-branches.js';
import {stateKey} from './action-selection.js';
export function wearLiftDrive(s,n){
 if(n.wear<3||!(skillBranchesEnabled(s)&&s.rules.mechanisms!==false)&&!n.drive||n.drive?.current)return;const d=n.drive ||= {version:1,serial:0,current:null,work:null,jams:[],repairs:[]};
 const part=n.parts[d.serial%2];if(!part)return;d.serial++;const jam={episode:d.serial,part:part.id,at:s.tick,ride:n.id+'/ride/'+n.rides,rides:n.rides,wear:n.wear};d.current=jam;d.work=null;d.jams.push({...jam});if(d.jams.length>8)d.jams.shift();
}

export function driveRetry(s,p){const h=s.actorStates?.[p.id]||(s.hero.lineage===p.id?s.hero:null),role=h?.alive&&!h.life.ended&&h.actorMode!=='npc'?h.profession:null;return stateKey([p.marketCargo?.tools||0,role,p.agenda?.job,p.toolSkills?.clamp,p.skillPractice?.craft?.method?.id,p.skillPractice?.mechanic?.operations.length,p.mechanicMemory?.fitKnowledge,p.skillPractice?.mechanic?.method?.id,p.mechanicMemory?.consents,p.mechanicMemory?.known,s.rules['skill-branches'],s.rules.identity,s.rules.mechanisms]);}
