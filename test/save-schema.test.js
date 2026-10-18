import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,createNextStory,observeExistingPerson} from '../engine.js';
import {SAVE_VERSION,SAVE_SCHEMA,SAVE_KEY,clockRecord,currentClock,currentTutorial} from '../save-schema.js';
import {setModule} from '../rules.js';
import {createClock,restartClock,catchUp} from '../clock.js';
import {createArea,connectAreas} from '../engine.js';
import {createPerson} from '../modules/lineage.js';
import {enabled} from '../rules.js';

test('one identified current document roundtrips a new world without additions',()=>{
 const s=createWorld(0),text=serialize(s),raw=JSON.parse(text);
 assert.equal(raw.version,SAVE_VERSION);assert.equal(raw.schema,SAVE_SCHEMA);assert.equal(SAVE_KEY,'click-odyssey-144');
 for(const k of ['contentVersion','geographyVersion','cultureVersion','enchantmentVersion','adversaryVersion','lineageAreaCount','civicAreaCount','supplyAreaCount','peopleAreaCount'])assert.equal(Object.hasOwn(raw,k),false,k);
 const loaded=restore(text);assert.equal(serialize(loaded),text);assert.equal(loaded.actorStates[loaded.hero.lineage],loaded.hero);assert.equal(loaded.journal,loaded.hero.actorJournal);assert.equal(loaded.people[loaded.hero.lineage].actorLink.inventory,loaded.hero.inventory);assert.equal(loaded.hero.ruleFlags,loaded.rules);
});
test('old identifiers and the former wrapper are rejected rather than converted',()=>{
 const raw=JSON.parse(serialize(createWorld(1)));
 for(const invalid of [{...raw,version:1},{...raw,schema:undefined},{...raw,contentVersion:21},{format:'click-odyssey-save',state:raw},{...raw,version:3}])assert.throws(()=>restore(JSON.stringify(invalid)),/формат|Повреждённое/);
});
test('missing current world and body contracts are corruption, never an initializer request',()=>{
 const original=JSON.parse(serialize(createWorld(5)));
 for(const k of ['rules','people','observation','actorStates','spatial','society','randomStreams']){const raw=structuredClone(original);delete raw[k];assert.throws(()=>restore(JSON.stringify(raw)),undefined,k);}
 for(const k of ['atlas','life','career','weatherTaste','inventory','memory','workMaterials']){const raw=structuredClone(original);delete raw.hero[k];assert.throws(()=>restore(JSON.stringify(raw)),undefined,k);}
 const raw=structuredClone(original);delete raw.people[raw.hero.lineage].actorLink;assert.throws(()=>restore(JSON.stringify(raw)));
});
test('a divergent serialized inventory alias and unknown nested contract cannot silently replace resources',()=>{
 const raw=JSON.parse(serialize(createWorld(5)));raw.people[raw.hero.lineage].actorLink.inventory.potions+=7;assert.throws(()=>restore(JSON.stringify(raw)),/actorLink.inventory/);
 const other=JSON.parse(serialize(createWorld(5)));other.hero.atlas.version=99;assert.throws(()=>restore(JSON.stringify(other)),/version/);
});
test('repeated current reloads preserve every state field and next RNG through actual ticks',()=>{
 for(const seed of [0,1,4,5]){const direct=createWorld(seed);let resumed=restore(serialize(direct));for(let n=0;n<256;n++){step(direct);step(resumed);if(n%13===0||n%17===0)resumed=restore(serialize(resumed));assert.equal(serialize(resumed),serialize(direct),seed+'/'+n);}}
});
test('a real fatal condition and continued world retain one corpse and never create a successor on reload',()=>{
 const s=createWorld(5);s.tick=7;s.hero.hp=1;s.hero.inventory.potions=0;s.hero.inventory.herbs=0;s.hero.conditions=[{id:'poison',since:0,until:90}];setModule(s,'magic',false);step(s);assert.equal(s.hero.alive,false);assert.equal(Object.keys(s.remains.byId).length,1);
 let loaded=restore(serialize(s));for(let n=0;n<32;n++){step(s);step(loaded);loaded=restore(serialize(loaded));assert.equal(serialize(loaded),serialize(s));}assert.equal(loaded.generation,1);assert.equal(loaded.lives.length,1);
 assert.equal(createNextStory(loaded),true);const snapshot=serialize(loaded),next=restore(snapshot);assert.equal(serialize(next),snapshot);assert.equal(Object.keys(next.actorStates).length,2);assert.equal(Object.keys(next.remains.byId).length,1);
});
test('selecting a real resident and loading restores references without another profile or wallet',()=>{
 const s=createWorld(0),p=Object.values(s.people).find(p=>p.alive&&p.role!=='герой'&&p.role!=='ребёнок'&&p.area&&s.areas[p.area]);assert.ok(p);assert.equal(observeExistingPerson(s,p.id),true);
 const text=serialize(s),loaded=restore(text);assert.equal(serialize(loaded),text);assert.equal(loaded.hero.lineage,p.id);assert.equal(loaded.hero.actorMode,'npc');assert.equal(loaded.people[p.id].actorLink.inventory,loaded.hero.inventory);assert.equal(loaded.nextPerson,s.nextPerson);
});
test('current OFF then ON and offline batches13/17 reproduce one direct world prefix',()=>{
 for(const batch of [13,17]){let direct=createWorld(4),loaded=restore(serialize(direct));for(const s of [direct,loaded])setModule(s,'goods-cycle',false);
  for(let n=0;n<40;n++){step(direct);step(loaded);}loaded=restore(serialize(loaded));for(const s of [direct,loaded])setModule(s,'goods-cycle',true);
  const clock=createClock(0);for(let n=0;n<221;n++)step(direct);while(catchUp(clock,221000,()=>step(loaded),batch))loaded=restore(serialize(loaded));assert.equal(serialize(loaded),serialize(direct));
 }
});
test('current browser clock belongs to the same schema and seed; obsolete or stopped clock is not resumed',()=>{
 const s=createWorld(4),clock=createClock(0);restartClock(clock,10000);const value=clockRecord(s,clock);assert.equal(currentClock(value,s),value);
 for(const bad of [clock,{...value,seed:5},{...value,schema:'v1'},{...value,stopped:true},{...value,anchor:null},{...value,idleUntil:-1}])assert.equal(currentClock(bad,s),null);
});
test('the current tutorial reader refuses incomplete shapes',()=>{
 assert.ok(currentTutorial({stage:1,until:0,done:false}));for(const t of [null,{}, {stage:9,until:0,done:false},{stage:1,done:false},{stage:1,until:0,done:'false'}])assert.equal(currentTutorial(t),null);
});
test('new places and people created after loading already satisfy the current contract',()=>{
 const s=restore(serialize(createWorld(4))),before=s.nextPerson,id=createArea(s,'village','Ключевая Заводь',0,{culture:'deep',danger:0});connectAreas(s,'a0',id);
 const person=createPerson(s,{name:'Новый житель',area:id,race:undefined,role:undefined}),p=s.people[person];assert.equal(p.race,'human');assert.equal(p.role,'житель');assert.equal(p.alive,true);assert.ok(p.agenda&&p.needs&&p.navigation);assert.ok(s.nextPerson>before);const text=serialize(s);assert.equal(serialize(restore(text)),text);
});
test('an absent optional module override keeps its declared default without load-time enrichment',()=>{
 const s=createWorld(4);delete s.rules.weather;const text=serialize(s),loaded=restore(text);assert.equal(enabled(loaded,'weather'),true);assert.equal(Object.hasOwn(loaded.rules,'weather'),false);assert.equal(serialize(loaded),text);
});
test('a mismatched actor key and a missing dormant journal are refused instead of remapping people or rebuilding history',()=>{
 const s=createWorld(4);createNextStory(s,{allowLiving:true});const raw=JSON.parse(serialize(s)),id=Object.keys(raw.actorStates)[0],h=raw.actorStates[id];delete raw.actorStates[id];raw.actorStates['wrong-id']=h;assert.throws(()=>restore(JSON.stringify(raw)),/actorStates/);
 const other=JSON.parse(serialize(s));delete other.actorStates[id].actorJournal;assert.throws(()=>restore(JSON.stringify(other)),/actorJournal/);
});

test('empty required domain records and malformed spell containers are refused before they can replace a working world',()=>{
 const text=serialize(createWorld(4));
 for(const key of ['magic','mind','stats','personality','destiny','travel','weatherTaste','planning','commitments','innerLife','money','workMaterials','social','civic','affiliation','campLife','sketchbook','smoking','storyRarity','stories']){const raw=JSON.parse(text);raw.hero[key]={};assert.throws(()=>restore(JSON.stringify(raw)),undefined,key);}
 for(const [key,value]of [['spells',null],['cooldowns',[]],['mana','18']]){const raw=JSON.parse(text);raw.hero.magic[key]=value;assert.throws(()=>restore(JSON.stringify(raw)),undefined,key);}
 assert.equal(serialize(restore(text)),text);
});
