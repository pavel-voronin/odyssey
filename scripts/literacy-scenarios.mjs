import assert from 'node:assert/strict';
import {textFixture,twoTextCopies,textContext} from './text-scenarios.mjs';
import {setModule} from '../rules.js';import {giveText} from '../modules/texts.js';
import {studyTextLesson} from '../modules/literacy.js';
export const literacyContext=textContext;
export function prepareTextPerson(f,p){
 p.area=f.a.id;p.x=42;p.status='resident';p.health=p.maxHealth||100;p.ailment=null;Object.assign(p.needs,{energy:100,hunger:0,sleeping:false,loneliness:0});Object.assign(p.agenda,{task:null,due:1e9,curiosity:.85});if(!f.a.population.includes(p.id))f.a.population.push(p.id);return p;
}
export function literacyFixture({foreign=false}={}){
 const f=twoTextCopies(textFixture()),{s,author,reader,a}=f;setModule(s,'literacy',true);
 const pupil=Object.values(s.people).find(p=>p.alive&&p.id!==f.h.lineage&&(foreign?p.agenda?.job==='merchant'&&p.culture!==author.culture:p.agenda?.job==='farmer'&&p.culture===author.culture));assert.ok(pupil);
 prepareTextPerson(f,pupil);a.civic.treasury-=8;pupil.agenda.wealth+=8; // Finite prepared study funds.
 author.agenda.task=null;author.agenda.due=1e9;s.tick++;assert.equal(giveText(s,author,pupil,f.second.id),true);
 return{...f,pupil,teacher:author,buyer:reader};
}
export function literacyLesson(f,branch,teacher=f.teacher){f.s.tick++;const result=studyTextLesson(f.s,f.pupil,teacher,f.second.id,branch,literacyContext);assert.ok(['progress','learned'].includes(result.status),result.status);return result;}
export function learnTextBranch(f,branch,teacher=f.teacher){let result;for(let n=0;n<3;n++)result=literacyLesson(f,branch,teacher);assert.equal(result.status,'learned');return f;}
