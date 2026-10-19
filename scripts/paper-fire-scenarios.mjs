import assert from 'node:assert/strict';
import {libraryFixture} from './library-scenarios.mjs';
import {homeFixture,fitHome,homeContext} from './home-scenarios.mjs';
import {setModule} from '../rules.js';
import {buyTextPaper,writeWorkNotice,copyText,writeSequenceManual} from '../modules/texts.js';
import {actualHearth} from '../modules/hearth-food.js';
import {brothCookAction} from '../modules/cooking.js';
import {damageStructure} from '../modules/building-condition.js';
import {cacheItems} from '../modules/item-originals.js';
import {addRoute} from '../modules/travel.js';
import {createGrate,operateGrate} from '../modules/mechanisms.js';
import {serialize} from '../engine.js';import {syncActiveActor} from '../actor-projection.js';
export const paperContext=homeContext;
export function paperFixture({hearth=false,manual=false}={}){
 let f=hearth?fitHome(homeFixture({hearth:true})):libraryFixture();const {s,h,room}=f;for(const id of ['texts','libraries','item-originals','paper-fire','facades','building-ruins'])setModule(s,id,true);const owner=s.people[h.lineage],exterior=s.areas[room.interior.exterior];
 h.quests=[];h.stories.active=null;h.hp=h.maxHp;h.energy=100;h.hunger=0;h.personality.curiosity=.9;h.goal=null;
 if(hearth){h.area=exterior.id;h.x=42;syncActiveActor(s);
  if(manual){for(const id of ['mechanisms','mechanism-sequences','travel'])setModule(s,id,true);const [to,bypass]=Object.keys(s.areas).filter(id=>id!==exterior.id&&!s.areas[id].interior).slice(0,2);for(const [from,dest]of [[exterior.id,to],[exterior.id,bypass],[to,bypass]]){if(!s.areas[from].links.includes(dest))s.areas[from].links.push(dest);if(!s.areas[dest].links.includes(from))s.areas[dest].links.push(from);addRoute(s,from,dest,{mode:'stairs',duration:2});}f.g=createGrate(s,exterior.id,to,bypass,{sequence:true});assert.ok(f.g);h.x=f.g.lever.x;syncActiveActor(s);for(let n=0;n<3;n++){s.tick++;assert.ok(operateGrate(s,owner,[exterior.id,to].sort().join('|'),'inspect',homeContext));}h.x=42;syncActiveActor(s);}
  s.tick++;f.first=buyTextPaper(s,owner);assert.ok(f.first);s.tick++;assert.ok(manual?writeSequenceManual(s,owner,f.first.id,f.g.id):writeWorkNotice(s,owner,f.first.id));s.tick++;f.second=buyTextPaper(s,owner);assert.ok(f.second);s.tick++;assert.ok(copyText(s,owner,f.first.id,f.second.id));
 }
 Object.assign(f,{owner,exterior});h.area=room.id;h.x=56;h.energy=100;h.hunger=0;syncActiveActor(s);return f;
}
export function savePaper(f){syncActiveActor(f.s);return serialize(f.s);}
export function sparkBooks(f){const {s,h,room}=f,fire=actualHearth(s,room);assert.ok(fire);h.area=room.id;h.x=fire.x;h.energy=100;h.hunger=45;h.goal={kind:'brothCook',area:room.id,x:fire.x,remaining:3};syncActiveActor(s);
 // One prepared rare RNG boundary, not a frequency estimate or a seed search.
 s.randomStreams['paper-fire']=Number((-1013904223n*4276115653n)&0xffffffffn);
 for(let n=0;n<3;n++){s.tick++;assert.ok(brothCookAction(s,homeContext));}h.goal=null;return f;
}
export function keepBackupOutside(f){const {s,h,second,exterior}=f;h.bag.splice(h.bag.indexOf(second),1);h.area=exterior.id;h.x=95;syncActiveActor(s);f.backup=cacheItems(s,[second],{area:exterior.id,x:95,leftBy:h.lineage,name:'Сохранённая копия'});h.area=f.room.id;h.x=56;syncActiveActor(s);return f;}
export function burnBuilding(f){f.s.tick++;const profile=f.exterior.facades.profiles.find(p=>p.id===f.d.building);assert.ok(profile);assert.ok(damageStructure(f.s,f.exterior,profile,'fire'));return f;}
export function paperOutside(f){f.h.area=f.exterior.id;f.h.x=42;f.h.energy=100;f.h.hunger=0;f.h.goal=null;syncActiveActor(f.s);f.s.tick++;const paper=buyTextPaper(f.s,f.owner);assert.ok(paper);return paper;}
