import {createWorld,serialize} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {writeFile} from 'node:fs/promises';
const rows=[];
for(let seed=0;seed<24;seed++){
 const s=createWorld(seed);while(!lifeFinished(s)&&s.tick<38400)advanceLife(s);const h=s.hero;
 rows.push({seed,ticks:s.tick-h.born,final:h.life.outcome||'continuing',cause:h.life.motive||s.lives.at(-1)?.cause||null,profession:h.profession,level:h.level,places:h.memory.places.length,work:h.counters.peacefulWork||0,quests:h.quests.filter(q=>q.status==='done').length,reflectAfter:h.life.reflectAfter-h.born,bytes:Buffer.byteLength(serialize(s))});
 console.log(seed,s.tick,h.life.outcome||'continuing');
}
await writeFile(process.argv[2]||'artifacts/life-length-before.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
