import {createWorld,createArea,connectAreas} from '../engine.js';
import {CULTURES} from '../modules/cultures.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';

// Controlled geography built with the current real area/person constructors.
// No old save, invented elapsed years, cloned village stocks or past rewards.
export function settlementMap(seed=4){
 const s=createWorld(seed),names=['Сивый Мыс','Медная Заводь','Ясный Берег','Сухой Лог','Ветровая Слобода','Пихтовый Брод','Солёный Ключ','Глиняная Гавань','Тёплый Плёс','Птичья Пристань','Камышовый Дол','Белая Лука','Нижний Камень','Лунная Балка','Кедровый Край','Рыбная Косица','Тихое Устье'];
 for(let i=0;i<names.length;i++){
  const id=createArea(s,i%3===0?'port':'village',names[i],0,{continent:'c0',culture:CULTURES[i%CULTURES.length].id,danger:0});
  connectAreas(s,'a0',id);
 }
 return s;
}

export function blockedTraveller(){
 const rules=Object.fromEntries(MODULES.map(m=>[m.id,false]));rules['route-memory']=true;
 const s=createWorld(1,{rules}),h=s.hero;
 Object.assign(h,{area:'a2',x:5,hp:h.maxHp,energy:82.8,weapon:0,armor:0,goal:{kind:'rest',area:'a1',x:68,started:s.tick}});
 Object.assign(h.personality,{courage:.55,curiosity:.75,sociability:.85,generosity:.75});
 h.memory.places=['a1','a0','a2'];h.memory.avoided.a2=s.tick+64;
 h.atlas={version:1,known:['a0','a1','a2','a3','a4'],visited:[...h.memory.places],roads:['a0|a1','a1|a2','a2|a3','a2|a4'],visits:{a0:1,a1:1,a2:1}};
 const e=s.areas.a2.objects.find(o=>o.id==='a2-wolf0');e.hp=e.maxHp=1000;e.attack=100;
 syncActiveActor(s);return s;
}
