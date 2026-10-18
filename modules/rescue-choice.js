import {profile,stat} from './common.js';
export function canPayRansom(s,quote){
 const h=s.hero,fee=quote?.fee;
 return Boolean(Number.isFinite(fee)&&fee>0&&h.gold>=fee&&(h.gold-fee>=3||h.personality.generosity>.8)&&(h.reputation[quote.faction]||0)>-30&&(h.personality.courage<.65||profile(h).skill==='parley'||stat(h,'spirit')>=5));
}
