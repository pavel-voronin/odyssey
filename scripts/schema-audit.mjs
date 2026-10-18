import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {deathFixture} from './death-record-scenarios.mjs';
import {workLossFixture} from './work-loss-scenarios.mjs';
import {campEnvironmentFixture} from './camp-environment-scenarios.mjs';
import {rescueFixture} from './dungeon-rescue-scenarios.mjs';
const dir='artifacts/schema-144',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision);
await fs.mkdir(runtime,{recursive:true});
for(const [file,expected]of Object.entries(r.manifest.files)){
 let bytes;
 for(let n=0;n<3;n++){bytes=await fs.readFile(path.join(r.dir,file));if(createHash('sha256').update(bytes).digest('hex')===expected)break;assert.ok(n<2,file);await new Promise(done=>setTimeout(done,25));}
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,file);await fs.writeFile(path.join(runtime,file),bytes);
}
await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function moduleFor(name){const file=Object.keys(r.manifest.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file,name);return import(pathToFileURL(path.join(runtime,file)).href);}
const g=await moduleFor('engine'),clockAPI=await moduleFor('clock'),rules=await moduleFor('rules'),pacts=await moduleFor('modules-pacts'),stories=await moduleFor('modules-stories'),lineage=await moduleFor('modules-lineage');
const report={revision:r.revision,files:Object.keys(r.manifest.files).length,steps:0,checks:0,rows:[],newObjects:null};
const fixtures=[];
for(const seed of [0,1,4,5])fixtures.push(['natural-'+seed,g.createWorld(seed),480]);
fixtures.push(['active-work',workLossFixture().s,96]);
fixtures.push(['camp',campEnvironmentFixture().s,96]);
fixtures.push(['camp-off-on',campEnvironmentFixture('desert',7,{sites:false}).s,96]);
fixtures.push(['active-dungeon',rescueFixture().s,96]);
fixtures.push(['sea',deathFixture('storm').s,96]);
fixtures.push(['caravan',deathFixture('caravan').s,96]);
fixtures.push(['actual-death',deathFixture('poison').s,96]);
const multi=g.createWorld(4);assert.equal(g.createNextStory(multi,{allowLiving:true}),true);fixtures.push(['multiple-actors',multi,96]);
const npc=g.createWorld(0),person=Object.values(npc.people).find(p=>p.alive&&p.area&&p.id!==npc.hero.lineage);assert.equal(g.observeExistingPerson(npc,person.id),true);fixtures.push(['npc-observer',npc,96]);
const off=g.createWorld(4);rules.setModule(off,'goods-cycle',false);fixtures.push(['off-on',off,96]);
const debt=g.createWorld(1),c={id:'audit-debt',kind:'pact',status:'active',owner:debt.hero.lineage,source:'a1',stage:'opening',choices:[],effects:[],refs:[]};debt.storyCases.push(c);debt.hero.stories.active=c.id;
const ctx={log:g.log,goal:(s,kind,area,x,intent,reason,extra)=>{s.hero.goal={kind,area,x,started:s.tick,...extra};s.hero.intent=intent;s.hero.reason=reason;},storyFinish:stories.finishStory,random:()=>.2,spawnEnemy:g.createEnemy};
pacts.start(debt,c,ctx);c.variant='fortune';debt.hero.habits=['hoarder'];pacts.act(debt,c,ctx);assert.equal(c.stage,'owed');fixtures.push(['actual-debt',debt,96]);
for(const [name,initial,length]of fixtures){
 const start=g.serialize(initial);let completedCanonical=null;
 for(const batch of [13,17]){
  let direct=g.restore(start),resumed=g.restore(start),clock=clockAPI.createClock(0),done=0;
  const initialTick=direct.tick,advance=s=>{if(s.tick-initialTick===26){if(name==='off-on')rules.setModule(s,'goods-cycle',true);if(name==='camp-off-on')rules.setModule(s,'camp-sites',true);}g.step(s);};
  assert.equal(g.serialize(g.restore(start)),start);report.checks++;
  while(done<length){
   const n=Math.min(batch,length-done);
   for(let i=0;i<n;i++)advance(direct);
   const advanced=clockAPI.catchUp(clock,(done+n)*1000,()=>advance(resumed),n);assert.equal(advanced,n);report.steps+=n*2;done+=n;
   const canonical=g.serialize(direct);assert.equal(g.serialize(resumed),canonical,name+'/'+batch+'/'+done);resumed=g.restore(g.serialize(resumed));assert.equal(g.serialize(resumed),canonical);report.checks+=2;
  }
  if(completedCanonical!==null){assert.equal(g.serialize(resumed),completedCanonical,name+'/13-vs-17');report.checks++;}else completedCanonical=g.serialize(resumed);
  report.rows.push({name,batch,steps:length,worldTick:resumed.tick,actors:Object.keys(resumed.actorStates).length,bodies:Object.keys(resumed.remains?.byId||{}).length,rng:resumed.rng,alive:resumed.hero.alive});
 }
}
const generated=g.restore(g.serialize(g.createWorld(4))),before=generated.nextPerson,id=g.createArea(generated,'village','Медная Заводь',0,{culture:'deep',danger:0});g.connectAreas(generated,'a0',id);const pid=lineage.createPerson(generated,{name:'Новый житель',area:id});assert.ok(generated.nextPerson>before);const text=g.serialize(generated);assert.equal(g.serialize(g.restore(text)),text);report.checks++;
report.newObjects={area:id,person:pid};
await fs.writeFile(dir+'/audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({revision:r.revision,steps:report.steps,checks:report.checks,scenarios:report.rows.length,files:report.files}));
