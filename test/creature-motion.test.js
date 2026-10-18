import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {ActorTracks,actorFact,companionKey,ACTOR_FACT_LIMIT} from '../actor-facts.js';
import {quadrupedPose} from '../motion.js';
import {setModule} from '../rules.js';

test('quadruped support remains planted when idle and rests without walking; displacement lifts feet above support',()=>{
  for(let i=0;i<=100;i++){
    const t=i/100,idle=quadrupedPose({},t,0),rest=quadrupedPose({rest:true},t,80),walk=quadrupedPose({},t,20);
    assert.ok(idle.feet.every(f=>f.y===0));assert.equal(idle.walking,false);assert.equal(rest.walking,false);
    assert.equal(rest.bodyY,7);assert.ok(walk.feet.every(f=>f.y<=0));assert.ok(walk.feet.some(f=>f.y===0));
  }
  assert.notDeepEqual(quadrupedPose({},.2,20).feet,quadrupedPose({},.7,20).feet);
});
test('tracks copy coordinates and consume each resolved event once without replay on redraw, missed ticks or rewind',()=>{
  const s=createWorld(0),a=s.areas[s.hero.area];a.objects.push({id:'wolf-test',kind:'enemy',alive:true,x:60});
  const tracks=new ActorTracks();tracks.update(s,'scene');s.tick++;a.objects.at(-1).x=62;actorFact(s,'attack','wolf-test','hero');actorFact(s,'hurt','wolf-test','hero',3);
  tracks.update(s,'scene');const track=tracks.tracks.get('wolf-test');assert.equal(track.from,60);assert.equal(track.to,62);assert.ok(track.attack&&track.hurt);
  a.objects.at(-1).x=99;assert.equal(track.to,62);assert.equal(tracks.update(s,'scene'),false);
  assert.equal(quadrupedPose(track,1,2).jaw,0);assert.equal(quadrupedPose(track,1,2).hurt,false);
  s.tick+=2;tracks.update(s,'scene');assert.equal(tracks.tracks.get('wolf-test').from,99);assert.equal(tracks.tracks.get('wolf-test').attack,false);
  s.tick=1;tracks.update(s,'scene');assert.equal(tracks.tracks.get('wolf-test').hurt,false);
});
test('facts are bounded, use identity rather than names, survive save and clear on next actual tick',()=>{
  const s=createWorld(0),rng=s.rng;
  for(let i=0;i<100;i++)actorFact(s,'hurt','wolf-'+i,'hero',1);
  assert.equal(s.actorFacts.events.length,ACTOR_FACT_LIMIT);assert.equal(s.rng,rng);
  const text=serialize(s);assert.equal(serialize(restore(text)),text);
  step(s);assert.equal(s.actorFacts.tick,s.tick);assert.ok(s.actorFacts.events.length<ACTOR_FACT_LIMIT);
});
test('actual combat animates only contributing pets and the responding enemy; view module never changes its result',()=>{
  function prepare(){const s=createWorld(12),h=s.hero,a=s.areas[h.area];
    for(const id of ['magic','stories','tactics','body','enemies','elements','enchantments','mutations'])setModule(s,id,false);
    h.hp=h.maxHp=500;h.energy=100;h.personality.courage=1;h.companions=[{id:'dog',uid:'dog-a',attack:2,hp:100,maxHp:100},{id:'cat',uid:'cat-a',attack:0,hp:100,maxHp:100}];
    a.objects.push({id:'tested-wolf',kind:'enemy',shape:'wolf',name:'Тестовый волк',alive:true,x:h.x+1,hp:500,maxHp:500,attack:1,powers:[],tags:[]});h.combat='tested-wolf';return s;}
  const a=prepare(),b=prepare();setModule(b,'creature-motion',false);
  const tracks=new ActorTracks();tracks.update(a,'battle');step(a);step(b);tracks.update(a,'battle');
  const events=a.actorFacts.events;assert.ok(events.some(f=>f.kind==='attack'&&f.actor==='tested-wolf'));
  assert.ok(events.some(f=>f.kind==='hurt'&&f.actor==='tested-wolf'&&f.amount>0));
  assert.ok(tracks.tracks.get(companionKey(a.hero.companions[0])).attack);
  assert.equal(tracks.tracks.get('party:cat-a').attack,false);
  for(const s of [a,b]){delete s.rules['creature-motion'];delete s.hero.ruleFlags['creature-motion'];}
  assert.equal(serialize(a),serialize(b));
});
