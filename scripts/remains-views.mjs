import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore,log} from '../engine.js';
import {setModule} from '../rules.js';
import {deathFixture} from './death-record-scenarios.mjs';
import {meaningFixture} from './event-meaning-scenarios.mjs';
import {partyHurt} from '../modules/social.js';
import {bodyRemains} from '../modules/remains.js';
import {syncActiveActor} from '../actor-projection.js';
const dir='artifacts/body-143',visual=['animation','creature-motion','scenery','lighting','contour-shadows','color-profile','scene-planes','camera-probe','appearance','facades','outfit-appearance'];
function view(s){for(const id of visual)setModule(s,id,true);setModule(s,'remains',true);return s;}
async function save(name,s){await writeFile(`${dir}/view-${name}.json`,serialize(s));}
const lethal=deathFixture();view(lethal.s);await save('before-death',lethal.s);step(lethal.s);assert.equal(lethal.h.alive,false);await save('dead-hero',lethal.s);
const sea=deathFixture('storm');view(sea.s);step(sea.s);assert.equal(bodyRemains(sea.s,sea.h).position.kind,'transit');await save('dead-at-sea',sea.s);
const wolf=meaningFixture('victory');view(wolf.s);wolf.enemy.shape='wolf';step(wolf.s);wolf.s.tick+=81;wolf.h.x=Math.max(0,wolf.enemy.x-18);syncActiveActor(wolf.s);await save('old-wolf',wolf.s);
const toggle=restore(serialize(wolf.s));toggle.hero.x=Math.min(100,wolf.enemy.x+18);syncActiveActor(toggle);await save('toggle-wolf',toggle);
let pet;
for(let seed=0;seed<30&&!pet;seed++){const s=view(createWorld(seed)),c={id:'cat',uid:'native-cat',name:'Уголёк',attack:1,hp:1,maxHp:12};s.hero.companions=[c];partyHurt(s,100,{log});if(!s.hero.companions.length){s.tick+=81;s.hero.x=Math.min(100,s.hero.x+18);syncActiveActor(s);pet=s;}}
assert.ok(pet);await save('old-cat',pet);
console.log(JSON.stringify({hero:bodyRemains(lethal.s,lethal.h).id,sea:bodyRemains(sea.s,sea.h).position,wolfTTLProbe:true,catTTLProbe:true,scope:'Real death hooks; wolf/cat clocks explicitly moved beyond presentation TTL and wolf observer offset to avoid overlap in controlled render fixtures, not natural multi-day continuations.'}));
