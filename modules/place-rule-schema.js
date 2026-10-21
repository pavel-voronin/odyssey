import {formulaDefinition} from './formula-source.js';
import {SPELLS} from '../content.js';
import {placeRuleArea} from './place-rule-state.js';
export function validatePlaceRules(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
 const areas=Object.values(s.areas).filter(a=>a.localRule!==undefined);if(areas.length>1)fail('localRule.unique');
 for(const a of areas){const r=a.localRule;if(r?.version!==1||r.kind!=='pale-runes'||r.extraMana!==2||r.source!=='terrain-birth'||!tick(r.created))fail(a.id+'.localRule');}
 for(const h of [s.hero,...Object.values(s.actorStates)]){
  const notes=h.memory.localRules;if(notes===undefined)continue;if(!notes||typeof notes!=='object'||Array.isArray(notes))fail(h.lineage+'.localRules');
  for(const [area,n]of Object.entries(notes)){
   const law=s.areas[area]?.localRule;if(!law||n?.version!==1||n.area!==area||!tick(n.seen)||n.seen<law.created||n.sign!=='pale-runes'||n.extraMana!==2||!integer(n.casts)||n.casts>h.magic.casts||!Object.hasOwn(n,'lastCast'))fail(h.lineage+'.localRuleNote');
   const c=n.lastCast;if(c===null){if(n.casts!==0)fail(h.lineage+'.localRuleCasts');continue;}
   if(!n.casts||!tick(c.tick)||c.tick<n.seen||!s.areas[c.atArea]||placeRuleArea(s,c.atArea)?.id!==area||!integer(c.cast,1)||c.cast<n.casts||c.cast>h.magic.casts||!SPELLS.some(sp=>sp.id===c.spell)&&!formulaDefinition(s,c.spell)||!integer(c.base,1)||c.total!==c.base+2*(formulaDefinition(s,c.spell)?2:1)||!Number.isFinite(c.manaBefore)||!Number.isFinite(c.manaAfter)||c.manaAfter<0||c.manaBefore-c.manaAfter<1||c.manaBefore-c.manaAfter+c.charge!==c.total||!integer(c.charge)||c.charge>3||c.charge>0&&typeof c.item!=='string'||c.charge===0&&c.item!==null)fail(h.lineage+'.localRuleCast');
  }
 }
}
