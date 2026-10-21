import {heroLevel} from './progression-state.js';
import {socketReduction} from './socket-state.js';
import {weaponBody} from './limb-state.js';
import {woundForce} from './wound-state.js';
import {coverBlocks,positionedEnemy} from './position-state.js';
import {physicalDistance} from '../geometry.js';
import {wardDamage} from './guardian-state.js';
import {enabled} from '../rules.js';
import {braceDamage,braceCost} from './brace.js';
import {ELEMENTS,spellChannel} from './elements.js';
import {activePower,hasCondition,profile,stat} from './common.js';
import {itemBonus} from './inventory.js';
import {enchantmentStrength} from './enchantments.js';
import {partyAvailable} from './party-needs.js';
import {aggregatePartyAttack,planPartyCombat} from './party-combat-state.js';
import {combatProtection} from './combat.js';
import {tacticalResponseValue} from './tactics.js';
import {mutationResponseValue} from './mutations.js';
import {legacyArmorDefense} from './armor.js';
import {styleDamage,weaponStylesOn} from './weapon-styles.js';

// An untested resistance remains a range over known world rules. The actual
// enemy.element and future RNG are deliberately not used for outgoing damage.
export function knownDamageRates(s,e,channel){
 if(!enabled(s,'elements'))return {min:1,max:1,known:true};
 const learned=s.hero.memory.threats?.[e.id]?.rates?.[channel];
 if(Number.isFinite(learned))return {min:learned,max:learned,known:true};
 const possible=Object.values(ELEMENTS).map(element=>element.rates[channel]??1);
 return {min:Math.min(...possible),max:Math.max(...possible),known:false};
}
function againstEnemy(s,e,min,max,channel){
 const rates=knownDamageRates(s,e,channel);
 min=Math.max(min>0?1:0,Math.round(min*rates.min));max=Math.max(max>0?1:0,Math.round(max*rates.max));
 if(channel==='physical'){
  if(enabled(s,'mutations')&&e.mutation==='shell'){min=Math.max(1,min-2);max=Math.max(1,max-2);}
  if(enabled(s,'tactics')&&e.tactic==='warden'&&e.battle?.intent==='guard'){min=Math.max(min>0?1:0,Math.round(min*.5));max=Math.max(max>0?1:0,Math.round(max*.5));}
  if(activePower(s,e,'temporal')&&profile(s.hero).skill!=='time'||enabled(s,'mutations')&&e.mutation==='phase')min=0;
 }
 min=wardDamage(s,e,min,channel,true);max=wardDamage(s,e,max,channel,true);
 return {min,max,channel,knownRate:rates.known};
}
export function partyDamageRange(s,e,options={}){
 const total={min:0,max:0};
 for(const action of planPartyCombat(s,e,options))if(['attack','paired-attack'].includes(action.kind)){
  const raw=activePower(s,e,'armored')?Math.max(1,action.attack-3):action.attack,range=againstEnemy(s,e,raw,raw,'physical');
  if(activePower(s,e,'temporal'))range.min=0;
  total.min+=range.min;total.max+=range.max;
 }
 return total;
}
export function weaponDamageRange(s,e,style=null){
 const h=s.hero,p=profile(h);let min=4+weaponBody(s,h).weapon*3+Math.floor(heroLevel(h)/2)+p.attack+itemBonus(weaponBody(s,h),'attack')+(enabled(s,'identity')?Math.floor(stat(weaponBody(s,h),'might')/3):0);
 if(p.skill==='magic')min+=Math.floor(stat(h,'wit')/2)+itemBonus(h,'magic');
 if(p.skill==='beast'&&e.tags?.includes('beast'))min+=3;
 if(p.skill==='spirit'&&e.tags?.includes('spirit'))min+=4;
 if(hasCondition(h,'inspiration'))min+=2;
 let max=min+3;
 if(hasCondition(h,'curse')){min=Math.max(1,min-2);max=Math.max(1,max-2);}
 min=styleDamage(min,weaponStylesOn(s)?style:null);max=styleDamage(max,weaponStylesOn(s)?style:null);
 min=Math.max(1,Math.floor(min*woundForce(s)));max=Math.max(1,Math.floor(max*woundForce(s)));
 const help=aggregatePartyAttack(s);min+=help;max+=help;
 if(activePower(s,e,'armored')&&p.skill!=='magic'){min=Math.max(1,min-3);max=Math.max(1,max-3);}
 const curse=enchantmentStrength(h,'curse'),spirit=enchantmentStrength(h,'spirit');min+=curse;max+=curse;
 if(spirit&&(e.tags?.includes('spirit')||e.tags?.includes('magic'))){min+=spirit*2;max+=spirit*2;}
 const luck=enchantmentStrength(h,'luck');if(luck)max+=2+luck;
 const personal=againstEnemy(s,e,min,max,'physical'),party=partyDamageRange(s,e);return {...personal,min:personal.min+party.min,max:personal.max+party.max};
}
export function spellDamageRange(s,e,spell){
 const power=spell.id==='roots'&&e.tags?.includes('construct')?Math.round(spell.effectPower*1.25):spell.effectPower;
 const personal=againstEnemy(s,e,power,power,spellChannel(spell)),party=partyDamageRange(s,e,{skipResponse:spell.kind==='time'});return {...personal,min:personal.min+party.min,max:personal.max+party.max};
}
export function incomingReply(s,e,{hp=s.hero.hp,blessed=hasCondition(s.hero,'blessing'),enemyHp={min:e.hp,max:e.hp},echo={min:e.battle?.echo||0,max:e.battle?.echo||0},skip=false,brace=false,exposed=false,mana=s.hero.magic.mana}={}){
 const h=s.hero,replyMana=Math.max(0,mana-(brace?braceCost(s).mana:0)-(enabled(s,'tactics')&&enabled(s,'magic')&&e.tactic==='leech'?4:0)),shield=enchantmentStrength(h,'blessing'),dodge=enabled(s,'lineage')&&h.race==='halfling'?.1:0,low=[],high=[];
 const protect=(raw,targetHp)=>{
  if(!raw)return 0;
  let damage=combatProtection(s,e,Math.max(1,raw-legacyArmorDefense(h)),{blessed,enemyHp:targetHp});
  damage=Math.max(1,damage-shield);damage-=socketReduction(s,damage,{mana:replyMana});if(enabled(s,'lineage')&&h.race==='orc')damage=Math.max(1,damage-1);return braceDamage(s,e,damage,{preview:brace});
 };
 for(let roll=0;roll<4;roll++){
  const distant=positionedEnemy(s,e)&&(!s.areas[h.area]?.objects.some(body=>body.kind==='enemy'&&body.id===e.id)||physicalDistance(s.areas[h.area],h.x,e.x)>e.positionAttack.range),blocked=coverBlocks(s,e,h,{exposed});
  const raw=skip||distant||blocked?0:tacticalResponseValue(s,e,e.attack+roll,{hp});
  low.push(skip||distant||blocked?0:protect(mutationResponseValue(s,e,raw,echo.min),enemyHp.max));
  high.push(skip||distant?0:protect(mutationResponseValue(s,e,raw,echo.max),enemyHp.min));
 }
 return {min:dodge?0:Math.min(...low),hitMin:Math.min(...low),max:Math.max(...high),survivalLow:dodge+(1-dodge)*high.filter(d=>d<hp).length/4,survivalHigh:dodge+(1-dodge)*low.filter(d=>d<hp).length/4,lethalPossible:high.some(d=>d>=hp),lethalOnEveryHit:low.every(d=>d>=hp),dodgeChance:dodge};
}
