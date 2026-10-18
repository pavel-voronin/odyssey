import {writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
const s=createWorld(1),h=s.hero,a=s.areas.a0;
// Prepared route specimen; production assigns one profile on new road depths 2,6,10,... only.
a.length=260;a.roadProfile='long-tract';a.name='Старая дорога';
for(const id of ['weather','body','stories','caravans','events','people','faction-paths'])setModule(s,id,false);
Object.assign(h,{area:a.id,x:0,distance:0,energy:100,hp:h.maxHp,hunger:0,combat:null,transit:null,lastAction:'idle',speech:'',goal:{kind:'routeWait',area:'a1',x:42,until:100000},intent:'Пройти старую дорогу',reason:'Длинный тракт ведёт к знакомому поселению.'});syncActiveActor(s);
await writeFile('artifacts/long-road-start-life.json',serialize(s));
for(let i=1;i<=45;i++){
  step(s);if(i===20||i===44||i===45)await writeFile(`artifacts/long-road-${i}-life.json`,serialize(s));
  if(i===20){
    const off=restore(serialize(s));setModule(off,'camera-probe',false);await writeFile('artifacts/long-road-off-life.json',serialize(off));
    const reverse=restore(serialize(s));reverse.hero.goal={kind:'routeWait',area:reverse.hero.area,x:0,until:100000};reverse.hero.intent='Вернуться по дороге';reverse.hero.reason='Подготовленная проверка разворота на том же пути.';await writeFile('artifacts/long-road-reverse-life.json',serialize(reverse));
  }
  if(i===30){const fresh=restore(serialize(s));setModule(fresh,'body',true);fresh.hero.conditions=[{id:'blessing',since:fresh.tick,until:100000}];await writeFile('artifacts/long-road-fresh-life.json',serialize(fresh));}
}
console.log({tick:s.tick,area:h.area,x:h.x,distance:h.distance,energy:h.energy,visits:s.areas.a1.visits});
