import {setModule} from '../rules.js';
import {observeProperty,workspaceAccess} from '../modules/property.js';
import {repairProperty} from '../modules/property-damage.js';
import {craftFixture,craftContext} from './craft-respect-scenarios.mjs';
export const practiceContext={...craftContext,craftBench:s=>workspaceAccess(s,craftContext)};
export function practiceFixture(){const f=craftFixture();setModule(f.s,'craft-practice',true);f.o.owner=f.h.lineage;f.o.offer=null;f.h.gold=100;observeProperty(f.s,f.a);return f;}
export function breakPracticeRoom(f){f.o.state='burned';f.o.damagedAt=f.s.tick;f.o.repair=null;f.h.goal={kind:'propertyRepair',area:f.a.id,x:f.o.x,property:f.o.id};}
export function completePracticeRepair(f){breakPracticeRoom(f);for(let i=0;i<5&&f.h.goal;i++){f.s.tick++;repairProperty(f.s,practiceContext);}if(f.h.goal)throw Error('Actual prepared restoration did not finish');}
export function threeRepairs(f){for(let i=0;i<3;i++)completePracticeRepair(f);return f;}
