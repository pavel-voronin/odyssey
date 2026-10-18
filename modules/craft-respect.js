import {enabled} from '../rules.js';
import {areaScale} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {rootWorld} from '../world-ref.js';
const on=s=>enabled(s,'craft-respect')&&enabled(s,'relationships');
export function craftRespect(s,witness,subject){return on(s)?s.people[witness]?.craftRelations?.[subject]?.respect||0:0;}
export function knownCraftsperson(s,p,h){return !on(s)||craftRespect(s,p.id,h.lineage)>=6;}
function relationship(p,id){return(p.craftRelations ||= {})[id] ||= {respect:0};}
function witnessed(s,actor,area,x,id,source){
 if(!on(s))return;const root=rootWorld(s),subject=localContact(root,actor,area),a=root.areas[area];if(!subject||!a||Math.abs(subject.x-x)*areaScale(a)>9)return;
 for(const p of Object.values(root.people)){
  if(p.id===actor||p.role==='ребёнок'||!p.alive||p.health<=0||enabled(root,'npc-needs')&&p.needs?.sleeping)continue;
  const contact=localContact(root,p.id,area);if(!contact||Math.abs(contact.x-x)*areaScale(a)>18)continue;
  const r=relationship(p,actor);if(r.lastWork&&r.lastWork.tick>=root.tick)continue;
  r.respect=Math.min(100,r.respect+6);r.lastWork={id,tick:root.tick,area,source};
 }
}
export function witnessRepair(s,a,o,proof){
 if(!on(s)||o.state!=='intact'||!a.objects.includes(o))return;const event=o.history.at(-1);
 if(event?.kind!=='repair'||event.tick!==s.tick||event.actor!==proof.actor||event.damageAt!==proof.damageAt)return;
 witnessed(s,proof.actor,a.id,o.x,`${o.id}/repair/${proof.damageAt}/${s.tick}/${proof.actor}`,'workshop-repaired');
}
export function witnessRepairWork(s,job){
 if(!on(s)||job.id!=='repair'||s.hero.lastAction!=='work'||s.hero.goal||!(s.hero.workAfter>s.tick))return;
 witnessed(s,s.hero.lineage,s.hero.area,s.hero.x,`${s.hero.lineage}/repair-job/${s.tick}`,'repair-job');
}
export function missedRepairPromise(s,c){
 if(!on(s)||c.accepted===undefined||s.tick<=c.deadline||!s.people[c.client]?.alive||!s.actorStates[c.helper]?.alive)return false;
 const p=s.people[c.client],r=relationship(p,c.helper);if(r.lastPromise?.tick>=c.deadline||r.lastPromise?.id===c.id)return false;
 (p.agenda.bonds ||= {})[c.helper]=Math.max(-100,(p.agenda.bonds[c.helper]||0)-4);
 r.lastPromise={id:c.id,tick:s.tick,deadline:c.deadline,outcome:'missed'};return true;
}
