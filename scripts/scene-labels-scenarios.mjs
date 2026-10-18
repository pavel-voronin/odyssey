import {writeFile} from 'node:fs/promises';
import {lodgingFixture} from './lodging-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {lodgingPlan,bookRoom} from '../modules/lodging.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {serialize} from '../engine.js';
// Prepared UI stress case, not a generated-life frequency sample.
const {s,h,room}=lodgingFixture();lodgingPlan(s,commonContext);bookRoom(s,commonContext);
s.tick=169;s.chronology.year=999;room.name='Таверна «Три фонаря у Старой переправы»: гостевая над мастерскими Красной Пристани';h.area=room.id;h.x=20;h.hp=h.maxHp;h.energy=100;h.hunger=5;h.speech='';h.lastAction='idle';h.goal={kind:'routeWait',area:room.id,x:20,until:100000};h.intent='Отдохнуть перед дорогой';h.reason='Сил достаточно; герой пока остаётся в комнате.';
h.conditions=[{id:'blessing',since:160,until:100000},{id:'fever',since:160,until:100000}];setModule(s,'effects',true);setModule(s,'body',true);setModule(s,'weather',true);syncActiveActor(s);
await writeFile('artifacts/scene-labels-long-life.json',serialize(s));
