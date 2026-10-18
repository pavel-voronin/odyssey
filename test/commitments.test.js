import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {rememberRetreat,rememberPromise,commitmentTick,commitmentPlan} from '../modules/commitments.js';
function context(s){return {log:(s,text,type)=>s.journal.unshift({tick:s.tick,text,type}),route:()=>['a0','a1'],goal:(s,kind,area,x,intent,reason,extra)=>{s.hero.goal={kind,area,x,...extra};s.hero.reason=reason;},work:()=>false};}
function setup(){const s=createWorld(11),h=s.hero;h.gold=100;h.weapon=0;h.memory.merchant='a1';h.personality.courage=.2;h.personality.generosity=.2;return s;}
test('an actual retreat causes a later equipment plan; removing the cause removes that decision',()=>{
  const a=setup(),b=restore(serialize(a)),enemy=a.areas.a2.objects.find(o=>o.kind==='enemy');
  rememberRetreat(a,enemy);
  assert.equal(commitmentPlan(a,null,false,context(a)),true);
  assert.equal(a.hero.goal.kind,'trade');assert.equal(a.hero.goal.commitment,a.hero.commitments.personal.cause);
  assert.equal(commitmentPlan(b,null,false,context(b)),false);assert.equal(b.hero.commitments.personal,null);
  assert.equal(a.hero.gold,100);assert.equal(a.merchant.area,b.merchant.area);
  const c=setup();c.hero.area='a2';c.hero.x=enemy.x;c.hero.combat=enemy.id;c.hero.energy=1;
  for(let i=0;i<4&&c.hero.lastAction!=='flee';i++)step(c);
  assert.equal(c.hero.lastAction,'flee');assert.ok(c.hero.commitments.personal);assert.ok(c.hero.commitments.memories.some(m=>m.enemy===enemy.id));
});
test('a trusted urgent promise beats preparation, while another personality can defer an ordinary promise',()=>{
  const a=setup(),q={id:'promise',kind:'delivery',giver:Object.keys(a.people)[0],status:'active',title:'Весть домой',cause:'Семья ждёт ответа.'};
  a.hero.quests.push(q);rememberPromise(a,q);rememberRetreat(a,a.areas.a2.objects.find(o=>o.kind==='enemy'));
  assert.equal(commitmentPlan(a,q,false,context(a)),true);
  a.hero.personality.generosity=.9;a.hero.relations[q.giver]={trust:75};q.deadline=a.tick+60;
  assert.equal(commitmentPlan(a,q,false,context(a)),false);
  assert.equal(a.hero.commitments.personal.decision,'promise:'+q.id);
  q.status='done';commitmentTick(a,context(a));assert.equal(a.hero.commitments.memories.find(m=>m.quest===q.id).status,'done');
});
test('impossible equipment goals expire, completed ones retain their cause, disabling preserves all evidence',()=>{
  const a=setup();rememberRetreat(a,a.areas.a2.objects.find(o=>o.kind==='enemy'));
  const before=JSON.stringify(a.hero.commitments);setModule(a,'commitments',false);a.tick=2000;
  commitmentTick(a,context(a));assert.equal(commitmentPlan(a,null,false,context(a)),false);assert.equal(JSON.stringify(a.hero.commitments),before);
  setModule(a,'commitments',true);commitmentTick(a,context(a));assert.equal(a.hero.commitments.personal.status,'abandoned');
  const b=setup();rememberRetreat(b,b.areas.a2.objects.find(o=>o.kind==='enemy'));b.hero.weapon=1;commitmentTick(b,context(b));assert.equal(b.hero.commitments.personal.status,'done');assert.ok(b.hero.commitments.personal.cause);
});
test('pending personal causes and subsequent decisions survive saving exactly',()=>{
  const a=setup();rememberRetreat(a,a.areas.a2.objects.find(o=>o.kind==='enemy'));let b=restore(serialize(a));assert.equal(serialize(a),serialize(b));
  for(let i=0;i<200;i++){step(a);step(b);}assert.equal(serialize(a),serialize(b));
});
import {recoverHeirloom,makeItem} from '../modules/inventory.js';
test('inherited equipment physically leaves its old stash and disabled equipment is retained without repeating gold',()=>{
 const s=setup(),ctx={...context(s),random:()=>.2},item=makeItem(s,ctx),stash={name:'Поклажа',gold:7,items:[item],taken:false};
 setModule(s,'equipment',false);const money=s.hero.gold;recoverHeirloom(s,stash,ctx);assert.equal(s.hero.gold,money+7);assert.equal(stash.items.length,1);assert.equal(stash.taken,false);
 recoverHeirloom(s,stash,ctx);assert.equal(s.hero.gold,money+7);
 setModule(s,'equipment',true);recoverHeirloom(s,stash,ctx);assert.equal(stash.items.length,0);assert.equal(stash.taken,true);assert.equal(s.hero.equipment[item.slot].id,item.id);
 const b=restore(serialize(s));s.hero.equipment[item.slot].enchantment.uses++;b.hero.equipment[item.slot].enchantment.uses++;assert.equal(serialize(s),serialize(b));
});
