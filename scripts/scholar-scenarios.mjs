import {askTextReader} from '../modules/literacy.js';
import {setModule} from '../rules.js';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {marketWallet} from '../modules/market.js';
import {buyTextPaper,writeWorkNotice,copyText,giveText,readText} from '../modules/texts.js';
import {compareWitnesses,inspectWitnessFact} from '../modules/scholar.js';
export function scholarFixture({read=true,contradiction=false}={}){
 const keep=['texts','equipment','identity','goods-cycle','containers','people','npc-control','npc-knowledge','skill-branches','districts','background-towns'],s=createWorld(4,{rules:Object.fromEntries(MODULES.map(m=>[m.id,keep.includes(m.id)]))}),h=s.hero,p=s.people[h.lineage],writers=Object.values(s.people).filter(q=>q.alive&&q.agenda?.job==='scholar'&&q.id!==p.id).slice(0,3);assert.equal(writers.length,3);const areas=['a1','a5'].map(id=>s.areas[id]);
 Object.assign(h,{area:areas[0].id,x:42,profession:'scholar',culture:'deep',hp:h.maxHp,energy:100,hunger:0,goal:null,combat:null,transit:null,companions:[],quests:[]});p.culture='deep';h.stories.active=null;h.career.path='peaceful';h.personality.curiosity=.9;
 for(const q of Object.values(s.people))if(![p,...writers].includes(q))q.status='absent';
 for(const q of writers){Object.assign(q,{status:'resident',health:q.maxHealth||100,ailment:null});Object.assign(q.needs,{energy:100,hunger:0,sleeping:false});Object.assign(q.agenda,{task:null,due:1e9,duty:.9,curiosity:.9});const add=Math.max(0,8-marketWallet(s,q.id));s.areas[q.area].civic.treasury-=add;setActorMoney(s,q,marketWallet(s,q.id)+add);}
 for(const a of Object.values(s.areas))for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}const add=Math.max(0,12-h.gold);areas[0].civic.treasury-=add;h.gold+=add;syncActiveActor(s);
 const books=[],facts=[];
 for(const [i,author]of [p,...writers].entries()){
  const a=areas[i<2?0:1];Object.assign(h,{area:a.id,x:42});syncActiveActor(s);if(author!==p)Object.assign(author,{area:a.id,x:42});
  if(contradiction&&i===1){const cash=a.civic.treasury;a.civic.treasury=0;h.gold+=cash;syncActiveActor(s);}
  s.tick++;const paper=buyTextPaper(s,author);assert.ok(paper,JSON.stringify({i,id:author.id,cash:marketWallet(s,author.id),area:a.id,energy:author.needs.energy,h:h.energy,stock:a.goods?.sources?.materials.stock,health:author.health}));s.tick++;assert.ok(writeWorkNotice(s,author,paper.id));let book=paper;
  if(author!==p){s.tick++;book=buyTextPaper(s,author);assert.ok(book);s.tick++;assert.ok(copyText(s,author,paper.id,book.id));s.tick++;assert.equal(giveText(s,author,p,book.id),true);}
  books.push(book);facts.push(s.literature.works[book.textCopy.content]);if(read){s.tick++;assert.equal(readText(s,p,book.id),true);}
 }
 Object.assign(h,{area:areas[0].id,x:42});syncActiveActor(s);return {s,h,p,writers,areas,books,facts};
}
export function inspectPair(f,index){const {s,h,p,areas,books}=f;h.area=areas[index].id;h.x=42;syncActiveActor(s);s.tick++;const c=compareWitnesses(s,p,books[index*2].textCopy.content,books[index*2+1].textCopy.content);assert.ok(c);s.tick++;const o=inspectWitnessFact(s,p,c.id);assert.ok(o);return {c,o};}
export function trainedScholar(f=scholarFixture()){inspectPair(f,0);inspectPair(f,1);return f;}
export const exactScholar=s=>{syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);};

export function trainedNPCScholar(f=scholarFixture()){const {s,h,p,writers,areas,books}=f,t=writers[0];setModule(s,'literacy',true);for(const i of [0,2,3]){h.area=i<2?areas[0].id:areas[1].id;h.x=42;syncActiveActor(s);Object.assign(t,{area:h.area,x:42});s.tick++;assert.equal(askTextReader(s,p,t,books[i].id).status,'reported');}Object.assign(t,{area:areas[0].id,x:42});s.tick++;assert.ok(readText(s,t,t.looseItems.find(i=>i.textCopy?.content===books[1].textCopy.content).id));for(let i=0;i<2;i++){Object.assign(t,{area:areas[i].id,x:42});s.tick++;const c=compareWitnesses(s,t,books[i*2].textCopy.content,books[i*2+1].textCopy.content);assert.ok(c);s.tick++;assert.ok(inspectWitnessFact(s,t,c.id));}h.area=areas[0].id;h.x=42;syncActiveActor(s);Object.assign(t,{area:h.area,x:42});f.teacher=t;return f;}
