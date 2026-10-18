import {lethalViewFixture} from './death-view-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export function lootVictoryFixture({positive=true,collector=false,equipment=true,full=false}={}){
 const {s,h,enemy}=lethalViewFixture(),a=s.areas[h.area];
 setModule(s,'equipment',equipment);setModule(s,'creature-motion',true);
 s.randomStreams.loot=positive?0:1000;h.habits=collector?['collector']:[];h.conditions=[];h.quests=[];h.delve=null;h.weapon=3;h.armor=3;h.career.xp=0;h.career.rank=1;h.bag=[];h.equipment={weapon:null,armor:null,charm:null};
 Object.assign(enemy,{hp:1,maxHp:1,attack:1,alive:true,shape:'wolf',powers:[],element:'normal',mutation:'none',tactic:'simple',patrol:0});
 a.objects=a.objects.filter(o=>o.kind!=='enemy'||o===enemy);
 if(full){
  const item=(id,slot='charm')=>({id,name:'Контрольный предмет '+id,slot,stat:slot==='weapon'?'attack':slot==='armor'?'defense':'luck',power:1000,value:10000,rarity:4,modifier:'plain',history:[]});
  for(const slot of ['weapon','armor','charm'])h.equipment[slot]=item('fixture-equipped-'+slot,slot);
  h.bag=Array.from({length:24},(_,i)=>item('fixture-bag-'+i));
 }
 syncActiveActor(s);return {s,h,enemy};
}
export function lootPickupFixture(kind='relic'){
 const {s,h,enemy}=lootVictoryFixture({positive:false}),a=s.areas[h.area];a.objects=a.objects.filter(o=>o!==enemy);
 const object={id:'fixture-pickup',kind,name:kind==='relic'?'Контрольная реликвия':kind==='heirloom'?'Поклажа прежнего путника':'Контрольный кошель',x:h.x,taken:false,...(kind==='loot'?{gold:12}:kind==='heirloom'?{gold:5,items:[{id:'fixture-original-compass',name:'Старый компас',base:'compass',slot:'charm',stat:'luck',power:1,value:12,rarity:2,modifier:'plain',found:0,history:[{tick:0,text:'Сделан прежним путником.'}]}]}:{})};a.objects.push(object);
 h.combat=null;h.goal={kind:'collect',area:h.area,x:h.x,object:object.id,started:s.tick};syncActiveActor(s);return {s,h,object};
}
export function lootFloorFixture(){
 const {s,h,enemy}=lootVictoryFixture(),a=s.areas[h.area];setModule(s,'delves',true);a.type='dungeon';a.objects=a.objects.filter(o=>o!==enemy);a.dungeon={root:a.id,floor:1,cleared:false};
 h.combat=null;h.goal=null;h.delve={root:a.id,room:a.id,started:s.tick,floors:1,cleared:0};syncActiveActor(s);return {s,h,area:a};
}
