import {forgingFixture,placeAtBench,forgingContext} from './forging-scenarios.mjs';
import {setModule} from '../rules.js';
import {makeItem,receiveItem} from '../modules/inventory.js';
import {syncActiveActor} from '../actor-projection.js';
import {requestSocketService,performSocketService,collectSocketService} from '../modules/socket-service.js';
export const socketContext=forgingContext;
export function socketFixture(){const f=forgingFixture({npc:true,interior:true}),{s,h}=f;for(const k of ['sockets','magic','containers','npc-control'])setModule(s,k,true);const at=placeAtBench(f);Object.assign(h,{area:at.area,x:at.x,hp:h.maxHp,hunger:0});h.magic.spells=['ward'];h.magic.mana=10;h.inventory.relics=1;let calls=0;const ctx={...forgingContext,random:()=>[.25,.11,0,0][calls++]??0};const base=makeItem(s,ctx,1);receiveItem(s,ctx,1,base);syncActiveActor(s);return {...f,client:s.people[h.lineage],base};}
export function socketWork(f,operation,options={}){const {s,client,worker,site}=f,o=requestSocketService(s,client,worker,site,operation,options);if(!o)throw Error('request refused: '+operation);s.tick++;if(!performSocketService(s,worker,o.id))throw Error('work refused');s.tick++;if(!collectSocketService(s,client,o.id))throw Error('collection refused');return o;}
export function installedSocket(){const f=socketFixture();socketWork(f,'create');f.gem=f.h.bag.find(i=>i.kind==='socketComponent');socketWork(f,'install',{base:f.base,component:f.gem});return f;}
