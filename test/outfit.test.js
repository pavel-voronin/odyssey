import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,createNextStory,observeExistingPerson,step} from '../engine.js';
import {heroAppearance,personAppearance,appearance} from '../appearance.js';
import {itemOutfit,drawGarment} from '../outfit.js';
import {receiveItem} from '../modules/inventory.js';
import {takeLegacyItem,syncActiveActor} from '../actor-projection.js';
import {portraitModel,drawHeroPortrait,drawArchivePortrait} from '../portrait.js';
import {recordSilhouette} from '../silhouette.js';
import {Scene} from '../scene.js';
import {race} from '../content.js';
import {deathFixture} from '../scripts/death-record-scenarios.mjs';
const armor=(id,base='coat',power=1)=>({id,base,name:base==='mail'?'Кольчуга старого стража':'Красный дорожный плащ',slot:'armor',stat:'defense',power,rarity:1,value:8,history:[]});
const ctx={log(){},random(){throw new Error('existing item needs no simulation RNG');}};
const equip=(s,item)=>receiveItem(s,ctx,null,item);
const face=look=>Object.fromEntries(['skin','hair','hairStyle','glasses','earring','capColor'].map(k=>[k,look[k]]));
// Bag contents legitimately change the existing backpack capacity silhouette.
const withoutPack=({packSize,...look})=>look;

test('two actual armor acquisitions change silhouette and dye while the same face survives restore and repeated redraw',()=>{
 const s=createWorld(4),h=s.hero,initial=heroAppearance(s);equip(s,armor('garment-a'));const first=heroAppearance(s);assert.equal(first.garmentId,'garment-a');assert.notEqual(first.coat,initial.coat);assert.notEqual(first.cloak,initial.cloak);
 equip(s,armor('garment-b','mail',5));const second=heroAppearance(s);assert.equal(second.material,'metal');assert.equal(second.coat,'cuirass');assert.equal(second.armored,true);assert.deepEqual(face(first),face(second));assert.notEqual(first.cloak,second.cloak);assert.equal(h.bag[0].id,'garment-a');
 const before=serialize(s);for(let i=0;i<200;i++){assert.deepEqual(heroAppearance(s),second);assert.deepEqual(portraitModel(s).look.cloak,second.cloak);}assert.equal(serialize(s),before);assert.deepEqual(heroAppearance(restore(before)),second);
});

test('an inferior or unusable armor in the bag does not recolor the equipped garment',()=>{
 const s=createWorld(8);equip(s,armor('actual-mail','mail',9));const look=heroAppearance(s);equip(s,armor('bag-coat','coat',1));assert.deepEqual(withoutPack(heroAppearance(s)),withoutPack(look));assert.equal(s.hero.bag.at(-1).id,'bag-coat');
 const cursed=armor('cursed','coat',20);cursed.modifier='curse';s.hero.habits=[];s.hero.alignment=10;equip(s,cursed);assert.deepEqual(withoutPack(heroAppearance(s)),withoutPack(look));
});

test('a physical transfer removes the old owner outfit and only actual equipping changes its next wearer',()=>{
 const s=createWorld(4),old=s.hero;equip(s,armor('one-original','mail',20));const outfit=itemOutfit(old.equipment.armor);syncActiveActor(s);createNextStory(s,{allowLiving:true});
 assert.equal(personAppearance(s,s.people[old.lineage]).garmentId,'one-original');const item=takeLegacyItem(s,s.people[old.lineage]);assert.equal(item.id,'one-original');assert.equal(heroAppearance({...s,hero:old}).garmentId,undefined);assert.equal(old.equipment.armor,null);
 const natural=heroAppearance(s);s.hero.bag.push(item);assert.deepEqual(withoutPack(heroAppearance(s)),withoutPack(natural));s.hero.bag.pop();equip(s,item);assert.equal(heroAppearance(s).garmentId,item.id);assert.equal(heroAppearance(s).cloak,outfit.cloak);assert.equal(s.hero.equipment.armor,item);assert.equal(old.bag.length,0);
});

test('myconid cap physiology stays stable across armor colors, equipment switch and actor observation',()=>{
 const s=createWorld(4);s.hero.race='myconid';const before=heroAppearance(s);equip(s,armor('mushroom-mail','mail',2));const after=heroAppearance(s);assert.equal(after.capColor,before.capColor);assert.notEqual(after.cloak,after.capColor);assert.deepEqual(face(before),face(after));
 const h=s.hero;syncActiveActor(s);createNextStory(s,{allowLiving:true});assert.deepEqual(personAppearance(s,s.people[h.lineage]),heroAppearance({...s,hero:h}));assert.equal(observeExistingPerson(s,h.lineage),true);assert.equal(heroAppearance(s).capColor,before.capColor);
});

