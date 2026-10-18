import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createWorld,step,serialize} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export function campEnvironmentFixture(type='desert',seed=7,{sites=true}={}){
  const s=createWorld(seed),h=s.hero,parent=s.areas.a0;setModule(s,'camp-sites',sites);
  for(const id of ['body','stories','caravans','faction-paths','events','people'])setModule(s,id,false);
  parent.type=type;parent.realm=type==='cave'?'underground':'surface';delete parent.climate;
  h.area=parent.id;h.x=24;h.goal=null;h.energy=12;h.hp=h.maxHp;h.hunger=0;
  for(let i=0;i<3;i++)step(s);
  const camp=s.areas[h.area];if(!camp.temporaryCamp)throw Error('Actual camp was not pitched');
  return {s,h,parent,camp};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  for(const type of ['forest','desert','mountain','cave']){
    const {s,h,parent,camp}=campEnvironmentFixture(type);
    // A prepared view specimen. Actual camp pitching and its expense happened above.
    parent.name={forest:'Мшистая чаща',desert:'Красные барханы',mountain:'Седой перевал',cave:'Подземный грот'}[type];
    camp.name='Лагерь: '+parent.name;
    h.goal={kind:'routeWait',area:h.area,x:h.x,until:100000};h.intent='Отдохнуть у костра';h.reason='Походный лагерь в той же местности.';syncActiveActor(s);
    await writeFile(`artifacts/camp-environment-${type}-life.json`,serialize(s));
  }
}
