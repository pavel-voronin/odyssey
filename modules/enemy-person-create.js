import {enabled} from '../rules.js';
import {createPerson} from './lineage.js';
import {actorItemLocation,npcLooseItems} from './item-originals.js';
import {observeNPCPlace} from './npc-knowledge.js';
export function bindEnemyPerson(s,a,e){
 // First scope: a new ordinary surface-road bandit, never a replacement reader
 // for existing enemies or a rewrite of scripted bosses and underground guards.
 if(!enabled(s,'enemy-people')||e.person||e.species!=='bandit'||e.shape!=='human'||e.boss||a.interior||!['road','forest'].includes(a.type)||!e.alive)return null;
 const id=createPerson(s,{race:'human',role:'вооружённый путник',area:a.id,x:e.x,alive:true,health:e.hp,maxHealth:e.maxHp,status:'hostile',parents:[],procedural:true},{initialJob:'farmer'}),p=s.people[id];
 p.enemyBody={version:1,enemy:e.id,origin:a.id,created:s.tick,stage:'hostile',lastActionTick:-1,mercy:null,offer:null,decision:null,settled:false};e.person=id;e.name=p.name+' · '+e.name;
 const bag=npcLooseItems(s,p);for(const i of e.items||[]){bag.push(i);actorItemLocation(s,i,id);}delete e.items;observeNPCPlace(s,p);return p;
}
