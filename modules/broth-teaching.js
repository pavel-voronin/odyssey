import {cookingEnabled,culinary,BROTH_RECIPE,safeCooking} from './hearth-food.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {npcController} from './npc-control.js';
export function brothTeacherKnows(p){return Boolean(p?.foodCooking?.recipes[BROTH_RECIPE]||p?.agenda?.job==='healer'||p?.role==='Хозяин трактира');}
export function availableBrothTeacher(s,p){return Boolean(cookingEnabled(s)&&p?.alive&&p.role!=='ребёнок'&&brothTeacherKnows(p)&&p.health>=(p.maxHealth||100)*.7&&!p.needs?.sleeping&&(p.needs?.energy??100)>=25&&(p.needs?.hunger??0)<65&&!p.agenda?.task&&(!p.toolTeaching||p.toolTeaching.until<s.tick)&&npcController(s,p)==='personal');}
export function brothTeacherTurn(s,p){
 const r=p?.brothTeaching;if(!r)return false;
 const h=s.actorStates?.[r.pupil]||(s.hero.lineage===r.pupil?s.hero:null),position=localContact(s,p.id,r.area);
 if(!availableBrothTeacher(s,p)||r.until<s.tick||!h||!safeCooking(s,h)||h.goal?.kind!=='brothLearn'||h.goal.teacher!==p.id||h.area!==r.area||!position||physicalDistance(s.areas[r.area],h.x,position.x)>9){delete p.brothTeaching;return false;}
 r.turn=s.tick;return true;
}
export function reserveBrothTeacher(s,p,h){
 if(!availableBrothTeacher(s,p)||p.brothTeaching&&p.brothTeaching.until>=s.tick&&p.brothTeaching.pupil!==h.lineage)return false;
 const q=culinary(p);q.recipes[BROTH_RECIPE] ||= {knownAt:s.tick,source:p.agenda.job==='healer'?'occupation/healer':'occupation/innkeeper'};
 p.brothTeaching={pupil:h.lineage,area:h.area,until:s.tick+24};return true;
}
