import {lootVictoryFixture,lootPickupFixture,lootFloorFixture} from './loot-scenarios.mjs';
import {setModule} from '../rules.js';
import {log} from '../engine.js';
export function resultsFixture(kind='victory',options={}){const f=kind==='floor'?lootFloorFixture():kind==='heirloom'?lootPickupFixture('heirloom'):lootVictoryFixture(options);setModule(f.s,'event-meaning',true);setModule(f.s,'loot-results',true);return f;}
export const resultsContext={log,random:()=>{throw Error('Existing item must not reroll');}};
export function resultItem(id,{power=2,value=20,slot='weapon',name=id}={}){return {id,name,slot,stat:slot==='weapon'?'attack':slot==='armor'?'defense':'luck',power,value,rarity:1,modifier:'plain',history:[]};}
