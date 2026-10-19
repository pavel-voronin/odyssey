import {enabled} from '../rules.js';
import {actualMight,carryActor} from './people-carry-state.js';
import {packView,itemUnits} from './container-state.js';
import {limbCanCarry,limbStride} from './limb-state.js';
import {woundImpairment} from './wound-state.js';
import {remainsMass,carriedRemains} from './remains-mass.js';
export const remainsCarryOn=s=>['remains-carry','remains','people'].every(id=>enabled(s,id));
export function remainsCarryLoad(s,p,b){const h=carryActor(s,p.id);return packView(s,p.id,{passenger:false}).used+Object.values(h?.equipment||{}).filter(Boolean).reduce((n,i)=>n+itemUnits(i),0)+remainsMass(b);}
export function canCarryRemains(s,p,b){return p?.alive&&p.role!=='ребёнок'&&p.health>=(p.maxHealth||100)*.8&&!p.ailment&&limbCanCarry(p)&&limbStride(p)>=.9&&woundImpairment(s,p,'arm')<.2&&woundImpairment(s,p,'leg')<.2&&woundImpairment(s,p,'head')<.2&&['fresh','bones'].includes(b?.stage)&&(!b.burialWork||b.burialWork.person===p.id)&&b.death.anatomy.form!=='ghost'&&actualMight(s,p)>=2&&remainsCarryLoad(s,p,b)<=actualMight(s,p)*2+2&&(!carriedRemains(s,p.id)||carriedRemains(s,p.id)===b)&&p.bodyCarry?.stage!=='carrying';}
