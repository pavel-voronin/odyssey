import {workLossFixture,workLossContext} from './work-loss-scenarios.mjs';
import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
// Matched controlled states of one actual saved world, not a natural frequency sample.
export function repertoireFixture(kind='craft'){
 const f=workLossFixture(),{s,h}=f;setModule(s,'work-loss',false);for(const id of['repertoire','intention-balance','goods-cycle'])setModule(s,id,true);
 h.goal=null;h.repertoire=undefined;h.career.path=kind==='peaceful'?'peaceful':'adventure';h.career.rank=3;h.career.records.clockmaker={xp:h.career.xp,rank:3};h.life.reflectAfter=s.tick+100000;h.life.nextMastery=null;h.destiny.completed=true;h.property.nextAttempt=s.tick+100000;
 h.property.known={[f.o.id]:h.property.known[f.o.id],[f.other.id]:h.property.known[f.other.id]};
 const p=kind==='family'?[.4,.95]:kind==='explore'?[.95,.1]:[.1,.1];h.personality.curiosity=p[0];h.personality.generosity=p[1];h.workAfter=0;
 if(kind==='peaceful'){h.habits=['homebody'];h.quests=[];h.life.residence={since:s.tick};}
 syncActiveActor(s);return f;
}
export const repertoireContext=workLossContext;
