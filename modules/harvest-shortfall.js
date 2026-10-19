import {localHarvestFailure} from './harvest-failure-state.js';
import {enabled} from '../rules.js';
export function recordHarvestShortfall(s,a,receipt,expected,quantity){
 const e=localHarvestFailure(s,a),owner=s.areas[a.city]||a;
 if(!e||expected<=quantity||!owner.goods)return null;
 return owner.goods.harvestShortfall={version:1,cause:e.id,at:s.tick,area:a.id,receipt:receipt.id,actor:receipt.actor,expected,quantity,missing:expected-quantity};
}
export function sourceHarvestShortfall(s,a){
 if(!enabled(s,'demand-freight')||!enabled(s,'npc-logistics'))return null;
 const owner=s.areas[a.city]||a,r=owner.goods?.harvestShortfall,e=localHarvestFailure(s,a);
 return r&&e?.id===r.cause&&r.at<=s.tick&&s.tick-r.at<=240?r:null;
}
export function shortfallDepartureAllowed(s,a,request){
 const r=request.shortfall;if(!r)return true;const loss=sourceHarvestShortfall(s,a);
 return Boolean(loss&&request.kind==='food'&&r.cause===loss.cause&&r.harvest===loss.receipt&&r.at===s.tick&&r.loaded===request.quantity&&r.loaded>=2&&r.requested>r.loaded&&r.requested<=12&&r.missing===r.requested-r.loaded&&a.civic.food-request.quantity>=request.reserve);
}
