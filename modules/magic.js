import {woundFocus} from './wound-state.js';
import {stoneFunding,spendSpellFunding} from './waystone-state.js';
import {actorFact} from '../actor-facts.js';
import { SPELLS } from '../content.js';
import { enabled,moduleRandom } from '../rules.js';
import { profile,stat } from './common.js';
import { addCondition } from './body.js';
import { itemBonus } from './inventory.js';
import { enchantmentStrength,enchantedSpell } from './enchantments.js';
import { enemyDamage,knownSpellRate } from './adversaries.js';
import { spellChannel } from './elements.js';
import {wearFocusCast} from './item-condition.js';
export function initializeMagic(s,h){
  if(h.magic)return;
  const skill=profile(h).skill;
  h.magic={mana:18,maxMana:18+stat(h,'wit')*2,spells:skill==='magic'?['spark','mend']:skill==='spirit'?['ward']:skill==='time'?['borrow']:[],cooldowns:{},casts:0};
}
export function learnSpell(s,ctx){
  const h=s.hero;if(!enabled(s,'magic')||h.level%2)return;
  const choices=SPELLS.filter(x=>!h.magic.spells.includes(x.id));if(!choices.length)return;
  if(!h.magic.spells.length&&stat(h,'wit')<4&&moduleRandom(s,'magic')>.25)return;
  const spell=choices[Math.floor(moduleRandom(s,'magic')*choices.length)];teachSpell(s,spell.id,ctx,'Опыт');
}
export function teachSpell(s,id,ctx,source='Обучение'){
  const h=s.hero,spell=SPELLS.find(sp=>sp.id===id);if(!enabled(s,'magic')||!spell||h.magic.spells.includes(id))return false;
  h.magic.spells.push(id);h.magic.maxMana+=3;ctx.log(s,`${source} приносит знание: «${spell.name}». ${spell.text}`,'magic');return true;
}
export function magicRest(s){if(enabled(s,'magic'))s.hero.magic.mana=Math.min(s.hero.magic.maxMana,s.hero.magic.mana+4);}
export function availableCombatSpells(s){
  const h=s.hero,m=h.magic;if(!enabled(s,'magic')||!m||!woundFocus(s))return [];
  const time=enchantmentStrength(h,'time');
  return m.spells.map(id=>SPELLS.find(spell=>spell.id===id)).filter(Boolean).map(spell=>{const total=Math.max(1,spell.mana-time),funding=stoneFunding(s,h,total);return {...spell,totalManaCost:total,waystoneCost:funding.charge,waystoneItem:funding.item,manaCost:funding.mana,cooldownTicks:Math.max(1,spell.cooldown-time),effectPower:spell.power+Math.floor(stat(h,'wit')/2)+itemBonus(h,'magic')+(enabled(s,'lineage')&&h.race==='dragonkin'?3:0)};}).filter(spell=>spell.manaCost<=m.mana&&(m.cooldowns?.[spell.id]||0)<=s.tick&&(!['ward','cleanse'].includes(spell.kind)||enabled(s,'body')));
}
export function castInCombat(s,enemy,ctx,requestedSpellId=null){
  const h=s.hero,m=h.magic;if(!enabled(s,'magic'))return false;
  const available=availableCombatSpells(s);
  let spell=requestedSpellId?available.find(spell=>spell.id===requestedSpellId):null;
  if(requestedSpellId&&!spell)return false;
  if(!requestedSpellId)spell=available.find(spell=>spell.kind==='heal'&&h.hp<h.maxHp*.5);
  spell ||= available.find(spell=>spell.kind==='cleanse'&&h.conditions.some(c=>['poison','curse','fever'].includes(c.id)));
  spell ||= available.find(spell=>spell.kind==='pacify'&&h.personality.generosity>.65&&!enemy.tags?.includes('construct'));
  spell ||= available.find(spell=>spell.kind==='ward'&&h.hp<h.maxHp*.8&&!h.conditions.some(c=>c.id==='blessing'));
  const offensive=available.filter(spell=>['damage','time'].includes(spell.kind)).sort((a,b)=>b.power*knownSpellRate(s,enemy,spellChannel(b))-a.power*knownSpellRate(s,enemy,spellChannel(a)));
  if(!spell&&offensive.length&&knownSpellRate(s,enemy,spellChannel(offensive[0]))<.7&&(offensive[0].power+Math.floor(stat(h,'wit')/2)+itemBonus(h,'magic'))*knownSpellRate(s,enemy,spellChannel(offensive[0]))<5+h.weapon*3+itemBonus(h,'attack')){h.reason='Он узнал сопротивление к чарам и выбирает оружие, чтобы не тратить ману.';return false;}
  spell ||= offensive[0];
  if(!spell)return false;
  const castsBefore=m.casts;if(!spendSpellFunding(s,h,spell.totalManaCost,spell.id))return false;m.cooldowns[spell.id]=s.tick+spell.cooldownTicks;m.casts++;m.responseSkipped=spell.kind==='time';h.lastAction='spell';h.action='МАГИЯ';enchantedSpell(s,spell,ctx);
  const power=spell.effectPower;wearFocusCast(s,castsBefore,spell.id,ctx);
  if(spell.kind==='heal'){h.hp=Math.min(h.maxHp,h.hp+power);ctx.log(s,`«${spell.name}»: раны стягиваются, +${power} HP.`,'magic');}
  else if(spell.kind==='cleanse'){h.conditions=h.conditions.filter(c=>!['poison','curse','fever'].includes(c.id));ctx.log(s,'Названное настоящим именем проклятие больше не держится.','magic');}
  else if(spell.kind==='ward'){addCondition(s,'blessing',ctx,18);ctx.log(s,'Слово укрытия ложится между героем и чужими когтями.','magic');}
  else if(spell.kind==='pacify'){
    if(moduleRandom(s,'magic')<.45){enemy.resolved=true;enemy.pacified=true;h.combat=null;h.goal=null;ctx.gainXp(s,7);ctx.log(s,'Колыбельная превращает угрозу в спящее существо. Герой проходит без убийства.','magic');}
    else ctx.log(s,'Колыбельная звучит. Противник недоволен музыкальным жанром.','magic');
  }else{const force=spell.id==='roots'&&enemy.tags?.includes('construct')?Math.round(power*1.25):power;const damage=enemyDamage(s,enemy,force,spellChannel(spell),ctx);enemy.hp=Math.max(0,enemy.hp-damage);if(damage>0)actorFact(s,'hurt',enemy.id,'hero',damage);ctx.log(s,`«${spell.name}»: ${damage} магического урона.${spell.kind==='time'?' Ответный удар не успевает случиться.':''}`,'magic');if(enemy.hp<=0)ctx.defeatEnemy(s,enemy);}
  return true;
}
