import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,step,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {meaningFixture,performMeaning} from './event-meaning-scenarios.mjs';
import {assertSameSave} from './life-save-compare.mjs';
export async function meaningControls(directory){
 await mkdir(directory,{recursive:true});const rows=[];
 for(const kind of ['strike','death','victory','heal','buy']){
  const f=meaningFixture(kind);for(const id of ['appearance','scenery','facades','scene-planes','lighting','source-shadows','contour-shadows','color-profile','animation','camera-probe'])setModule(f.s,id,true);
  if(kind==='death')f.enemy.name='Пепельный хранитель затонувшей библиотеки · каменная кожа, пожиратель магии, холодное эхо';
  const before=serialize(f.s),copy=restore(before);await writeFile(`${directory}/${kind}.before.json`,before);
  if(kind==='buy'){copy.hero.goal={kind:'trade',area:copy.hero.area,x:58,started:copy.tick};copy.hero.intent='Купить более надёжное оружие';copy.hero.reason='Он накопил на следующую покупку.';await writeFile(`${directory}/native-buy.before.json`,serialize(copy));step(copy);assert.equal(copy.hero.weapon,1);await writeFile(`${directory}/native-buy.expected.json`,serialize(copy));}
  performMeaning(f,kind);if(kind!=='buy'){step(copy);assertSameSave(serialize(f.s),serialize(copy));}
  await writeFile(`${directory}/${kind}.after.json`,serialize(f.s));rows.push({kind,tick:f.s.tick,alive:f.h.alive,events:f.s.journal.filter(e=>e.meaning).map(e=>({type:e.type,meaning:e.meaning})),gold:f.h.gold,weapon:f.h.weapon});
 }
 const legacy=meaningFixture('death');setModule(legacy.s,'event-meaning',false);legacy.enemy.name=legacy.h.name;step(legacy.s);assert.equal(legacy.h.alive,false);setModule(legacy.s,'event-meaning',true);await writeFile(`${directory}/legacy-same-name-death.json`,serialize(legacy.s));
 await writeFile(`${directory}/controls.json`,JSON.stringify(rows,null,2));return rows;
}