test('a plain resident retains the original fallback and an observed NPC reads only its actual equipment',()=>{
 const s=createWorld(4),p=Object.values(s.people).find(p=>p.alive&&p.agenda&&p.role!=='ребёнок'&&p.id!==s.hero.lineage&&p.area);assert.ok(p);assert.deepEqual(personAppearance(s,p),appearance(s.seed,p,p.appearance));assert.equal(personAppearance(s,p).garmentId,undefined);
 assert.equal(observeExistingPerson(s,p.id),true);const first=heroAppearance(s);equip(s,armor('npc-owned-mail','mail',4));const worn=heroAppearance(s);assert.equal(worn.garmentId,'npc-owned-mail');assert.deepEqual(face(worn),face(first));assert.deepEqual(personAppearance(s,p),worn);
 syncActiveActor(s);const saved=serialize(s);assert.deepEqual(heroAppearance(restore(saved)),worn);assert.equal(serialize(s),saved);
});

test('a historical outfit is captured before fatal cleanup and never follows later ownership or current dyes',()=>{
 const {s}=deathFixture('battle');Object.assign(s.rules,{'outfit-appearance':true,appearance:true,equipment:true});equip(s,armor('last-mail','mail',1));const old=heroAppearance(s);step(s);const l=s.lives.at(-1);assert.equal(s.hero.alive,false);assert.deepEqual(l.outfitSnapshot,old);assert.equal(s.hero.equipment.armor,null);
 const record=JSON.stringify(l.outfitSnapshot);createNextStory(s);equip(s,armor('future-cloak','coat',5));assert.equal(JSON.stringify(l.outfitSnapshot),record);const restored=restore(serialize(s));assert.deepEqual(restored.lives.at(-1).outfitSnapshot,old);
});

test('off switches preserve item originals and off archives do not acquire a new outfit snapshot',()=>{
 const {s}=deathFixture('battle');Object.assign(s.rules,{'outfit-appearance':true,appearance:true,equipment:true});equip(s,armor('off-mail','mail',3));const before=serialize(s),on=heroAppearance(s);s.rules['outfit-appearance']=false;assert.equal(heroAppearance(s).garmentVersion,undefined);s.rules['outfit-appearance']=true;assert.deepEqual(heroAppearance(s),on);assert.equal(serialize(s),before);s.rules['outfit-appearance']=false;step(s);assert.equal(s.hero.alive,false);assert.equal(s.lives.at(-1).outfitSnapshot,undefined);
 const copy=restore(before);copy.rules.equipment=false;assert.equal(heroAppearance(copy).garmentId,undefined);assert.equal(copy.hero.equipment.armor.id,'off-mail');copy.rules.equipment=true;assert.deepEqual(heroAppearance(copy),on);assert.equal(serialize(copy),before);
});

test('a current owned item uses a deterministic visual recipe without writing power, history or face',()=>{
 const s=createWorld(4),item=armor('unpainted-mail','mail');equip(s,item);const saved=JSON.stringify(item),a=itemOutfit(item),b=itemOutfit(structuredClone(item));assert.deepEqual(a,b);assert.equal(JSON.stringify(item),saved);assert.equal(a.garmentVersion,1);
 const before=serialize(s);heroAppearance(s);portraitModel(s);for(const p of Object.values(s.people))personAppearance(s,p);assert.equal(serialize(s),before);
});

test('the shared garment painter changes actual contour geometry and is also used by the portrait collar',()=>{
 const a=itemOutfit(armor('garment-a')),b=itemOutfit(armor('garment-b','mail'));const plain=recordSilhouette(c=>drawGarment(c,{coat:'tunic'},'#777777')),cloth=recordSilhouette(c=>drawGarment(c,a)),metal=recordSilhouette(c=>drawGarment(c,b));assert.notDeepEqual(cloth.polygons,metal.polygons);assert.notDeepEqual(plain.polygons,cloth.polygons);assert.ok(metal.polygons.flat(2).every(Number.isFinite));
 const s=createWorld(4);equip(s,armor('garment-b','mail'));const calls=[],context=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:(_,key,value)=>{calls.push(['=',key,value]);return true;}}),canvas={getContext:()=>context,setAttribute(){},classList:{toggle(){}}};drawHeroPortrait(canvas,s);assert.ok(calls.some(c=>c[0]==='='&&c[1]==='fillStyle'&&c[2]===b.trim));
 const scene=Object.create(Scene.prototype);scene.state=s;const shape=recordSilhouette(c=>{scene.ctx=c;scene.paintPerson(0,0,b.cloak,true,1,0,false,false,heroAppearance(s),race('human'));});assert.ok(shape.polygons.length>metal.polygons.length);
});

test('archive portraits use the saved garment even when the current hero has changed',()=>{
 const {s}=deathFixture('battle');Object.assign(s.rules,{'outfit-appearance':true,appearance:true,equipment:true});equip(s,armor('archive-mail','mail'));step(s);assert.equal(s.hero.alive,false);const l=s.lives.at(-1),saved=JSON.stringify(l),colors=[],context=new Proxy({}, {get:()=>()=>{},set:(_,key,value)=>{if(key==='fillStyle')colors.push(value);return true;}}),canvas={getContext:()=>context,setAttribute(){}};createNextStory(s);equip(s,armor('later-coat','coat',5));drawArchivePortrait(canvas,l);assert.ok(colors.includes(l.outfitSnapshot.cloak));assert.ok(colors.includes(l.outfitSnapshot.trim));assert.equal(JSON.stringify(l),saved);
});
