import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actorPalette,buildingPalette,biomePalette,swatch,paletteCacheSize,colorContrast} from '../palette.js';
import {appearance,heroAppearance} from '../appearance.js';
import {scenery,houseProfile} from '../scenery.js';
import {createWorld,serialize,restore} from '../engine.js';
const v2=JSON.parse(readFileSync(new URL('./fixtures/palette-v2.json',import.meta.url),'utf8'));
test('the current material generator is the sole palette and explicit stored colors remain authoritative',()=>{
 for(const c of v2.actors){assert.deepEqual(actorPalette(c.seed,c.id,c.culture),c.colors);const stored={skin:'#123456'},actor={id:c.id,culture:c.culture};assert.equal(appearance(c.seed,actor,stored).skin,'#123456');assert.deepEqual(stored,{skin:'#123456'});assert.equal(appearance(c.seed,actor).paletteVersion,2);}
 for(const c of v2.houses)assert.deepEqual(buildingPalette(c.seed,c.area,c.index),c.colors);
 const a={id:'current-area',name:'Город',type:'village',culture:'river',paletteVersion:2};assert.equal(scenery(4,a).paletteVersion,2);assert.deepEqual(biomePalette(4,a,['#123456']),biomePalette(4,a,['#123456']));assert.notDeepEqual(biomePalette(4,a,['#123456']),['#123456']);
});

test('semantic swatches have stable conversion, bounded caching and order-independent output after eviction',()=>{
 assert.equal(swatch('biome',0,.5,.5),'#bf4040');assert.equal(swatch('biome',120,.5,.5),'#40bf40');assert.equal(swatch('biome',240,.5,.5),'#4040bf');
 const before=actorPalette(77,'same-person','river');for(let i=0;i<8000;i++)swatch('cloth',i*.733,.3+(i%300)/1000,.35+(i%250)/1000);
 assert.ok(paletteCacheSize()<=2048);assert.deepEqual(actorPalette(77,'same-person','river'),before);
 assert.equal(swatch('cloth',12.0001,.33331,.44441),swatch('cloth',12.0002,.33332,.44442));
});
test('new material palettes retain broad actor and roof variation with distinct cloth accents and door values',()=>{
 const actors=Array.from({length:1000},(_,i)=>actorPalette(123,'person-'+i,'culture-'+i%8));
 const buildings=Array.from({length:1000},(_,i)=>buildingPalette(123,{id:'a'+i,culture:'culture-'+i%8},i%3));
 assert.ok(new Set(actors.map(p=>p.cloak)).size>800);assert.ok(new Set(buildings.map(p=>p.roofColor)).size>800);
 for(const p of actors){for(const [key,value]of Object.entries(p))if(key!=='paletteVersion')assert.match(value,/^#[a-f0-9]{6}$/);assert.ok(colorContrast(p.cloak,p.scarfColor)>1.5);}
 for(const p of buildings)assert.ok(colorContrast(p.plaster,p.doorColor)>2.5);
});
test('new canonical colors persist across loading and surroundings without consuming any simulation state',()=>{
 const s=createWorld(0),before=serialize(s),look=heroAppearance(s),loaded=restore(before);
 assert.equal(s.hero.appearance.paletteVersion,2);assert.equal(s.people[s.hero.lineage].paletteVersion,2);assert.equal(s.areas.a1.paletteVersion,2);assert.deepEqual(heroAppearance(loaded),look);
 for(const area of Object.values(s.areas)){appearance(s.seed,s.people[s.hero.lineage],s.hero.appearance);houseProfile(s.seed,area,0);biomePalette(s.seed,area,['#34554e','#7c9a7a']);}
 assert.equal(serialize(s),before);
 for(const area of ['a1','a2','a3']){loaded.hero.area=area;assert.deepEqual(heroAppearance(loaded),look);}
});
test('new thatch stays straw-colored and stone walls use the stone material without changing legacy roof geometry',()=>{
 const a={id:'material-town',name:'Город',type:'village',culture:'river'},modern={...a,paletteVersion:2};let straw=0,stone=0;
 for(let i=0;i<100;i++){
  const old=houseProfile(77,a,i),p=houseProfile(77,modern,i);assert.equal(p.roof,old.roof);assert.equal(p.width,old.width);assert.equal(p.door,old.door);
  if(p.roof==='thatch'){assert.equal(p.roofColor,p.strawColor);straw++;}if(p.material==='stone'){assert.equal(p.plaster,p.stoneColor);stone++;}
 }
 assert.ok(straw>0&&stone>0);
});
