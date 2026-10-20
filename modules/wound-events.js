import {livePhysicalSource} from './physical-strike-source.js';
import {boneBody} from './anatomy-state.js';
import {memoryDamage} from './recollection-state.js';
import {recordFracture,fractureImpairment} from './fracture-state.js';
import {recordLimbLoss} from './limb-events.js';
import {enabled} from '../rules.js';
import {armorCoverage} from './armor.js';
import {woundActor,woundParts} from './wound-state.js';
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
// Receipts follow the one canonical HP debit. This function never deals damage.
export function recordLocalWound(s,p,enemy,{before,after,maximum,area,controller='combat',scarPart=null,tick=s.tick,physical=true},ctx){
 if(!enabled(s,'local-wounds')||tick!==s.tick||!physical||!p?.alive||s.people[p.id]!==p||!livePhysicalSource(s,enemy,area,p)||!enemy?.alive||!enemy?.id||![before,after,maximum].every(Number.isFinite)||maximum<=0||before>maximum||after<0||after>=before)return null;
 const h=woundActor(s,p),party=Boolean(s.hero?.companions.some(c=>c.person===p.id));if((h?h.hp:p.health)!==after||(h?h.area:party?s.hero.area:p.area)!==area)return null;
 const channel=enemy.positionAttack?['shard','melee'].includes(enemy.positionAttack.last?.kind):!['ghost','spirit'].includes(enemy.species);
 if(!channel)return null;
 const damage=before-after,coverage=h?armorCoverage(h):0;
 if(damage<Math.max(2,Math.ceil(maximum*.04))+coverage)return null;
 const id=JSON.stringify([p.id,s.tick,enemy.id,controller]),parts=woundParts(p);if(!parts.length)return null;
 const t=p.localWounds;if(t?.hitTick===s.tick&&(t.hits.includes(id)||t.hits.length>=8))return null;
 const n=hash(s.seed+'/'+id),hint=scarPart==='face'?'head':scarPart;
 const [part,label,role]=parts.find(([part])=>part===hint)||parts[n%parts.length];
 const cut=!boneBody(p)&&!['blunt','impact'].includes(enemy.damageType)&&p.race!=='automaton'&&p.race!=='revenant'&&(enemy.damageType==='cut'||['bandit','skeleton','wolf','rat','dragon'].includes(enemy.species))&&n%4!==0;
 const kind=cut?'cut':'bruise',severity=Math.min(3,Math.max(1,Math.ceil(damage/maximum*8)));
 const state=p.localWounds ||= {version:1,serial:0,active:[],hitTick:s.tick,hits:[],lastTick:s.tick,activity:null,healed:0};
 if(state.hitTick!==s.tick){state.hitTick=s.tick;state.hits=[];}state.hits.push(id);
 let w=state.active.find(w=>w.part===part&&w.kind===kind);
 const cause={id,tick:s.tick,enemy:enemy.id,area,controller,before,after,maximum,...(enemy.person?{person:enemy.person}:{})};
 if(w){w.effectBefore=w.lastHit===s.tick?w.effectBefore:Math.max(w.severity/3*(1-w.function/100),fractureImpairment(s,w));w.severity=Math.min(3,w.severity+severity);w.closure=cut?0:100;w.function=Math.min(w.function,25);w.lastHit=s.tick;w.lastCause=cause;w.bleed=cut?8:0;if(w.dressing)w.dressing.remaining=0;}
 else {w={id:++state.serial,part,label,role,kind,severity,closure:cut?0:100,function:0,bleed:cut?8:0,lastHit:s.tick,effectBefore:0,firstCause:cause,lastCause:cause};state.active.push(w);}
 (s.woundClock ||= {version:1,active:[]}).active.includes(p.id)||s.woundClock.active.push(p.id);
 recordLimbLoss(s,p,w,cause);recordFracture(s,p,w,cause,enemy);memoryDamage(s,p,w,ctx);return w;
}
