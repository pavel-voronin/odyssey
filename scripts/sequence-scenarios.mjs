import assert from 'node:assert/strict';
import {textFixture,textContext} from './text-scenarios.mjs';
import {prepareTextPerson} from './literacy-scenarios.mjs';
import {setModule} from '../rules.js';
import {addRoute} from '../modules/travel.js';
import {createGrate,operateGrate} from '../modules/mechanisms.js';
import {buyTextPaper,writeSequenceManual,copyText,giveText} from '../modules/texts.js';
export const sequenceContext=textContext;
export function sequenceFixture(){
 const f=textFixture(),{s,h,a,author}=f;for(const id of ['mechanisms','mechanism-sequences','travel','literacy'])setModule(s,id,true);
 const [to,bypass]=Object.keys(s.areas).filter(id=>id!==a.id&&!s.areas[id].interior).slice(0,2);
 for(const [x,y]of [[a.id,to],[a.id,bypass],[to,bypass]]){if(!s.areas[x].links.includes(y))s.areas[x].links.push(y);if(!s.areas[y].links.includes(x))s.areas[y].links.push(x);addRoute(s,x,y,{mode:'stairs',duration:2});}
 const g=createGrate(s,a.id,to,bypass,{sequence:true});assert.ok(g?.sequence);
 h.area=a.id;h.x=g.lever.x;h.hp=h.maxHp;h.energy=100;h.hunger=0;h.combat=null;h.transit=null;h.goal=null;h.personality.curiosity=.9;
 const pupil=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&p.agenda?.job==='farmer'&&p.culture===author.culture);assert.ok(pupil);prepareTextPerson(f,pupil);a.civic.treasury-=8;pupil.agenda.wealth+=8;
 author.x=pupil.x=g.lever.x;const p=s.people[h.lineage];return {...f,p,pupil,g,key:[a.id,to].sort().join('|'),to,bypass};
}
export function inspectSequence(f,p=f.p){for(let i=0;i<3;i++){f.s.tick++;assert.equal(operateGrate(f.s,p,f.key,'inspect',sequenceContext),true);}return f;}
export function sequenceCopies(f=sequenceFixture()){
 const {s,a,author,g,pupil}=f;inspectSequence(f,author);author.x=42;pupil.x=42;
 s.tick++;const first=buyTextPaper(s,author);assert.ok(first);s.tick++;assert.equal(writeSequenceManual(s,author,first.id,g.id),first);
 s.tick++;const second=buyTextPaper(s,author);assert.ok(second);s.tick++;assert.equal(copyText(s,author,first.id,second.id),second);s.tick++;assert.equal(giveText(s,author,pupil,second.id),true);
 return {...f,first,second,work:s.literature.works[first.textCopy.content]};
}
