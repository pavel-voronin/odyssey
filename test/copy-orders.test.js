import test from 'node:test';import assert from 'node:assert/strict';
import {copyFixture,placedCopy,finishCopy,heroCopyFixture} from '../scripts/copy-order-scenarios.mjs';
import {requestCopyOrder,workCopyOrder,collectCopyOrder,copyOrderTask} from '../modules/copy-orders.js';
import {copyDesk} from '../modules/copy-order-state.js';
import {heldTexts,textActor} from '../modules/text-state.js';
import {marketWallet} from '../modules/market.js';
import {textNPCTask} from '../modules/text-actions.js';
import {peopleTick} from '../modules/people.js';
import {textContext} from '../scripts/text-scenarios.mjs';
import {readText} from '../modules/texts.js';
import {setModule} from '../rules.js';
import {serialize,restore,observeExistingPerson,step} from '../engine.js';
import {textHTML} from '../text-sheet.js';
import {registerLiteracy} from '../modules/literacy-state.js';
import {presentItem} from '../modules/item-originals.js';
const exact=s=>{const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);};
// PARTIAL: six selected groups, <=16 actual actions/ticks per group after
// bounded existing constructors; no lives or combinatorial mechanics sweep.
test('one finite order physically stores the same client originals and pays a distinct worker exactly once',()=>{
 const f=copyFixture(),{s,client:p,master:q,source,paper,work}=f,before=marketWallet(s,p.id),wage=marketWallet(s,q.id),original=JSON.stringify(work);placedCopy(f);const o=f.order;
 assert.equal(heldTexts(s,p.id).includes(source),false);assert.equal(presentItem(s,source.id).object,o.desk);assert.equal(source.textCopy.owner,p.id);assert.equal(marketWallet(s,p.id),before-4);assert.equal(o.progress,0);exact(s);
 finishCopy(f);assert.equal(marketWallet(s,q.id),wage+4);assert.equal(o.payment.paid,4);assert.equal(paper.id,o.paper);assert.equal(paper.textCopy.sourceCopy,source.id);assert.equal(paper.textCopy.content,work.id);assert.equal(JSON.stringify(work),original);assert.equal(heldTexts(s,q.id).includes(source),false);exact(s);
 s.tick++;assert.equal(workCopyOrder(s,q,o.id),false);assert.equal(collectCopyOrder(s,p,o.id),true);assert.equal(heldTexts(s,p.id).find(i=>i.id===source.id),source);assert.equal(heldTexts(s,p.id).find(i=>i.id===paper.id),paper);assert.equal(collectCopyOrder(s,p,o.id),false);assert.equal(marketWallet(s,q.id),wage+4);assert.equal(requestCopyOrder(s,p,q,source.id,paper.id),null);s.tick++;assert.equal(readText(s,p,source.id),true);assert.notEqual(textNPCTask(s,p)?.kind,'textCopy');exact(s);
});
test('missing source, owned material, funds or the actual reading/writing script cannot start a paid order',()=>{
 const f=copyFixture(),{s,client:p,master:q,source,paper}=f;s.tick++;const raw=serialize(s);assert.equal(requestCopyOrder(s,p,q,'absent',paper.id),null);assert.equal(requestCopyOrder(s,p,q,source.id,'absent'),null);assert.equal(serialize(s),raw);
 const money=p.agenda.wealth;p.agenda.wealth=3;assert.equal(requestCopyOrder(s,p,q,source.id,paper.id),null);p.agenda.wealth=money;
 setModule(s,'literacy',true);const l=registerLiteracy(s,q),caps=structuredClone(l);l.reading=[];l.writing=[];assert.equal(requestCopyOrder(s,p,q,source.id,paper.id),null);q.literacy=caps;source.textCopy.owner=q.id;assert.equal(requestCopyOrder(s,p,q,source.id,paper.id),null);source.textCopy.owner=p.id;q.area='a0';assert.equal(requestCopyOrder(s,p,q,source.id,paper.id),null);assert.equal(p.copyWork,undefined);q.area=f.a.id;exact(s);
});
test('interruption retains a real incomplete manuscript, does not teach the source and returns the untouched original and unused wage',()=>{
 const f=placedCopy(),{s,client:p,master:q,source,paper,work,order:o}=f,original=JSON.stringify(work),wage=marketWallet(s,q.id);s.tick++;assert.equal(workCopyOrder(s,q,o.id),true);assert.equal(paper.textCopy.condition,'draft');assert.notEqual(paper.textCopy.content,work.id);const draft=s.literature.works[o.draft];assert.equal(draft.parent,work.id);assert.equal(draft.author,work.author);assert.equal(draft.editor,q.id);assert.equal(draft.revision,work.revision+1);exact(s);
 q.needs.sleeping=true;s.tick++;assert.equal(workCopyOrder(s,q,o.id),false);assert.equal(o.progress,1);assert.equal(collectCopyOrder(s,p,o.id,{cancel:true}),true);assert.equal(o.payment.refunded,4);assert.equal(marketWallet(s,q.id),wage);s.tick++;assert.equal(readText(s,p,paper.id),false);assert.equal(JSON.stringify(work),original);assert.equal(source.textCopy.content,work.id);exact(s);
});
test('fatigue leaves a separate erroneous edition; it cannot be read as the full source or repeatedly earn a fee',()=>{
 const f=placedCopy(),{s,client:p,master:q,work,paper,order:o}=f;q.needs.energy=35;const wage=marketWallet(s,q.id),original=JSON.stringify(work);finishCopy(f);assert.equal(o.status,'error');assert.equal(o.payment.paid,0);assert.equal(paper.textCopy.content,o.draft);assert.equal(paper.textCopy.condition,'damaged');assert.equal(paper.textCopy.damage.kind,'scribal-error');assert.equal(s.literature.works[o.draft].parent,work.id);assert.equal(marketWallet(s,q.id),wage);s.tick++;assert.equal(collectCopyOrder(s,p,o.id),true);s.tick++;assert.equal(readText(s,p,paper.id),false);assert.equal(JSON.stringify(work),original);assert.equal(workCopyOrder(s,q,o.id),false);assert.equal(copyOrderTask(s,p),null);exact(s);
});
test('native personal NPC work phases proceed while the client has another affair; observation does not give the scribe a second body',()=>{
 const f=copyFixture(),{s,client:p,master:q}=f;assert.equal(copyOrderTask(s,p)?.kind,'textOrderRequest');p.agenda.curiosity=.75;assert.equal(copyOrderTask(s,p),null);p.agenda.curiosity=.9;placedCopy(f);p.agenda.task={kind:'work',target:f.a.id,x:42,remaining:3,workMode:null};p.agenda.due=0;assert.notEqual(textNPCTask(s,p)?.kind,'textOrderWork');assert.equal(observeExistingPerson(s,q.id),true);assert.equal(textActor(s,q.id),null);
 q.agenda.task={kind:'work',target:f.a.id,x:42,remaining:3,workMode:null};const heldTask=JSON.stringify(q.agenda.task),work=p.agenda.work,pay=marketWallet(s,q.id);for(let i=0;i<3;i++){s.tick=Math.ceil((s.tick+1)/8)*8;peopleTick(s,textContext);exact(s);}assert.equal(f.order.progress,3);assert.equal(f.order.status,'completed');assert.equal(p.agenda.work,work+1);assert.equal(p.agenda.task,null);assert.equal(JSON.stringify(q.agenda.task),heldTask);assert.equal(marketWallet(s,q.id),pay+4);assert.equal(q.actionControl.phases.filter(x=>x==='act').length,1);
});
test('OFF, pure presentation and exact current saves preserve real custody; fabricated drafts, payments and duplicate originals are rejected',()=>{
 const f=placedCopy(),{s,client:p,master:q,order:o}=f;s.tick++;assert.equal(workCopyOrder(s,q,o.id),true);setModule(s,'texts',false);const raw=serialize(s);assert.equal(workCopyOrder(s,q,o.id),false);assert.equal(copyOrderTask(s,p),null);textHTML(s,String);assert.equal(serialize(s),raw);exact(s);
 const bad=restore(raw);bad.people[p.id].copyWork.orders[o.id].payment.paid=4;assert.throws(()=>restore(serialize(bad)),/copy-order/);const d=restore(raw);d.literature.works[o.draft].content.text='Invented full knowledge';assert.throws(()=>restore(serialize(d)),/scribal/);const dup=restore(raw);dup.people[p.id].looseItems.push(copyDesk(dup,o).items[0]);assert.throws(()=>restore(serialize(dup)),/duplicate|text/);
 setModule(s,'texts',true);s.tick++;assert.equal(workCopyOrder(s,q,o.id),true);exact(s);
 const hero=heroCopyFixture();hero.h.goal={kind:'textOrderRequest',area:hero.a.id,x:42,person:hero.master.id,source:hero.source.id,item:hero.paper.id,started:hero.s.tick};step(hero.s);const order=Object.values(hero.client.copyWork.orders)[0];assert.equal(order.status,'working');assert.equal(order.progress,0);assert.equal(presentItem(hero.s,hero.source.id).object,order.desk);assert.equal(hero.h.goal,null);exact(hero.s);
});
