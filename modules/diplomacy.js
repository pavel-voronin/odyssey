import {enabled} from '../rules.js';
const key=(a,b)=>[a,b].sort().join('|');
export function initializeDiplomacy(s){s.diplomacy ||= {relations:{'crown|tide':-60,'lantern|root':45,'clock|root':-40,'crown|lantern':25},changes:[]};}
export function factionRelation(s,a,b){return a===b?100:s.diplomacy?.relations[key(a,b)]||0;}
export function changeFactionRelation(s,a,b,amount,reason){
  if(!enabled(s,'diplomacy')||a===b)return;
  initializeDiplomacy(s);const pair=key(a,b);s.diplomacy.relations[pair]=Math.max(-100,Math.min(100,factionRelation(s,a,b)+amount));
  s.diplomacy.changes.push({tick:s.tick,a,b,amount,reason});if(s.diplomacy.changes.length>80)s.diplomacy.changes.shift();
}
export function reputationShift(s,id,amount){
  if(!enabled(s,'factions')||!id)return;
  const h=s.hero;h.reputation[id]=(h.reputation[id]||0)+amount;
  if(!enabled(s,'diplomacy'))return;
  initializeDiplomacy(s);
  for(const other of Object.keys(h.reputation)){
    if(other===id)continue;const relation=factionRelation(s,id,other);
    const shift=Math.trunc(amount*relation/180);if(shift)h.reputation[other]+=shift;
  }
}
