import {woundForce} from './wound-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {npcController} from './npc-control.js';
import {partyAvailable} from './party-needs.js';
import {fieldMedicineCost} from './skill-branches.js';
import {partyCombatOn,PARTY_COMBAT_POLICY,PARTY_PASSIVE_PHASES} from './party-combat-policy.js';
import {planPairCombat} from './party-combination-state.js';

export {partyCombatOn,PARTY_COMBAT_POLICY};
export function localCombatCompanions(s){
 if(!partyCombatOn(s)||!s.hero.alive||s.hero.hp<=0||s.hero.transit)return [];
 const a=s.areas[s.hero.area];
 return s.hero.companions.filter(c=>{
  const p=s.people[c.person];
  return p?.alive&&p.health>0&&c.hp>0&&p.area===s.hero.area&&Number.isFinite(p.x)&&physicalDistance(a,p.x,s.hero.x)<=PARTY_COMBAT_POLICY.reach&&npcController(s,p)==='party';
 });
}
export function presentCombatCompanions(s){return localCombatCompanions(s).filter(c=>{
 const p=s.people[c.person],claim=p.actionControl;
 // Upkeep and observation are passive phases. An accepted lesson, watch or
 // another active operation already owns this body turn, including its cost.
 const busy=claim?.tick===s.tick&&(claim.owner!=='party'||claim.phases.some(phase=>!PARTY_PASSIVE_PHASES.includes(phase)));
 const cared=p.partyNeeds?.tick===s.tick&&['medicine','eat'].includes(p.partyNeeds.activity);
 return !busy&&!cared&&partyAvailable(s,c)&&!p.needs.sleeping&&p.needs.energy>=25;
});}
// Human participants now spend their own action. Creatures retain their existing
// contribution until they acquire a separate physical action contract.
export function aggregatePartyAttack(s){
 if(!enabled(s,'companions'))return 0;
 return s.hero.companions.filter(c=>partyAvailable(s,c)&&(!partyCombatOn(s)||!c.person)).reduce((n,c)=>n+c.attack,0);
}
function knownReply(s,e){
 const w=s.hero.defenseMemory?.warnings?.[e.id],charged=enabled(s,'tactics')&&e.tactic==='charged'&&e.battle?.intent==='strike'&&w?.enemy===e.id&&w.area===s.hero.area&&w.turn===e.battle.turns&&s.tick-w.seen<=1;
 return (e.attack+3)*(charged?3:1);
}
// A read-only projection: no RNG draw, action claim, learned fact or medicine is
// created while the hero forecasts a turn. Healing earlier in this sequence can
// remove the reason for a later guard to cover instead of striking.
export function planPartyCombat(s,e,{skipResponse=false}={}){
 if(!partyCombatOn(s)||!e?.alive||e.resolved)return [];
 const members=presentCombatCompanions(s),hp=new Map([[s.hero.lineage,{hp:s.hero.hp,max:s.hero.maxHp}]]);
 for(const c of localCombatCompanions(s)){const p=s.people[c.person];hp.set(p.id,{hp:p.health,max:p.maxHealth||100});}
 const plan=[];let covering=false;
 for(const c of members){
  const p=s.people[c.person];if(p.partyCombat?.tick===s.tick)continue;
  const cost=fieldMedicineCost(s,p.id),own=hp.get(p.id),targets=[...hp].filter(([,v])=>v.hp>0&&v.hp/v.max<.65).sort((a,b)=>a[1].hp/a[1].max-b[1].hp/b[1].max||a[0].localeCompare(b[0]));
  if(c.healing>=2&&enabled(s,'supply')&&enabled(s,'npc-personal-supplies')&&(p.roadSupplies?.medicine||0)>=cost&&targets.length){
   const [target,state]=targets[0],amount=Math.min(state.max-state.hp,6+c.healing*3);state.hp+=amount;
   plan.push({person:p.id,kind:'heal',target,medicine:cost,energy:PARTY_COMBAT_POLICY.aidEnergy,amount,reason:'Видит раненого рядом и расходует собственное лекарство вместо удара.'});continue;
  }
  const hero=hp.get(s.hero.lineage),risk=knownReply(s,e)*PARTY_COMBAT_POLICY.coverShare;
  if(!skipResponse&&!covering&&(c.job==='Страж'||p.agenda.job==='guard')&&hero.hp/hero.max<.65&&own.hp/own.max>=.65&&p.needs.energy>=34&&c.loyalty>=35&&risk<c.hp*.65){
   covering=true;plan.push({person:p.id,kind:'cover',target:s.hero.lineage,energy:PARTY_COMBAT_POLICY.coverEnergy,reason:'Союзник ранен; собственных сил достаточно, а замеченный риск прикрытия приемлем.'});continue;
  }
  if(c.attack>0)plan.push({person:p.id,kind:'attack',target:e.id,energy:PARTY_COMBAT_POLICY.attackEnergy,attack:c.attack,reason:own.hp/own.max<.65?'Бережёт себя: прикрытие слишком рискованно, остаётся обычный удар.':'Вместо помощи выбирает собственный удар.'});
 }
 const pair=planPairCombat(s,e,members,{skipResponse,coverRisk:knownReply(s,e)*PARTY_COMBAT_POLICY.coverShare});
 // A real urgent dressing by either member takes precedence over practice.
 return (pair.length&&!plan.some(a=>a.kind==='heal'&&pair.some(p=>p.person===a.person))?[...pair,...plan.filter(a=>!pair.some(p=>p.person===a.person)&&a.kind!=='cover')]:plan).map(a=>a.attack===undefined?a:{...a,attack:Math.max(1,Math.floor(a.attack*woundForce(s,s.people[a.person])))});
}
