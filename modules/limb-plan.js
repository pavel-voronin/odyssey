import {limbWorkAllows,missingParts} from './limb-state.js';
import {planWork} from './work.js';
export function adaptLimbPlan(s,ctx){const h=s.hero,p=s.people[h.lineage];if(!p.limbLosses||h.goal?.kind!=='work'||limbWorkAllows(p,h.goal.job))return false;h.goal=null;h.workAfter=Math.min(h.workAfter,s.tick);planWork(s,ctx,{interest:true});ctx.log?.(s,'Прежняя тяжёлая работа требует утраченной конечности. Он выбирает доступное дело, сохраняя умения.','plan');return false;}
