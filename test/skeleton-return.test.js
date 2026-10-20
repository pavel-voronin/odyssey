import test from 'node:test';import assert from 'node:assert/strict';
import {skeletonFixture,returnedSkeleton} from '../scripts/skeleton-return-scenarios.mjs';
import {ritualAct,returnContext,exactReturn} from '../scripts/return-ritual-scenarios.mjs';
import {returnForm,returnSource} from '../modules/return-state.js';
import {returnNPCTurn} from '../modules/return-ritual.js';
import {substanceEvent} from '../modules/remains-cycle-state.js';
import {createPerson} from '../modules/lineage.js';
import {remainsCarryTurn,putDownRemains} from '../modules/remains-carry.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {npcAction} from '../modules/npc-control.js';
import {setModule} from '../rules.js';
import {serialize,restore,step} from '../engine.js';
import {bodyRemains} from '../modules/remains.js';
import {boneBody} from '../modules/anatomy-state.js';
import {heroAppearance} from '../appearance.js';
import {portraitModel} from '../portrait.js';
import {recordSilhouette} from '../silhouette.js';
import {Scene} from '../scene.js';
import {race} from '../content.js';
import {woundsTick} from '../modules/wound-world.js';
import {bodyTick} from '../modules/body.js';
import {biologicalDose,ordinaryRecovery} from '../modules/biology.js';
import {limbStride} from '../modules/limb-state.js';
// PARTIAL: six groups, <=2 small configurations per group; <=12 component
// actions or <=16 actual world ticks. Decay/death dates are selected checkpoints.
test('1 actual finite bones return as one skeletal body; immutable death, ancestry and inventory are retained through exact save',()=>{
 const f=skeletonFixture(),{s,h,b,dead:p}=f,death=structuredClone(b.death),archives=structuredClone(s.lives),source=p.id;assert.equal(returnForm(s,b),'skeleton');for(let i=0;i<4;i++)ritualAct(f);assert.equal(p.id,source);assert.equal(h.alive,true);assert.equal(boneBody(p),true);assert.equal(p.race,'human');assert.equal(h.race,'human');assert.deepEqual(p.returnEpisode.material,{flesh:0,bone:16});assert.deepEqual(b.death,death);assert.deepEqual(s.lives,archives);assert.equal(b.stage,'returned');assert.equal(h.gold,0);assert.equal(h.bag.length,0);assert.equal(returnSource(s,b),false);exactReturn(f);
});
test('2 an actually lifted body is occupied; dropping the same bones makes the same source available without duplication',()=>{
 const f=skeletonFixture({olderGrave:true}),{s,b}=f,id=createPerson(s,{name:'Родственник-носитель',race:'human',area:f.a.id,x:f.caster.x,parents:[f.h.lineage]},{initialJob:'guard'}),p=s.people[id];p.agenda.task=null;p.needs.hunger=0;p.needs.energy=100;setModule(s,'remains-carry',true);observeNPCPlace(s,p);for(let i=0;i<2;i++){s.tick++;assert.equal(npcAction(s,p,'personal'),true);assert.equal(remainsCarryTurn(s,p,returnContext),true);}assert.equal(b.carrier?.id,p.id);assert.equal(returnForm(s,b),null);assert.equal(returnNPCTurn(s,f.caster,returnContext),false);assert.equal(f.caster.returnRite.relic,null);exactReturn(f);s.tick++;assert.equal(putDownRemains(s,p,returnContext,'освободить тело для обряда'),true);assert.equal(returnForm(s,b),'skeleton');assert.equal(b.position.area,f.a.id);exactReturn(f);
});
test('3 destroyed structure cannot become a body and forged skeletal material cannot be restored',()=>{
 const f=skeletonFixture();assert.equal(substanceEvent(f.s,f.b,'structure','spoiled',16),true);assert.equal(f.b.stage,'consumed');for(let i=0;i<4;i++)ritualAct(f);assert.equal(f.h.alive,false);assert.equal(f.relic.taken,false);assert.equal(returnSource(f.s,f.b),false);exactReturn(f);const living=returnedSkeleton(),bad=JSON.parse(exactReturn(living));bad.people[living.h.lineage].returnEpisode.material.flesh=1;assert.throws(()=>restore(JSON.stringify(bad)),/return-material/);
});
test('4 two actual trained specialists contend for one physical relic/body; the restored preparation has one winner and one controller',()=>{
 const f=skeletonFixture(),{s,h,caster,b}=f;
 // An unused allocator checkpoint selects the second actual constructor, never a fabricated method or extra resident history.
 s.nextPerson=73;const id=createPerson(s,{name:'Другой хранитель',race:'human',area:caster.area,x:caster.x,parents:[h.lineage]},{initialJob:'healer'}),other=s.people[id];assert.ok(other.returnRite);other.agenda.duty=.9;other.needs.hunger=0;other.needs.energy=100;ritualAct(f);ritualAct(f);const raw=exactReturn(f),copy=restore(raw);f.s=copy;f.h=copy.hero;f.caster=copy.people[caster.id];f.b=copy.remains.byId[b.id];ritualAct(f);ritualAct(f);assert.equal(f.h.alive,true);assert.equal(f.b.returned.caster,caster.id);assert.equal(copy.people[id].returnRite.relic,null);assert.equal(copy.people[id].returnRite.used,null);assert.equal(Object.values(copy.people).filter(p=>p.returnEpisode?.body===b.id).length,1);assert.equal(copy.people[h.lineage].returnEpisode.price.object,f.relic.id);assert.equal(returnNPCTurn(copy,copy.people[id],returnContext),false);exactReturn(f);
});
test('5 a real amputation remains missing in the dry anatomy; no new flesh, bleeding, organic healing or poison is invented',()=>{
 const f=returnedSkeleton({injured:true}),{s,h,dead:p,b}=f,anatomy=structuredClone(p.anatomy),events=structuredClone(p.limbLosses),wounds=structuredClone(p.localWounds.active);assert.deepEqual(b.death.anatomy.recorded,anatomy);assert.equal(limbStride(p),.55);setModule(s,'body',true);h.conditions=[{id:'poison',since:s.tick,until:s.tick+100},{id:'fever',since:s.tick,until:s.tick+100}];h.hunger=100;s.tick=Math.floor(s.tick/8+1)*8;const hp=h.hp,energy=h.energy;biologicalDose(s,h);bodyTick(s,returnContext);let blood=0;woundsTick(s,{bleed:()=>blood++});assert.equal(blood,0);assert.equal(h.hp,hp);assert.equal(h.energy,energy);assert.equal(h.hunger,0);assert.equal(ordinaryRecovery(s,h,20),0);assert.deepEqual(p.localWounds.active,wounds);assert.deepEqual(p.anatomy,anatomy);assert.deepEqual(p.limbLosses,events);const look=heroAppearance(s);assert.equal(look.skeletal,true);assert.equal(look.missingLimbs.rightLeg,true);assert.equal(portraitModel(s).look.skeletal,true);const painter=Object.create(Scene.prototype);painter.state={rules:{},hero:h};const image=recordSilhouette(c=>{painter.ctx=c;painter.paintPerson(0,0,'#888',true,1,0,false,false,look,race(h.race));});assert.ok(image.polygons.length);exactReturn(f);
});
test('6 a second real death retains twelve actual bones and zero flesh, closing the source once without a second ritual',()=>{
 const f=skeletonFixture();assert.equal(substanceEvent(f.s,f.b,'structure','spoiled',4),true);for(let i=0;i<4;i++)ritualAct(f);assert.equal(f.dead.returnEpisode.material.bone,12);const old=f.b.id;f.s.tick=f.dead.returnEpisode.at+719;step(f.s);assert.equal(f.h.alive,false);const body=bodyRemains(f.s,f.h);assert.notEqual(body.id,old);assert.equal(body.death.shape,'skeleton');assert.equal(body.stage,'bones');assert.equal(body.substance.flesh.initial,0);assert.equal(body.substance.structure.initial,12);assert.equal(returnSource(f.s,body),false);assert.equal(f.s.lives.length,2);assert.equal(f.b.stage,'returned');exactReturn(f);
});

