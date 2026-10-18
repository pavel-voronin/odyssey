import {createWorld} from '../engine.js';
import {setModule} from '../rules.js';
import {planQuest} from '../modules/quests.js';
import {commonContext} from './common-life-scenarios.mjs';
import {syncActiveActor} from '../actor-projection.js';
export function balanceFixture({x=0,urgent=false,off=false,parcel=false}={}){
 const s=createWorld(0),h=s.hero;for(const id of Object.keys(s.rules))setModule(s,id,false);setModule(s,'quests',true);setModule(s,'intention-balance',!off);
 s.tick=100;h.area='a5';h.x=x;h.hp=h.maxHp;h.energy=100;h.hunger=10;h.gold=0;h.combat=null;h.transit=null;h.conditions=[];h.companions=[];h.habits=[];h.career.path='peaceful';h.inventory.herbs=0;h.inventory.potions=0;h.inventory.rations=4;h.memory.avoided={};h.relations={};h.quests=[];h.questCargo={};h.commitments.personal=null;
 h.atlas={version:1,known:Object.keys(s.areas),visited:['a1','a5'],roads:Object.values(s.areas).flatMap(a=>a.links.map(id=>[a.id,id].sort().join('|'))),visits:{}};
 const giver=id=>s.areas[id].population.map(id=>s.people[id]).find(p=>p.alive&&p.status==='resident'&&p.area===id).id;
 const a={id:'supply-promise',kind:parcel?'delivery':'supply',title:parcel?'Весть из жилого посада':'Припасы для жилого посада',source:'a7',target:'a5',giver:giver('a7'),required:1,reward:24,status:'active',accepted:80,cargo:parcel,visited:false,delivered:false,cause:parcel?'Обещал передать письмо знакомому торговцу.':'В жилом посаде не хватает еды.',...(parcel?{payload:'Письмо из жилого посада',recipient:giver('a5')}: {})};
 const b={id:'other-promise',kind:urgent?'scout':'supply',title:urgent?'Проверить дорогу к торговым рядам':'Припасы для мастерских',source:urgent?'a1':'a6',target:'a5',giver:giver(urgent?'a1':'a6'),required:1,reward:urgent?0:24,status:'active',accepted:90,cargo:false,visited:false,delivered:false,cause:urgent?'Обещал принести сведения о дороге.':'Мастерам нужны припасы.'};
 a.offer=`${a.source}:${a.kind}:${a.target}:0`;b.offer=`${b.source}:${b.kind}:${b.target}:0`;h.quests=[a,b];if(parcel)h.questCargo[a.id]=a.payload;s.areas.a5.civic.food=65;s.areas.a7.civic.food=20;planQuest(s,a,commonContext);syncActiveActor(s);return {s,h,a,b,stock:s.areas.a5};
}
