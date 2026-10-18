import {meaningFixture} from './event-meaning-scenarios.mjs';
import {MODULES,setModule} from '../rules.js';
import {recordLastingInjury} from '../modules/injury-state.js';
import {syncActiveActor} from '../actor-projection.js';

// Prepared damage conditions, not a natural-life frequency audit. At most48
// cause IDs and only three explicitly selected anatomy/channel visual cases.
export function injuryFixture({race='human',kind='scar'}={}){
 const {s,h,enemy}=meaningFixture();for(const m of MODULES)setModule(s,m.id,['lasting-injuries','appearance','lineage',...(kind==='burn'?['elements']:[])].includes(m.id));
 const p=s.people[h.lineage];h.race=p.race=race;h.hp=h.maxHp=100;enemy.species='wolf';enemy.element=kind==='burn'?'fire':'normal';enemy.attack=27;s.tick=1;const before=100,after=70;h.hp=after;syncActiveActor(s);
 let mark=null;for(let i=0;i<48&&!mark;i++){enemy.id='injury-source-'+i;mark=recordLastingInjury(s,p,enemy,{before,after,maximum:100,area:h.area,controller:'actor'},{log:()=>{}});}
 if(!mark)throw Error('No prepared eligible cause within48 cases');return {s,h,p,enemy,mark};
}
