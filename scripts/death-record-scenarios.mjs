import {meaningFixture} from './event-meaning-scenarios.mjs';
import {setModule} from '../rules.js';
import {beginTransit,edgeKey} from '../modules/travel.js';
import {log} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
export function deathFixture(kind='battle',{unknownDestination=false}={}){
 const f=meaningFixture('death'),{s,h,enemy}=f;setModule(s,'death-records',true);h.intent='Сражаться: '+enemy.name;h.reason='Противник уже рядом.';h.inventory.potions=2;h.inventory.herbs=3;h.inventory.rations=4;
 if(['poison','starvation'].includes(kind)){setModule(s,'body',true);h.hp=1;h.lastDamage=999;s.tick=kind==='poison'?7:15;if(kind==='poison')h.conditions=[{id:'poison',since:0,until:100}];else h.hunger=99;}
 if(kind==='storm'){
  setModule(s,'travel',true);h.combat=null;h.goal=null;h.hp=1;h.area='a2';s.areas.a2.type='port';s.areas.a2.name='Залив Семи Камней';s.areas.a1.type='port';s.areas.a1.name='Секретный остров';s.edges[edgeKey('a2','a1')]={from:'a2',to:'a1',mode:'sea',duration:2,cost:0};beginTransit(s,'a1',10,{log});h.transit.unknown=unknownDestination;h.intent='Морской переход';h.reason='Корабль идёт своим путём.';s.randomStreams.voyages=12345;
 }
 if(kind==='caravan'){
  setModule(s,'caravans',true);h.area='a1';h.x=42;h.combat=null;h.hp=3;h.maxHp=5;h.inventory.potions=0;h.inventory.herbs=0;const p=s.people[s.areas.a1.population.find(id=>id!==h.lineage)];p.area=h.area;p.x=42;p.status='caravan';p.health=100;s.logistics.convoys.push({version:1,movement:'timed',id:'fixture-fatal-caravan',person:p.id,source:'a1',to:'a2',sourceName:s.areas.a1.name,targetName:s.areas.a2.name,path:['a1','a2'],index:0,remaining:48,sightings:{},food:12,medicine:2});h.goal={kind:'caravanRaid',area:h.area,x:42,remaining:1,convoy:'fixture-fatal-caravan',started:s.tick,caravan:true};h.intent='Перехватить караван';h.reason='Он решил забрать чужой груз.';
 }
 syncActiveActor(s);return f;
}
