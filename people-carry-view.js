import {withLimbLook} from './modules/limb-state.js';
import {personAppearance} from './appearance.js';
import {race} from './content.js';
export function carrySupport(s,h){const p=s.people[h.carriedBy];return p?.bodyCarry?.stage==='carrying'&&p.bodyCarry.passenger===h.lineage?p:null;}
export function paintCarrySupport(scene,s,h,x,ground,phase){const p=carrySupport(s,h);if(!p||p.id===s.hero.lineage)return;const look=withLimbLook(p,personAppearance(s,p)||{}),walking=p.bodyCarry.lastMove===s.tick;scene.person(x,ground,look.cloak||'#ad9872',false,p.facing||h.facing||1,0,false,false,look,s.rules?.lineage===false?null:race(p.race),{kind:walking?'walk':'idle',walking,progress:phase,supportGround:ground});}
export function paintCarriedObserver(scene,s,h,x,ground,phase){const q=s.people[h.lineage]?.bodyCarry,other=q?.stage==='carrying'&&s.actorStates[q.passenger];if(!other?.alive)return;const p=s.people[other.lineage],look=withLimbLook(p,personAppearance(s,p)||{});scene.person(x-(h.facing||1)*7,ground-25,look.cloak||'#a9c686',false,h.facing||1,0,false,true,look,s.rules?.lineage===false?null:race(p.race),{kind:'rest',progress:phase,supportGround:ground});}
