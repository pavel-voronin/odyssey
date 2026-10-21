import {returnedBody} from './return-state.js';
import {enabled} from '../rules.js';
import {nutritionDose,nutritionView,nutritionOn} from './nutrition-state.js';
export function biologicalNeed(s,b){const v=nutritionView(s,b),hunger=returnedBody(s,b)?0:b.hunger??b.needs?.hunger??0,energy=b.energy??b.needs?.energy??100,on=nutritionOn(s,b),food=on&&(hunger>=95||v.deficient),fatigue=on&&(energy<12||Boolean(b.needRest&&energy<b.needRest.energy)),sleep=on&&v.sleep;return {hunger,energy,food,fatigue,sleep,critical:on&&(food||fatigue||sleep),reason:food?v.deficient?'Недоедание: нужен настоящий питательный запас.':'Пустой желудок: нужна настоящая еда или посильный путь к ней.':sleep?'Нужен полноценный сон; короткой передышки уже недостаточно.':fatigue?'Не хватает сил для следующего действия.':'Ближайшей биологической угрозы нет.'};}
export function ordinaryRecovery(s,b,amount){return returnedBody(s,b)||biologicalNeed(s,b).food?0:amount;}
export function biologicalDose(s,b,{native=false}={}){
 if(!native&&b.npcProfile?.controllerTransferredAt!==undefined&&b.actorMode!=='npc'){const p=s.people[b.lineage];p.needs.energy=b.energy;p.needs.hunger=b.hunger;const dose=biologicalDose(s,p,{native:true}),scale=b.maxHp/(p.maxHealth||100);b.energy=p.needs.energy;b.hunger=p.needs.hunger;return {...dose,fresh:dose.fresh||enabled(s,'body'),damage:dose.damage*scale,...(dose.ceiling===undefined?{}:{ceiling:dose.ceiling*scale})};}
 if(!nutritionOn(s,b)||native&&s.tick%8!==0)return {fresh:false,damage:0};
 if(b.needRest&&(b.energy??b.needs?.energy)>=b.needRest.energy)delete b.needRest;
 const dose=nutritionDose(s,b,{native});if(!dose.fresh)return dose;
 // Retain the previous deficit/loss as historical state. New accounting never
 // invents its missing past and uses the one canonical person balance instead.
 const old=b.biology ||= {tick:s.tick,deficit:0,loss:0};old.tick=s.tick;
 if(native)b.needs.loneliness=Math.min(100,(b.needs.loneliness||0)+.4);
 return dose;
}
export const BODY_ENTRIES=Object.freeze({actor:'shared clock / safe-boundary need admission',personal:'shared clock / personal need admission',migration:'shared clock / road needs',party:'shared clock / party needs',orders:'shared clock / road needs',caravan:'shared clock / road needs',journey:'shared clock / road needs',ferry:'shared clock / existing crossing',enemy:'shared clock / immediate threat',injury:'shared clock / supported body',mechanism:'shared clock / release at safe boundary',none:'shared clock / no invented action'});
