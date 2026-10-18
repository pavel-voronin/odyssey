import {recordAreaVisit} from '../actor-atlas.js';
import {createWorld} from '../engine.js';
import {setModule} from '../rules.js';
import {receiveItem} from '../modules/inventory.js';
import {meetPerson} from '../modules/social.js';
import {syncActiveActor} from '../actor-projection.js';
import {invalidateNPCControl} from '../modules/npc-control.js';
import {actorItemLocation} from '../modules/item-originals.js';

export const collectionContext={log(s,text,type){s.journal.unshift({tick:s.tick,text,type});},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};s.hero.intent=intent;s.hero.reason=reason;},route(s,from,to){return from===to?[from]:[];},gainXp(){throw Error('No collection XP');}};
export function collectionFixture(){
 const s=createWorld(1),h=s.hero;
 for(const id of Object.keys(s.rules))setModule(s,id,false);
 for(const id of ['collections','equipment','item-originals','identity','npc-control','psychology'])setModule(s,id,true);
 h.area='a1';recordAreaVisit(s,'a1');h.x=42;h.hp=h.maxHp;h.energy=80;h.hunger=0;h.gold=0;h.companions=[];h.quests=[];h.habits=['collector'];h.goal=null;h.personality.curiosity=.7;h.mind.stress=20;
 for(const key of Object.keys(h.equipment))h.equipment[key]={id:'existing-'+key,name:'Старое дорожное снаряжение',base:'old',slot:key,power:100,stat:key==='armor'?'defense':key==='weapon'?'attack':'luck',value:0,rarity:1,modifier:'plain',history:[]};
 h.bag=[];const p=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&p.agenda&&p.role!=='ребёнок');
 for(const other of Object.values(s.people))if(other.id!==h.lineage&&other!==p)other.status='absent';
 Object.assign(p,{area:h.area,x:h.x,status:'resident',health:100,maxHealth:100});Object.assign(p.agenda,{job:'artisan',curiosity:.9,wealth:200,task:null,due:10000});Object.assign(p.needs,{energy:100,hunger:0,loneliness:0,sleeping:false});meetPerson(s,p.id,collectionContext);syncActiveActor(s);invalidateNPCControl(s);
 let serial=0;const item=(base='ring',options={})=>({id:'specimen-'+ ++serial,base,creator:p.id,name:base+' · работа '+p.name,slot:['coat','mail'].includes(base)?'armor':['blade','axe','staff'].includes(base)?'weapon':'charm',stat:base==='staff'?'magic':['coat','mail'].includes(base)?'defense':['blade','axe'].includes(base)?'attack':'luck',power:1,rarity:1,value:20,modifier:'plain',found:s.tick,history:[],...options});
 const receive=(base,options={})=>receiveItem(s,collectionContext,null,item(base,options));
 function giveNPC(value){p.looseItems ||= [];p.looseItems.push(value);actorItemLocation(s,value,p.id);return value;}
 return {s,h,p,item,receive,giveNPC,ctx:collectionContext};
}
