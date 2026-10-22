import {enabled} from '../rules.js';
import {cookingEnabled} from './hearth-food.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {npcController} from './npc-control.js';
function validNPCPupil(s,p,r){
 if(p.ailment||p.health<(p.maxHealth||100)*.85||(p.needs?.energy??100)<35||(p.needs?.hunger??0)>=55)return null;
 const pupil=s.people[r.pupil],g=pupil?.personalJourney,task=pupil?.agenda?.task;
 if(!['mentor-journeys','companion-goals','people','npc-control','npc-knowledge','npc-contacts'].every(id=>enabled(s,id))||!pupil?.alive||npcController(s,pupil)!=='personal'||g?.kind!=='seekMentor'||g.status!=='active'||g.phase!=='independent'||g.teacher!==p.id||g.skill!=='clamp'||g.abandonAfter<s.tick||task?.kind!=='mentorLesson'||task.target!==r.area||pupil.needs?.sleeping||pupil.health<(pupil.maxHealth||100)*.65||(pupil.needs?.energy??100)<35||(pupil.needs?.hunger??0)>=65)return null;
 const body=localContact(s,pupil.id,r.area),master=localContact(s,p.id,r.area);return body&&master&&physicalDistance(s.areas[r.area],body.x,master.x)<=9?pupil:null;
}
export function reserveNPCToolTeacher(s,teacher,pupil){
 const r={kind:'npc-mentor',pupil:pupil.id,area:pupil.area,until:s.tick+24};
 if(!enabled(s,'property')||!enabled(s,'workshop-tools')||!availableToolMaster(s,teacher)||!validNPCPupil(s,teacher,r)||teacher.toolTeaching&&teacher.toolTeaching.until>=s.tick&&(teacher.toolTeaching.kind!=='npc-mentor'||teacher.toolTeaching.pupil!==pupil.id))return false;
 teacher.toolTeaching=r;return true;
}
export function npcToolTeacherReady(s,teacher,pupil){return Boolean(enabled(s,'property')&&enabled(s,'workshop-tools')&&availableToolMaster(s,teacher)&&validNPCPupil(s,teacher,{pupil:pupil.id,area:pupil.area}));}
export function availableToolMaster(s,p){
 return Boolean(p?.alive&&p.role!=='ребёнок'&&p.health>=(p.maxHealth||100)*.55&&!p.needs?.sleeping&&(p.needs?.energy??100)>=25&&(p.needs?.hunger??0)<65&&npcController(s,p)==='personal'&&!p.agenda?.task&&(!cookingEnabled(s)||!p.brothTeaching||p.brothTeaching.until<s.tick)&&(p.agenda?.job==='artisan'||p.toolSkills?.clamp));
}
// The people controller only needs the shared reservation/receipt contract.
// It must not import the pupil's finances, suppliers or adventure planner.
export function toolTeacherTurn(s,p){
 const r=p.toolTeaching,h=r&&(s.actorStates?.[r.pupil]||(s.hero?.lineage===r.pupil?s.hero:null));if(!r)return false;
 if(r.kind==='npc-mentor'){
  if(!enabled(s,'property')||!enabled(s,'workshop-tools')||r.until<s.tick||!availableToolMaster(s,p)||!validNPCPupil(s,p,r)){delete p.toolTeaching;return false;}
  r.turn=s.tick;return true;
 }
 const pos=localContact(s,p.id,r.area);
 if(!enabled(s,'property')||!enabled(s,'workshop-tools')||r.until<s.tick||!h?.alive||h.transit||h.combat||h.goal?.kind!=='toolLearn'||h.toolTask?.property!==r.property||h.toolTask.episode!==r.episode||!availableToolMaster(s,p)||!pos||h.area!==r.area||physicalDistance(s.areas[r.area],h.x,pos.x)>9){delete p.toolTeaching;return false;}
 r.turn=s.tick;return true;
}
