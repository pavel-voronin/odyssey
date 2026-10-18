import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,knownRoute} from '../engine.js';
import {setModule} from '../rules.js';
import {roadCase} from '../scripts/road-comparison.mjs';
import {deathFixture} from '../scripts/death-record-scenarios.mjs';
import {estimatePlan} from '../modules/preparation.js';
import {armorChoice,armorEffect,armorWalkExtra,legacyArmorDefense,walkingEnergy,armorCoverage,armorDescription} from '../modules/armor.js';
import {receiveItem,itemBonus} from '../modules/inventory.js';
import {incomingReply} from '../modules/combat-forecast.js';
import {combatResponse} from '../modules/combat.js';
import {nextPurchase} from '../modules/finances.js';
import {physicalDistance,areaScale} from '../geometry.js';
import {semanticEvent} from '../event-text.js';
const item=(id,base='mail',power=1)=>({id,base,name:base==='mail'?'Кольчуга дозорного':'Лёгкий плащ',slot:'armor',stat:'defense',power,rarity:1,value:8,history:[]});
const context={knownRoute,log(s,text,type,area,metadata){if(metadata?.meaning)s.journal.unshift({tick:s.tick,text,type,meaning:metadata.meaning});},random(){throw new Error('no draw for an existing armor');}};
function choiceCase({walks=0,courage=.4,energy=100}={}){const s=createWorld(4),h=s.hero,a=s.areas[h.area];a.length=Math.max(100,walks*6+1);h.x=0;h.goal={kind:'hunt',area:h.area,x:(walks*6+1)/areaScale(a)};h.personality.courage=courage;h.energy=energy;h.hp=h.maxHp;h.equipment.armor=null;h.bag=[];return s;}
const acquire=(s,i)=>receiveItem(s,context,null,i);

test('equal-quality light and heavy originals lead to different actual choices for a nearby fight and a long known march',()=>{
 const fight=choiceCase(),march=choiceCase({walks:30});for(const s of [fight,march]){acquire(s,item('light','coat'));acquire(s,item('heavy'));}
 assert.equal(fight.hero.equipment.armor.id,'heavy');assert.equal(fight.hero.bag[0].id,'light');assert.equal(march.hero.equipment.armor.id,'light');assert.equal(march.hero.bag[0].id,'heavy');assert.equal(fight.hero.nextItem,march.hero.nextItem);assert.equal(fight.hero.gold,march.hero.gold);
});

test('actual energy and courage change the same known acquisition without a random tie or a mandatory heavy kit',()=>{
 for(const [options,expected]of [[{walks:10,courage:.1},'heavy'],[{walks:10,courage:.95},'light'],[{walks:10,courage:.1,energy:30},'light']]){const s=choiceCase(options);acquire(s,item('light','coat'));acquire(s,item('heavy'));assert.equal(s.hero.equipment.armor.id,expected);}
 const s=choiceCase({walks:30,energy:10});acquire(s,item('too-heavy'));assert.equal(s.hero.equipment.armor,null);assert.equal(s.hero.bag[0].id,'too-heavy');
});

test('unknown remote occupants never influence the assessment or become discovered knowledge',()=>{
 const s=choiceCase(),h=s.hero,target=Object.values(s.areas).find(a=>a.id!==h.area);h.goal={kind:'hunt',area:target.id,x:42};const atlas=JSON.stringify(h.atlas),objects=target.objects;
 Object.defineProperty(target,'objects',{configurable:true,get(){throw new Error('unseen occupants read');}});
 try{assert.equal(armorChoice(s,item('unknown'),{knownRoute:()=>[]}).walks,0);assert.equal(JSON.stringify(h.atlas),atlas);}finally{Object.defineProperty(target,'objects',{configurable:true,writable:true,value:objects});}
});

test('real clear, rain and snow walking pays the same heavy cost predicted by preparation in both directions',()=>{
 for(const weather of ['clear','rain','snow'])for(const direction of [1,-1]){
  const {s,h,a}=roadCase({length:260,weather,direction});setModule(s,'equipment',true);setModule(s,'armor-balance',true);h.equipment.armor=item('road-mail');const target=direction>0?100:0;h.goal={kind:'routeWait',area:a.id,x:target,until:100000};
  const estimate=estimatePlan(s,h.goal,{route:()=>[a.id]}),energy=h.energy;let actions=0;
  while(physicalDistance(a,h.x,target)>1&&actions<100){step(s);actions++;assert.equal(h.lastAction,'walk');}
  assert.equal(actions,estimate.ticks);assert.ok(estimate.energyCost>=energy-h.energy-1e-7);assert.ok(estimate.energyCost-(energy-h.energy)<1+1e-7);assert.ok(physicalDistance(a,h.x,target)<=1);assert.equal(h.equipment.armor.id,'road-mail');
 }
});

