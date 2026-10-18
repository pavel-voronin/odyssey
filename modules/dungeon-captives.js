import {enabled,moduleRandom} from '../rules.js';
import {isTown} from './common.js';
import {createPerson} from './lineage.js';
// Called only while constructing a new entrance, never on loading an old dungeon.
export function seedDungeonCaptive(s,room,entrance,ctx){
 if(!['dungeon-rescue','quests','people','npc-control'].every(id=>enabled(s,id))||!isTown(entrance)||!room.dungeon||room.dungeon.floor!==1||room.visited||room.dungeon.rescueSeeded!==undefined)return false;
 room.dungeon.rescueSeeded=s.tick;
 if(moduleRandom(s,'dungeon-rescue')>=.14)return false;
 const person=createPerson(s,{race:s.hero.race,culture:entrance.culture,role:'странствующий летописец',area:room.id,x:30,health:75,alive:true,status:'captive',parents:[],procedural:true},{initialJob:'scholar'});
 // This is still construction: no body has visited this entrance. Keep the cage
 // distinct from its guard and the existing deeper threat, without weakening either.
 const deeper=room.objects.find(o=>o.kind==='enemy'&&o.x===35);if(deeper)deeper.x=48;
 const guard=ctx.spawnEnemy(s,room,{requestedSpecies:'bandit',x:18});
 const cage={id:room.id+'/captive',kind:'captive',person,name:s.people[person].name,x:30,resolved:false,dungeonRescue:{version:1,guard:guard.id,exit:entrance.id,created:s.tick}};
 guard.rescueGuard={version:1,room:room.id,cage:cage.id,person,cageX:cage.x,fee:10+Math.min(12,room.depth*2),purse:0,agreement:null,motive:'Хочет получить выкуп за пленника; дальние сокровища не продаёт.'};
 room.objects.push(cage);room.dungeon.captive=cage.id;room.dungeon.entrance=entrance.id;return true;
}
