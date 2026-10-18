import {enabled} from '../rules.js';
import {YEAR_TICKS,DAY_TICKS} from '../calendar-units.js';
import {selfDrivenActor} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {physicalDistance} from '../geometry.js';
export const FEAST={day:80,offset:79*DAY_TICKS+160,prepare:96,delay:32,duration:96,food:6,budget:8};
export const feastsOn=s=>enabled(s,'local-feasts');
export const feastDate=year=>year*YEAR_TICKS+FEAST.offset;
export const feastActor=(s,id)=>selfDrivenActor(s,id)?(s.hero.lineage===id?s.hero:s.actorStates[id]):null;
export function feastBody(s,p){const h=feastActor(s,p.id);return h&&!h.transit?{area:h.area,x:h.x}:localContact(s,p.id,p.area);}
export function feastNear(s,p,area=s.localFeast?.area){const b=feastBody(s,p);return Boolean(b&&b.area===area&&physicalDistance(s.areas[area],b.x,42)<=12);}
export function feastReason(s,p){
 const h=feastActor(s,p.id),n=p.needs;
 if(!p.alive||h?.life.ended||n?.sleeping||(h?h.hp/h.maxHp:p.health/(p.maxHealth||100))<.8||(h?h.energy:n?.energy)<35||(h?h.hunger:n?.hunger)>=60||p.ailment)return 'Сначала здоровье, еда и отдых.';
 if(Object.values(p.familyNeeds?.cases||{}).some(c=>['known','active'].includes(c.status)))return 'Близкому нужна помощь; праздник подождёт.';
 if(h&&(h.combat||h.transit||h.quests.some(q=>q.status==='active')||h.stories.active)||p.personalJourney?.status==='active'||p.forging?.active)return 'Сначала принятое дело.';
 return null;
}
