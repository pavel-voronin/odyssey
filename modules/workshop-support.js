import {takeGoods} from './goods.js';
import {setActorMoney} from '../actor-projection.js';
import {reservedRepair} from './workshop-contract-state.js';
export function supportWorkshopRepair(s,h,p,a,o,ctx){
 if(!a?.civic||o?.owner!==p.id||o.state!=='burned'||o.repair?.materials||reservedRepair(s,o,p.id)||a.civic.tools<1||h.gold<38||ctx.maySpend&&!ctx.maySpend(s,'investment-help',18,ctx))return null;
 const before=a.civic.tools;takeGoods(s,a,'tools',1,{reason:'supported-repair',actor:h.lineage});setActorMoney(s,s.people[h.lineage],h.gold-18);a.civic.treasury+=18;o.repair={materials:true,payer:h.lineage,paidAt:s.tick,remaining:3};
 return {kind:'workshop',at:s.tick,by:h.lineage,amount:18,source:a.id,toolsBefore:before,toolsAfter:a.civic.tools};
}
