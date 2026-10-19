import {remainsLocation} from '../remains-position.js';
import {physicalDistance,areaStep} from '../geometry.js';
import {rootWorld} from '../world-ref.js';
import {bodyRemains} from './remains.js';
import {localContact} from './npc-contacts.js';
import {remainsCycleOn,edibleRemains,substanceEvent} from './remains-cycle-state.js';
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
export function initializePredator(s,a,e){if(!remainsCycleOn(s)||e.predator||!e.alive||e.person||e.species!=='wolf'||e.shape!=='wolf')return;const initial=Number.isSafeInteger(e.initialHunger)&&e.initialHunger>=0&&e.initialHunger<=100?e.initialHunger:hash(s.seed+'/'+e.id)%80;e.predator={version:1,born:s.tick,initial,hunger:initial,accrued:0,overflow:0,nutrition:0,energy:100,portions:0,lastTick:s.tick-1,goal:null,history:[]};}
function note(s,e,kind,b=null){const q=e.predator;q.history.push({tick:s.tick,kind,body:b?.id||null});if(q.history.length>8)q.history.shift();}
function threat(s,a,e){if(a.objects.some(o=>o!==e&&o.kind==='enemy'&&o.alive&&!o.resolved&&!o.hidden&&o.species!=='wolf'&&physicalDistance(a,e.x,o.x)<=12))return true;const ids=new Set([...(a.population||[]),...a.objects.map(o=>o.person).filter(Boolean)]);for(const h of Object.values(rootWorld(s).actorStates||{}))if(h.alive&&h.actorMode!=='npc'&&h.area===a.id&&!h.transit){ids.add(h.lineage);for(const c of h.companions)if(c.person)ids.add(c.person);}return [...ids].some(id=>{const b=localContact(s,id,a.id);return b&&physicalDistance(a,e.x,b.x)<=12;});}
export function predatorCarrionTurn(s,a,e,ctx={}){
 const q=e.predator;if(!q||!remainsCycleOn(s)||!e.alive||e.resolved||ctx.fighting?.has(e.id)||s.tick%4!==0||q.lastTick===s.tick)return false;q.lastTick=s.tick;q.accrued++;q.overflow+=Math.max(0,q.hunger+1-100);q.hunger=Math.min(100,q.hunger+1);
 if(threat(s,a,e)){if(q.goal){note(s,e,'interrupted');q.goal=null;}return false;}
 if(q.energy<20){q.energy=Math.min(100,q.energy+4);note(s,e,'rest');return true;}
 const local=(ctx.bodies||[]).filter(b=>bodyRemains(s,b.id)===b&&edibleRemains(b)&&b.position.area===a.id&&physicalDistance(a,e.x,b.position.x)<=18);
 let b=q.goal&&local.find(b=>b.id===q.goal.body);if(q.goal&&!b){note(s,e,'lost');q.goal=null;return false;}
 if(q.goal&&q.hunger<=24){q.goal=null;return false;}
 if(!q.goal){if(q.hunger<60)return false;b=local.sort((a1,b1)=>physicalDistance(a,e.x,a1.position.x)-physicalDistance(a,e.x,b1.position.x)||a1.id.localeCompare(b1.id))[0];if(!b)return false;q.goal={body:b.id,area:a.id,seen:s.tick};note(s,e,'found',b);}
 if(physicalDistance(a,e.x,b.position.x)>1){e.facing=Math.sign(b.position.x-e.x)||1;e.x+=areaStep(a,e.x,b.position.x,3);q.energy=Math.max(0,q.energy-1);note(s,e,'approach',b);return true;}
 if(!substanceEvent(s,b,'flesh','eaten',1,{kind:'enemy',id:e.id}))return false;const gain=Math.min(24,q.hunger);q.hunger-=gain;q.nutrition+=gain;q.portions++;q.energy=Math.max(0,q.energy-1);note(s,e,'ate',b);const focus=s.observation.focus?.kind==='remains'&&s.remains?.byId[s.observation.focus.body],observer=focus?remainsLocation(s,focus):s.hero;if(observer?.area===a.id&&!observer.transit)ctx.log?.(s,e.name+' съедает часть оставшейся плоти. '+(b.stage==='bones'?'На том же месте остаются кости.':'Остаток туши становится меньше.'),'world',a.id);
 if(q.hunger<=24||!edibleRemains(b))q.goal=null;return true;
}
