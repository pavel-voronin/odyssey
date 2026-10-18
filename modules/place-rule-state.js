import {enabled} from '../rules.js';
import {areaEnvironment} from '../area-environment.js';
export const placeRulesOn=s=>enabled(s,'place-rules');
export const placeRuleArea=(s,id)=>areaEnvironment(s,s.areas[id]);
export function createPlaceRule(s,a){
 if(!placeRulesOn(s)||a.type!=='forest'||a.interior||a.temporaryCamp||a.localRule||Object.values(s.areas).some(p=>p.localRule))return;
 a.localRule={version:1,kind:'pale-runes',created:s.tick,extraMana:2,source:'terrain-birth'};
}
export function localSpellExtra(s,h,area=h.area){const a=placeRuleArea(s,area);return placeRulesOn(s)&&!h.transit&&a?.localRule?.version===1?a.localRule.extraMana:0;}
export function knownSpellExtra(s,h,area){return placeRulesOn(s)?h.memory.localRules?.[placeRuleArea(s,area)?.id]?.extraMana||0:0;}
