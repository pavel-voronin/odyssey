import {areaScale,areaOffset} from '../geometry.js';
import {enabled,moduleRandom} from '../rules.js';
import {noticeCharge} from './brace.js';
export const TACTICS={simple:{name:'Прямой натиск'},charged:{name:'Тяжёлый размах',text:'Готовит удар один ответ, затем наносит утроенный урон. Замах виден заранее.'},warden:{name:'Стойка хранителя',text:'Чередует защиту и удар. В защите физическое оружие наносит половину урона.'},leech:{name:'Истощение',text:'Ответ дополнительно расходует ману и силы героя.'},duelist:{name:'Дуэлянт',text:'Становится опаснее, когда здоровье противника меньше половины.'},summoner:{name:'Зов подкрепления',text:'Через несколько ответов вызывает до двух существ. Новые существа остаются в мире.'},pack:{name:'Охота стаей',text:'Удар усиливается живыми союзниками рядом.'}};
export function initializeTactic(s,a,e){if(e.tactic)return;const keys=Object.keys(TACTICS);e.tactic=a.id==='a2'&&!e.boss?'simple':moduleRandom(s,'tactics')<.35?'simple':keys[1+Math.floor(moduleRandom(s,'tactics')*(keys.length-1))];}
export function tacticalDamage(s,e,amount,type){return enabled(s,'tactics')&&e.tactic==='warden'&&e.battle.intent==='guard'&&type==='physical'?Math.max(amount>0?1:0,Math.round(amount*.5)):amount;}
export function tacticalResponseValue(s,e,raw,{hp=s.hero.hp,maxHp=s.hero.maxHp,area=s.hero.area}={}){
  if(!enabled(s,'tactics'))return raw;
  if(e.tactic==='charged')return e.battle?.intent==='strike'?raw*3:0;
  if(e.tactic==='warden')return e.battle?.intent==='guard'?raw:0;
  if(e.tactic==='duelist'&&hp/maxHp<.5)raw+=Math.ceil(raw*.5);
  if(e.tactic==='pack'){const a=s.areas[area],allies=(a?.objects||[]).filter(o=>o.kind==='enemy'&&o.id!==e.id&&o.alive&&!o.resolved&&Math.abs(o.x-e.x)*areaScale(a)<25);raw+=Math.min(6,allies.length*2);}
  return raw;
}
export function tacticalReply(s,e,raw,ctx,actor=s.hero){
  if(!enabled(s,'tactics'))return raw;
  e.battle.turns++;
  if(e.tactic==='charged'){
    if(e.battle.intent!=='strike'){e.battle.intent='strike';if(actor===s.hero)noticeCharge(s,e);ctx.log(s,`${e.name} готовит тяжёлый размах. Следующий ответ будет особенно опасен.`,'intent');return 0;}
    e.battle.intent='idle';ctx.log(s,'Подготовленный размах обрушивается на противника.','intent');return raw*3;
  }
  if(e.tactic==='warden'){e.battle.intent=e.battle.intent==='guard'?'strike':'guard';if(e.battle.intent==='guard'){ctx.log(s,`${e.name} уходит в защитную стойку.`, 'intent');return 0;}}
  if(e.tactic==='leech'&&actor===s.hero){const lost=enabled(s,'magic')?Math.min(4,actor.magic.mana):0;actor.magic.mana-=lost;actor.energy=Math.max(0,actor.energy-3);if(lost)ctx.log(s,`Противник истощает героя: −${lost} маны.`, 'combat');}
  if(e.tactic==='duelist'&&(actor===s.hero?actor.hp/actor.maxHp:actor.health/(actor.maxHealth||100))<.5)raw+=Math.ceil(raw*.5);
  const a=s.areas[ctx.combatArea||s.hero.area];
  if(e.tactic==='pack'){const allies=a.objects.filter(o=>o.kind==='enemy'&&o.id!==e.id&&o.alive&&!o.resolved&&Math.abs(o.x-e.x)*areaScale(a)<25);raw+=Math.min(6,allies.length*2);}
  if(e.tactic==='summoner'&&e.battle.turns%3===0&&e.battle.summons<2&&ctx.spawnEnemy){
    const child=ctx.spawnEnemy(s,a,{species:e.species,tactic:'simple',element:e.element||'normal',mutation:'none',originPack:e.originPack||e.id,x:Math.max(areaOffset(a,8),Math.min(100-areaOffset(a,8),e.x+areaOffset(a,e.battle.summons?-12:12)))});
    child.maxHp=child.hp=Math.max(12,Math.min(60,Math.round(e.maxHp*.35)));e.battle.summons++;ctx.enemySpawned?.(s,e,child);
    ctx.log(s,`${e.name} зовёт подкрепление. На линии появляется ${child.baseName}.`, 'intent');
  }
  return raw;
}