test('light, bare, disabled equipment and disabled armor rules retain the old walking cost and stored originals',()=>{
 const s=choiceCase(),h=s.hero,w={energy:1.3};assert.equal(walkingEnergy(s,w),.7*1.3);h.equipment.armor=item('coat','coat');assert.equal(walkingEnergy(s,w),.7*1.3);h.equipment.armor=item('mail');assert.equal(walkingEnergy(s,w),1.1*1.3);
 for(const flag of ['equipment','armor-balance']){setModule(s,flag,false);assert.equal(walkingEnergy(s,w),.7*1.3);assert.equal(h.equipment.armor.id,'mail');setModule(s,flag,true);}assert.equal(armorWalkExtra(s),.4);
});

test('the physical armor and legacy leather are never counted twice, while the original leather returns after removal',()=>{
 const s=choiceCase(),h=s.hero;h.armor=1;h.equipment.armor=item('mail','mail',3);assert.equal(legacyArmorDefense(h),0);assert.equal(itemBonus(h,'defense'),5);assert.equal(armorCoverage(h),2);h.equipment.armor=null;assert.equal(legacyArmorDefense(h),2);assert.equal(itemBonus(h,'defense'),0);
 h.equipment.armor=item('mail','mail',3);setModule(s,'armor-balance',false);assert.equal(legacyArmorDefense(h),2);assert.equal(itemBonus(h,'defense'),3);setModule(s,'armor-balance',true);setModule(s,'equipment',false);assert.equal(legacyArmorDefense(h),2);assert.equal(itemBonus(h,'defense'),0);
});

test('incoming forecasts and actual combat responses agree for all reply rolls in both real armor modes',()=>{
 for(const base of ['coat','mail']){const s=choiceCase(),h=s.hero;for(const id of ['lineage','enemies','tactics','mutations','enchantments'])setModule(s,id,false);h.armor=1;h.equipment.armor=item(base,base,2);h.conditions=[];const enemy={id:'actual',hp:100,maxHp:100,attack:12,powers:[],tags:[]};
  const expected=incomingReply(s,enemy),actual=[];for(let roll=0;roll<4;roll++)actual.push(combatResponse(s,enemy,Math.max(1,enemy.attack+roll-legacyArmorDefense(h)),context));assert.equal(Math.min(...actual),expected.min);assert.equal(Math.max(...actual),expected.max);assert.equal(actual[0],base==='mail'?8:10);
 }
});

test('an already equipped body does not plan an unnecessary duplicate leather purchase',()=>{
 const s=choiceCase(),h=s.hero;h.weapon=3;h.gold=100;h.inventory.potions=1;h.equipment.armor=item('owned');assert.equal(nextPurchase(s,context),null);setModule(s,'armor-balance',false);assert.equal(nextPurchase(s,context)?.kind,'armor');assert.equal(h.equipment.armor.id,'owned');
});

test('loot records snapshot the known protection and movement tradeoff and escape the optional explanation',()=>{
 const s=choiceCase();acquire(s,item('shown'));const event=s.journal[0];assert.equal(event.meaning.item.armorEffect.defense,3);assert.equal(event.meaning.item.armorEffect.walkExtra,.4);assert.match(semanticEvent(s,event),/защита \+3/);assert.match(semanticEvent(s,event),/шаг \+0,4/);const text=semanticEvent(s,event,{details:true});assert.match(text,/ценой сил/);event.meaning.result.choiceReason='<img src=x>';assert.ok(!semanticEvent(s,event,{details:true}).includes('<img'));assert.match(armorDescription(s,s.hero.equipment.armor),/Тяжёлый доспех/);
});

test('an acquisition saved before or after the decision replays the same physical originals and never reapplies a gift',()=>{
 const a=choiceCase({walks:30}),b=restore(serialize(a));for(const s of [a,b]){acquire(s,item('light','coat'));acquire(s,item('heavy'));}assert.equal(serialize(a),serialize(b));const saved=serialize(a),c=restore(saved);for(let i=0;i<5;i++){step(a);step(c);}assert.equal(serialize(a),serialize(c));assert.equal(a.hero.nextItem,b.hero.nextItem);
});

test('sea passenger time is not billed as a heavy walking action or protected from the actual storm by mail',()=>{
 const {s}=deathFixture('storm');setModule(s,'equipment',true);setModule(s,'armor-balance',true);s.hero.equipment.armor=item('sea-mail');const energy=s.hero.energy;step(s);assert.equal(s.hero.alive,false);assert.equal(s.lives.at(-1).deathReport.kind,'storm');assert.ok(Math.abs(energy-s.lives.at(-1).deathReport.resources.energy-.2)<1e-8);
});

test('turning the new rule off preserves the former equal-power refusal and receipt shape',()=>{
 const s=choiceCase();setModule(s,'armor-balance',false);acquire(s,item('light','coat'));acquire(s,item('heavy'));assert.equal(s.hero.equipment.armor.id,'light');assert.equal(s.journal[0].meaning.item.armorEffect,undefined);assert.equal(s.journal[0].meaning.result.choiceReason,undefined);assert.equal(s.hero.bag[0].id,'heavy');assert.equal(armorEffect(s,item('heavy')),null);
});
