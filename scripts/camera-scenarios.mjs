import {writeFile} from 'node:fs/promises';
import {createWorld,serialize} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {setModule} from '../rules.js';
for(const [id,degrees,facing,tick]of [['level',0,1,100],['slope',2.5,1,100],['reverse',-2.5,-1,210]]){
  const s=createWorld(1),h=s.hero,a=s.areas.a0;
  // Prepared projection/contact specimen, not a newly generated district or quest.
  a.type='road';a.district='Жилой посад';a.name='Окраина у трёх крыш';a.cameraSlopeDegrees=degrees;
  h.area=a.id;h.x=facing===1?24:76;h.facing=facing;h.energy=100;h.hp=h.maxHp;h.hunger=5;h.lastAction='idle';h.speech='';h.goal={kind:'routeWait',area:a.id,x:h.x,until:100000};h.intent='Осмотреть окраину';h.reason='Короткий привал на прежней дороге.';h.conditions=[{id:'blessing',since:tick,until:100000}];s.tick=tick;
  setModule(s,'body',true);syncActiveActor(s);await writeFile(`artifacts/camera-${id}-life.json`,serialize(s));
}
