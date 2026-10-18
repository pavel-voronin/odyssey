import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {ActorTracks,markActorDeath,visibleRemains,REMAINS_TICKS,companionKey} from '../actor-facts.js';
import {quadrupedPose,creatureActionPose} from '../motion.js';
import {partyHurt} from '../modules/social.js';
import {sendGuards} from '../modules/orders.js';
import {setModule} from '../rules.js';
function battle(shape='wolf',magic=false){const s=createWorld(12),h=s.hero,a=s.areas[h.area];
 for(const id of ['stories','tactics','body','enemies','elements','enchantments','mutations'])setModule(s,id,false);
 setModule(s,'magic',magic);h.hp=h.maxHp=500;h.energy=100;h.personality.courage=1;h.companions=[];
 if(magic){h.magic.spells=['spark'];h.magic.mana=100;h.magic.cooldowns={};}
 const e={id:'death-test',kind:'enemy',shape,name:'Угроза',alive:true,x:h.x+1,hp:1,maxHp:1,attack:1,powers:[],tags:[]};a.objects.push(e);h.combat=e.id;return {s,e};}
test('actual physical and magical kills mark the existing enemy once, with no resurrection or extra corpse object',()=>{
 for(const magic of [false,true]){const {s,e}=battle(magic?'ghost':'wolf',magic),tracks=new ActorTracks();tracks.update(s,'battle');const count=s.areas[s.hero.area].objects.length;
 step(s);tracks.update(s,'battle');assert.equal(e.alive,false);assert.equal(e.deathView.tick,s.tick);assert.ok(tracks.tracks.get(e.id).death);
 assert.equal(s.actorFacts.events.filter(f=>f.kind==='death'&&f.actor===e.id).length,1);assert.equal(s.areas[s.hero.area].objects.length,count);
 if(magic)assert.equal(s.hero.lastAction,'spell');
 const before=serialize(s);assert.equal(markActorDeath(s,e,e.id,e.shape),false);assert.equal(serialize(s),before);
 assert.equal(serialize(restore(before)),before);const loaded=restore(before),fresh=new ActorTracks();fresh.update(loaded,'battle');assert.equal(fresh.tracks.get(e.id).death,false);
 assert.equal(creatureActionPose(e.shape,fresh.tracks.get(e.id),0).death,1);
 s.tick++;tracks.update(s,'battle');assert.equal(tracks.tracks.get(e.id).death,false);assert.equal(visibleRemains(s,e),true);
 s.tick=e.deathView.until;assert.equal(visibleRemains(s,e),false);tracks.update(s,'battle');assert.equal(tracks.tracks.has(e.id),true);assert.equal(tracks.tracks.get(e.id).death,false);assert.equal(e.alive,false);
 setModule(s,'remains',false);tracks.update(s,'legacy-view');assert.equal(tracks.tracks.has(e.id),false);
 }
});
test('a companion death attaches its one final form to the already existing memorial and does not duplicate the actor',()=>{
 let found=false;
 for(let seed=0;seed<100&&!found;seed++){const s=createWorld(seed),h=s.hero,c={id:'dog',uid:'one-dog',name:'Пёс',attack:2,hp:1,maxHp:24};h.companions=[c];const tracks=new ActorTracks();tracks.update(s,'scene');s.tick++;
 partyHurt(s,10,{log:()=>{}});if(h.companions.length)continue;found=true;tracks.update(s,'scene');
 const graves=s.areas[h.area].objects.filter(o=>o.id==='memorial-one-dog');assert.equal(graves.length,1);const grave=graves[0];
 assert.equal(grave.deathView.actor,companionKey(c));assert.equal(grave.deathView.shape,'dog');assert.equal(visibleRemains(s,grave),true);
 const track=tracks.tracks.get(companionKey(c));assert.equal(track.dead,true);assert.equal(track.death,true);assert.equal(quadrupedPose(track,.5,100).walking,false);
 assert.equal(quadrupedPose(track,1).death,1);s.tick+=REMAINS_TICKS;assert.equal(visibleRemains(s,grave),false);assert.equal(graves.length,1);
 }
 assert.equal(found,true);
});
test('a real guard kill records the same enemy death without granting the hero a kill',()=>{
 const s=createWorld(4),a=s.areas.a1,e=s.areas.a2.objects.find(o=>o.kind==='enemy');e.shape='wolf';e.hp=1;
 setModule(s,'tactics',false);setModule(s,'elements',false);setModule(s,'mutations',false);
 assert.ok(sendGuards(s,a,{enemy:e.id,area:'a2'},{route:()=>['a1','a2'],log:()=>{}}));
 const kills=s.hero.kills;for(let i=0;i<20&&e.alive;i++)step(s);
 assert.equal(e.alive,false);assert.equal(e.deathView.shape,'wolf');assert.equal(s.hero.kills,kills);assert.equal(e.defeatedBy,s.society.orders[0].person);
});
test('form phases respect support, static chests, skipped death frames, expiration and disabled view',()=>{
 for(const shape of ['fungus','ghost','dragon'])for(let i=0;i<=100;i++){
  const t=i/100,idle=creatureActionPose(shape,{},t),walk=creatureActionPose(shape,{},t,4),rest=creatureActionPose(shape,{rest:true},t,4),dead=creatureActionPose(shape,{dead:true,death:true,attack:true,hurt:true},t,4);
  assert.equal(idle.bounce,0);assert.ok(walk.bounce<=0);assert.equal(rest.walking,false);assert.equal(dead.walking,false);assert.equal(dead.lean,0);assert.equal(dead.death,t);assert.ok(dead.alpha>=0&&dead.alpha<=1);
 }
 assert.equal(creatureActionPose('chest',{},.25,10).walking,false);
 const {s,e}=battle();const tracks=new ActorTracks();tracks.update(s,'a');step(s);s.tick++;tracks.update(s,'a');assert.equal(tracks.tracks.get(e.id).death,false);
 const before=serialize(s);for(const flag of [false,true,false,true]){setModule(s,'creature-motion',flag);tracks.update(s,'a');assert.equal(quadrupedPose(tracks.tracks.get(e.id),0).death,1);}
 delete s.rules['creature-motion'];delete s.hero.ruleFlags['creature-motion'];const old=JSON.parse(before);delete old.rules['creature-motion'];delete old.hero.ruleFlags['creature-motion'];assert.deepEqual(JSON.parse(serialize(s)),old);
 const legacy=battle().e;legacy.alive=false;assert.equal(visibleRemains(s,legacy),false);
});
