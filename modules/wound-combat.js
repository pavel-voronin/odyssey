import {combatOptions} from './combat-judgment.js';
import {seriousWound} from './wound-care-state.js';
export function woundCombatChoice(s,e,choice){
 const h=s.hero,p=s.people[h.lineage];if(!seriousWound(s,p))return choice;
 const options=choice?.options||combatOptions(s,e);if(options.some(o=>o.win&&o.reply.max===0)||h.personality.courage>=.7&&h.hp>=h.maxHp*.35)return choice;
 return {action:'flee',reason:'Тяжёлая рана требует ухода. Продолжение боя помешает восстановлению.',retreatBlocked:false,attackReply:options[0].reply,selectedReply:null,options,selected:'flee'};
}
