import {interiorFixture} from './interiors-scenarios.mjs';
import {setModule} from '../rules.js';
export function hallFixture(seed=0){
 const f=interiorFixture(seed),{s,h,p,hall,d}=f;
 for(const id of ['hall-activities','identity','work','relationships'])setModule(s,id,true);
 h.profession='bard';h.career.path='peaceful';h.area=hall.id;h.x=50;h.goal=null;h.destiny.completed=true;h.quests=[];h.companions=[];
 p.area=hall.id;p.x=76;p.agenda.task=null;p.agenda.sociability=.9;p.agenda.wealth=20;s.areas.a1.civic.treasury-=20;p.interiorStay={until:200,building:d.id};
 s.areas.a1.population=s.areas.a1.population.filter(id=>id!==p.id);hall.population.push(p.id);hall.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});
 return f;
}
