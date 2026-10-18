import {rescueStartFixture} from './dungeon-rescue-scenarios.mjs';
import {createArea,connectAreas,createEnemy,step} from '../engine.js';
import {setModule} from '../rules.js';import {delvePlan} from '../modules/delves.js';
import {commonContext} from './common-life-scenarios.mjs';
export const layoutContext={...commonContext,addArea:createArea,connect:connectAreas,spawnEnemy:createEnemy};
export function layoutFixture({courage=.9,relics=false,rescue=false,shortcut=false}={}){
 const f=rescueStartFixture({allOn:false,courage}),{s,h,source}=f;
 for(const flag of ['delve-layouts','mechanisms'])setModule(s,flag,true);setModule(s,'dungeon-rescue',rescue);source.length=50;setModule(s,'delve-shortcuts',shortcut);
 if(relics){h.destiny.id='relics';h.destiny.completed=false;}
 if(!delvePlan(s,layoutContext))throw Error('No actual descent');
 const root=s.areas[h.delve.root],layout=root.dungeon.layout;return {...f,root,layout};
}
export function runLayout(f,limit=128){const path=[];for(let i=0;i<limit&&f.h.delve;i++){step(f.s);if(path.at(-1)!==f.h.area)path.push(f.h.area);}return path;}
