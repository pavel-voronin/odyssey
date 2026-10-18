import assert from 'node:assert/strict';
import {createWorld,route,knownRoute,log} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {buyTextPaper,writeWorkNotice,copyText,giveText} from '../modules/texts.js';
export const textContext={route,knownRoute,log,goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};s.hero.intent=intent;s.hero.reason=reason;}};
export function textFixture(){
 const s=createWorld(4),h=s.hero;const keep=['texts','equipment','containers','identity','goods-cycle','people','npc-control','npc-knowledge'];for(const m of MODULES)setModule(s,m.id,keep.includes(m.id));
 const author=Object.values(s.people).find(p=>p.alive&&p.agenda?.job==='scholar'&&s.areas[p.area]?.civic),reader=Object.values(s.people).find(p=>p.alive&&p.agenda?.job==='merchant'&&p.id!==h.lineage),a=s.areas[author.area];assert.ok(reader);
 for(const p of Object.values(s.people))if(![h.lineage,author.id,reader.id].includes(p.id))p.status='absent';
 for(const p of [author,reader]){p.area=a.id;p.x=42;p.status='resident';p.health=p.maxHealth||100;p.ailment=null;Object.assign(p.agenda,{task:null,due:1e9});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false,loneliness:0});}
 author.agenda.duty=.8;author.agenda.due=0;a.civic.treasury-=8;author.agenda.wealth+=8; // Prepared finite savings, not claimed earned income.
 for(const area of Object.values(s.areas))for(const o of area.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 a.population ||= [];for(const p of [author,reader])if(!a.population.includes(p.id))a.population.push(p.id);h.goal=null;return{s,h,a,author,reader};
}
export function twoTextCopies(f){const {s,author:p}=f;s.tick++;const first=buyTextPaper(s,p);assert.ok(first);s.tick++;assert.equal(writeWorkNotice(s,p,first.id),first);s.tick++;const second=buyTextPaper(s,p);assert.ok(second);s.tick++;assert.equal(copyText(s,p,first.id,second.id),second);return{...f,first,second,work:s.literature.works[first.textCopy.content]};}
export function giveCopy(f){f.s.tick++;assert.equal(giveText(f.s,f.author,f.reader,f.second.id),true);return f;}
