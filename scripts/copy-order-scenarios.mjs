import assert from 'node:assert/strict';
import {textFixture} from './text-scenarios.mjs';
import {buyTextPaper,writeWorkNotice} from '../modules/texts.js';
import {requestCopyOrder,workCopyOrder} from '../modules/copy-orders.js';
import {syncActiveActor} from '../actor-projection.js';
import {setActorMoney} from '../actor-projection.js';
import {marketWallet} from '../modules/market.js';
export function copyFixture(){
 const f=textFixture(),{s,a,author:client}=f,master=Object.values(s.people).find(p=>p.alive&&p.id!==client.id&&p.id!==s.hero.lineage&&p.agenda?.job==='scholar');assert.ok(master);
 client.agenda.curiosity=.9;
 Object.assign(master,{area:a.id,x:42,status:'resident',health:master.maxHealth||100,ailment:null});Object.assign(master.needs,{energy:100,hunger:0,sleeping:false});Object.assign(master.agenda,{task:null,due:1e9});if(!a.population.includes(master.id))a.population.push(master.id);
 // Prepared purse from the actual civic owner, not claimed earned wages.
 const cash=marketWallet(s,client.id),add=Math.max(0,20-cash);a.civic.treasury-=add;setActorMoney(s,client,cash+add);
 s.tick++;const source=buyTextPaper(s,client);assert.ok(source);s.tick++;assert.ok(writeWorkNotice(s,client,source.id));s.tick++;const paper=buyTextPaper(s,client);assert.ok(paper);
 return {...f,client,master,source,paper,work:s.literature.works[source.textCopy.content]};
}
export function placedCopy(f=copyFixture()){f.s.tick++;f.order=requestCopyOrder(f.s,f.client,f.master,f.source.id,f.paper.id);assert.ok(f.order);return f;}
export function finishCopy(f=placedCopy()){for(let i=0;i<3;i++){f.s.tick++;assert.equal(workCopyOrder(f.s,f.master,f.order.id),true);}return f;}

export function heroCopyFixture(){const f=copyFixture(),{s,h,a}=f;Object.assign(h,{area:a.id,x:42,profession:'scholar',hp:h.maxHp,energy:100,hunger:0,goal:null,combat:null,transit:null});h.personality.curiosity=.8;h.quests=[];h.stories.active=null;const add=Math.max(0,20-h.gold);a.civic.treasury-=add;h.gold+=add;syncActiveActor(s);const client=s.people[h.lineage];s.tick++;const source=buyTextPaper(s,client);assert.ok(source);s.tick++;assert.ok(writeWorkNotice(s,client,source.id));s.tick++;const paper=buyTextPaper(s,client);assert.ok(paper);return {...f,client,source,paper};}
