import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,restore,step,knownRoute} from '../engine.js';
import {roadCase} from './road-comparison.mjs';
import {receiveItem} from '../modules/inventory.js';
import {estimatePlan} from '../modules/preparation.js';
import {armorEffect} from '../modules/armor.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
const dir='artifacts/armor-102';await mkdir(dir,{recursive:true});const rows=[];
for(const base of ['coat','mail']){
 const {s,h,a}=roadCase({length:260,weather:'clear'});for(const id of ['equipment','armor-balance','loot-results','event-meaning','outfit-appearance'])setModule(s,id,true);h.armor=1;h.goal={kind:'hunt',area:a.id,x:h.x};
 receiveItem(s,{knownRoute,random(){throw Error('no draw');},log(){}},null,{id:'control-'+base,base,name:base==='mail'?'Кольчуга дорожного стража':'Лёгкий плащ путешественника',slot:'armor',stat:'defense',power:2,value:15,rarity:1,found:s.tick,foundArea:a.id,history:[]});assert.equal(h.equipment.armor.base,base);
 h.goal={kind:'routeWait',area:a.id,x:100,until:100000};h.intent='Пройти знакомую дорогу';h.reason='Известный путь, текущий доспех и запас сил.';const forecast=estimatePlan(s,h.goal,{route:()=>[a.id]}),effect=armorEffect(s,h.equipment.armor);syncActiveActor(s);await writeFile(`${dir}/${base}.before.json`,serialize(s));const start=h.energy,copy=restore(serialize(s));step(copy);assert.equal(copy.hero.lastAction,'walk');await writeFile(`${dir}/${base}.after.json`,serialize(copy));rows.push({base,effect,forecast,actualFirstStepEnergy:start-copy.hero.energy});
}
assert.ok(rows[1].forecast.energyCost>rows[0].forecast.energyCost);await writeFile(`${dir}/controls.json`,JSON.stringify(rows,null,2));console.log(rows);
