import {writeFile} from 'node:fs/promises';import {weaponFixture} from './weapon-styles-scenarios.mjs';import {step,serialize} from '../engine.js';import {syncActiveActor} from '../actor-projection.js';import {setModule} from '../rules.js';
const root='artifacts/weapon-styles-122';
for(const style of ['quick','heavy']){
 const f=weaponFixture({style});for(const id of ['animation','appearance','scenery','facades','lighting','color-profile','scene-planes','outfit-appearance','source-shadows','effects'])setModule(f.s,id,true);
 step(f.s);syncActiveActor(f.s);await writeFile(`${root}/ui-${style}.json`,serialize(f.s));console.log(JSON.stringify({style,action:f.h.lastAction,energy:f.h.energy,hp:f.h.hp,enemyHp:f.enemy.hp}));
}
