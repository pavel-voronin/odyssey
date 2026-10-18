import test from 'node:test';import assert from 'node:assert/strict';
import {layoutFixture,runLayout,layoutContext as ctx} from '../scripts/delve-layout-scenarios.mjs';
import {createWorld,serialize,restore,step} from '../engine.js';
import {createDelveLayout,observeDelveLayout,recordLayoutCollection} from '../modules/delve-layout.js';
import {layoutPlan} from '../modules/delve-layout-plan.js';import {delvePlan} from '../modules/delves.js';
import {setModule} from '../rules.js';import {delveLayoutHTML} from '../delve-layout-sheet.js';
const exact=s=>assert.equal(serialize(restore(serialize(s))),serialize(s));
const role=(f,name)=>f.layout.nodes.find(id=>f.s.areas[id].dungeon.layoutNode.role===name);
test('only a genuinely new dungeon constructs one six-room graph with finite objects and a real alternative to its grate',()=>{
 const f=layoutFixture(),{s,root,source,layout}=f;assert.equal(layout.nodes.length,6);assert.equal(layout.links.length,7);assert.equal(s.edges[layout.gate].mechanism.state,'closed');assert.equal(layout.nodes.flatMap(id=>s.areas[id].objects).filter(o=>['loot','relic'].includes(o.kind)).length,2);assert.equal(root.objects.some(o=>o.kind==='enemy'),false);const raw=serialize(s);assert.equal(createDelveLayout(s,root,source,ctx),false);assert.equal(serialize(s),raw);exact(s);
 const old=createWorld(0),a=old.areas.a2;a.dungeon={root:a.id,floor:1,cleared:true};const before=serialize(old);assert.equal(createDelveLayout(old,a,old.areas.a1,ctx),false);assert.equal(serialize(old),before);assert.equal(restore(before).areas.a2.dungeon.layout,undefined);
});
test('two actual short expeditions take different approaches to the same final-room shape and walk back outside',()=>{
 const bold=layoutFixture({courage:.9}),careful=layoutFixture({courage:.3,relics:true});
 const a=runLayout(bold,128),b=runLayout(careful,128);for(const f of [bold,careful]){assert.equal(f.h.delve,null);assert.equal(f.h.area,f.source.id);assert.equal(f.layout.finalClaimed.person,f.h.lineage);assert.equal(f.h.counters.dungeons,1);exact(f.s);}
 assert.equal(a[a.indexOf(role(bold,'final'))-1],role(bold,'gallery'));assert.equal(b[b.indexOf(role(careful,'final'))-1],role(careful,'service'));assert.equal(bold.s.edges[bold.layout.gate].mechanism.state,'closed');assert.equal(careful.s.edges[careful.layout.gate].mechanism.state,'open');assert.ok(careful.s.edges[careful.layout.gate].mechanism.operations.length===1);
});
test('side loot permits an actual exit without touching the final guard or relic; collection cannot pay twice',()=>{
 const f=layoutFixture({courage:.3}),path=runLayout(f,128),side=f.s.areas[role(f,'side')],final=f.s.areas[role(f,'final')],loot=side.objects.find(o=>o.kind==='loot');assert.ok(path.includes(side.id));assert.equal(path.includes(final.id),false);assert.equal(f.h.delve,null);assert.equal(loot.taken,true);assert.equal(f.layout.finalClaimed,null);assert.equal(final.objects.find(o=>o.kind==='enemy').alive,true);assert.equal(final.objects.find(o=>o.kind==='relic').taken,false);assert.equal(f.h.counters.dungeons||0,0);assert.equal(f.root.dungeon.cleared,false);const gold=f.h.gold,before=serialize(f.s);assert.equal(recordLayoutCollection(f.s,loot),false);assert.equal(f.h.gold,gold);assert.equal(serialize(f.s),before);exact(f.s);
});
test('unseen room contents do not choose the next door or appear in a personal map',()=>{
 const f=layoutFixture({courage:.3});for(let i=0;i<25;i++)step(f.s);const copy=restore(serialize(f.s)),final=copy.areas[role(f,'final')];for(const o of final.objects){o.name='СЕКРЕТ-ДАЛЬНЕГО-ЗАЛА';if(o.kind==='enemy')o.hp=o.maxHp=999;}
 f.h.goal=null;copy.hero.goal=null;assert.equal(layoutPlan(f.s,ctx),true);assert.equal(layoutPlan(copy,ctx),true);assert.deepEqual(copy.hero.goal,f.h.goal);assert.deepEqual(copy.hero.delvePaths,f.h.delvePaths);assert.equal(delveLayoutHTML(copy,String).includes('СЕКРЕТ-ДАЛЬНЕГО-ЗАЛА'),false);assert.equal(Object.hasOwn(f.h.delvePaths.places[f.root.id].rooms,final.id),false);
});
test('a checkpoint during a physical approach preserves graph, observed choices and the exact next 24 ticks',()=>{
 const f=layoutFixture({courage:.3});for(let i=0;i<30;i++)step(f.s);const graph=JSON.stringify(f.layout),copy=restore(serialize(f.s));for(let i=0;i<24;i++){step(f.s);step(copy);assert.equal(serialize(copy),serialize(f.s));}assert.equal(JSON.stringify(f.layout),graph);exact(f.s);const body=f.h.area,root=f.h.delve.root;f.s.tick+=1300;f.h.goal=null;assert.equal(delvePlan(f.s,ctx),true);assert.equal(f.h.delve.root,root);assert.equal(f.h.area,body);assert.match(f.h.delvePaths.places[root].returning,/выходу|Возвращение/);assert.equal(f.h.goal.kind,'layoutMove');exact(f.s);
});
test('the existing captive remains one real person at the entry and escapes through its real adjacent exit',()=>{
 const f=layoutFixture({courage:.3,rescue:true}),cage=f.root.objects.find(o=>o.kind==='captive'),person=f.s.people[cage.person],people=Object.keys(f.s.people).length;assert.equal(f.layout.captive,cage.id);const path=runLayout(f,128),q=f.h.quests.find(q=>q.dungeonRescue);assert.equal(q.status,'done');assert.equal(person.status,'resident');assert.equal(person.area,f.source.id);assert.equal(Object.keys(f.s.people).length,people);assert.equal(f.h.companions.some(c=>c.person===person.id),false);assert.equal(path.some(id=>id===role(f,'final')),false);assert.equal(f.layout.finalClaimed,null);exact(f.s);
});
test('OFF retains graph and held exploration, current absence stays absent, and forged topology fails restore',()=>{
 const f=layoutFixture();for(let i=0;i<10;i++)step(f.s);setModule(f.s,'delve-layouts',false);const graph=JSON.stringify(f.layout),body=[f.h.area,f.h.x];step(f.s);assert.deepEqual([f.h.area,f.h.x],body);assert.equal(JSON.stringify(f.layout),graph);assert.equal(delvePlan(f.s,ctx),false);exact(f.s);
 const bad=JSON.parse(serialize(f.s));bad.areas[f.root.id].dungeon.layout.nodes[1]=f.root.id;assert.throws(()=>restore(JSON.stringify(bad)),/layout/);const absent=createWorld(0),raw=serialize(absent),restored=restore(raw);assert.equal(restored.hero.delvePaths,undefined);assert.equal(Object.values(restored.areas).some(a=>a.dungeon?.layout),false);assert.equal(serialize(restored),raw);
});
test('the personal map is a read-only view of inspected exits and retains unknown-room labels rather than live distant contents',()=>{
 const f=layoutFixture();for(let i=0;i<25;i++)step(f.s);const raw=serialize(f.s),html=delveLayoutHTML(f.s,s=>String(s).replaceAll('<','&lt;'));assert.match(html,/ЛИЧНО ОСМОТРЕННЫЕ/);assert.match(html,/не осмотрено/);assert.equal(serialize(f.s),raw);assert.equal(html.includes('Сундук в боковом кармане'),false);assert.equal(observeDelveLayout({...f.s,hero:{...f.h,transit:{}}}),null);
});
