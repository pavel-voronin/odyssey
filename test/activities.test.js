import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {currentQuest,questTick,availableOffers} from '../modules/quests.js';
import {delvePlan} from '../modules/delves.js';
test('several promises compete by opportunity rather than insertion order; obsolete promises can be dropped',()=>{
  const s=createWorld(23),h=s.hero;h.area='a1';
  const first={id:'far',kind:'scout',source:'a1',target:'a3',reward:12,required:1,status:'active',accepted:0};
  const second={id:'near',kind:'medicine',source:'a1',target:'a1',reward:12,required:1,status:'active',accepted:0,person:'nobody'};
  h.quests=[first,second];h.inventory.herbs=1;assert.equal(currentQuest(h,s).id,'near');
  s.tick=1801;questTick(s,{log(){}});assert.equal(first.status,'abandoned');assert.equal(second.status,'active');
  h.quests.push({kind:'delivery',status:'done'},{kind:'delivery',status:'failed'});
  assert.ok(!availableOffers(s,s.areas.a1).some(q=>q.kind==='delivery'));
});
test('a dungeon run creates persistent connected rooms, real bosses and portable loot',()=>{
  let rooms=0,cleared=0,bosses=0,multiple=false;
  for(let seed=1;seed<=8;seed++){
    const s=createWorld(seed);
    // This older coverage run exercises room/boss persistence at its original
    // opportunity frequency. Lifetime rarity has separate explicit controls.
    setModule(s,'delve-rarity',false);
    for(let i=0;i<3000;i++){
      step(s);multiple ||= s.hero.quests.filter(q=>q.status==='active').length>1;
      if(i===1234)assert.equal(serialize(restore(serialize(s))),serialize(s));
    }
    for(const a of Object.values(s.areas).filter(a=>a.dungeon)){
      rooms++;if(a.dungeon.cleared)cleared++;
      bosses+=a.objects.filter(o=>o.boss).length;
      assert.ok(a.links.length);assert.ok(a.objects.some(o=>o.kind==='relic'));
      if(a.dungeon.cleared)assert.ok(a.objects.every(o=>o.kind!=='enemy'||o.eventThreat||o.story||!o.alive||o.resolved));
    }
  }
  assert.ok(rooms>20);assert.ok(cleared>10);assert.ok(bosses>0);assert.ok(multiple);
});
test('turning dungeon activities off leaves the physical rooms and suspended plan intact',()=>{
  const s=createWorld(1);s.hero.delve={root:'a2',room:'a2',started:0};
  setModule(s,'delves',false);const before=serialize(s);assert.equal(delvePlan(s,{}),false);assert.equal(serialize(s),before);
});
