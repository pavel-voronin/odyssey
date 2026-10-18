import test from 'node:test';import assert from 'node:assert/strict';
import {initializeGoodsArea,goodsBatch,goodsBalance,takeGoods,putGoods,transferGoods,productionSources,completeGoodsWork,goodsWorkReceipt,goodsTick,rawSite,extractRaw,deliverRaw} from '../modules/goods.js';
const area=(id,food=65,tools=3)=>({id,type:'village',continent:'c0',realm:'surface',era:0,civic:{food,tools,treasury:60},objects:[],links:[]});
function fixture(){const a=area('a0'),b=area('a1');return {s:{seed:1,rng:812,tick:0,nextArea:2,rules:{'goods-cycle':true,weather:false,climate:false},areas:{a0:a,a1:b},people:{p:{id:'p',alive:true,area:'a0',health:100,needs:{energy:80}}}},a,b};}
const work=(id='one',actor='p')=>({id,actor,required:3,spent:3});
function balanced(a){for(const kind of ['food','tools']){const b=goodsBalance(a,kind);assert.equal(b.difference,0,kind);}}
test('existing numbers become one owner/place/quantity reference without a second initial stock, RNG or treasury change',()=>{
 const {s,a}=fixture(),rng=s.rng;initializeGoodsArea(s,a);assert.equal(a.civic.food,65);assert.equal(a.civic.tools,3);assert.equal(a.civic.treasury,60);assert.deepEqual(a.goods.overflow,{food:0,tools:0});assert.equal(goodsBatch(s,a,'food').quantity,65);assert.equal(goodsBatch(s,a,'food').place,a.id);assert.equal(s.rng,rng);const saved=JSON.stringify(s);initializeGoodsArea(s,a);goodsBatch(s,a,'food');assert.equal(JSON.stringify(s),saved);balanced(a);
});
test('real stock moves atomically between two cities and overflow remains a distinct owned quantity',()=>{
 const {s,a,b}=fixture();b.civic.food=99;initializeGoodsArea(s,a);initializeGoodsArea(s,b);assert.equal(transferGoods(s,a,b,'food',12),12);assert.equal(a.civic.food,53);assert.equal(b.civic.food,100);assert.equal(b.goods.overflow.food,11);assert.equal(goodsBatch(s,b,'food','overflow').quantity,11);assert.equal(a.goods.ledger.food.exported,12);assert.equal(b.goods.ledger.food.imported,12);const saved=JSON.stringify(s);assert.equal(transferGoods(s,a,b,'food',1000),0);assert.equal(JSON.stringify(s),saved);balanced(a);balanced(b);
});
test('consumption and explicit loss are separate and do not hide unrecorded stock mutations',()=>{
 const {s,a}=fixture();takeGoods(s,a,'food',1,{reason:'NPC meal'});takeGoods(s,a,'food',4,{flow:'lost',reason:'spoilage'});balanced(a);assert.equal(a.goods.ledger.food.consumed,1);assert.equal(a.goods.ledger.food.lost,4);a.civic.food--;assert.equal(goodsBalance(a,'food').difference,-1);
});
test('overflow refills the same warehouse once space exists, with no new production or duplicated import',()=>{
 const {s,a}=fixture();putGoods(s,a,'tools',30);const total=goodsBalance(a,'tools').actual;assert.equal(a.civic.tools,20);assert.equal(a.goods.overflow.tools,13);takeGoods(s,a,'tools',4);s.tick=96;goodsTick(s);assert.equal(a.civic.tools,20);assert.equal(a.goods.overflow.tools,9);assert.equal(goodsBalance(a,'tools').actual,total-4);assert.equal(a.goods.ledger.tools.imported,30);balanced(a);
});
test('food needs a living present worker and completed actual work; repeating the receipt cannot produce or pay again',()=>{
 const {s,a}=fixture();const receipt=work();receipt.spent=2;assert.equal(completeGoodsWork(s,a,receipt).quantity,0);assert.equal(a.goods,undefined);receipt.spent=3;s.people.p.area='a1';assert.equal(completeGoodsWork(s,a,receipt).quantity,0);s.people.p.area='a0';const result=completeGoodsWork(s,a,receipt);assert.equal(result.quantity,6);assert.equal(a.civic.food,71);const saved=JSON.stringify(s);assert.equal(completeGoodsWork(s,a,receipt).reason,'duplicate');assert.equal(JSON.stringify(s),saved);assert.equal(a.civic.treasury,60);balanced(a);
});
test('finite shared settlement fields exhaust, regenerate locally on a bounded phase and never produce food without labour',()=>{
 const {s,a,b}=fixture();b.city=a.id;const sources=productionSources(s,a);assert.equal(productionSources(s,b),sources);for(let i=0;i<10;i++)completeGoodsWork(s,a,work('harvest'+i));assert.equal(sources.field.stock,0);const before=a.civic.food,overflow=a.goods.overflow.food;assert.equal(completeGoodsWork(s,a,work('empty')).quantity,0);s.tick=96;goodsTick(s);assert.equal(sources.field.stock,8);assert.equal(a.civic.food+(a.goods.overflow.food||0),before+overflow);assert.equal(completeGoodsWork(s,a,work('again')).quantity,6);assert.equal(sources.field.initial+sources.field.regrown-sources.field.harvested,sources.field.stock);balanced(a);
});
test('seasonal harvest changes production from the same finite field',()=>{
 const {s,a}=fixture();s.rules.climate=true;s.tick=0;const spring=completeGoodsWork(s,a,work('spring'),{units:8}).quantity;s.tick=60*240;const winter=completeGoodsWork(s,a,work('winter'),{units:8}).quantity;assert.ok(winter<spring);balanced(a);
});
test('an actual owned working workshop and two finite material units are required per aggregate tool',()=>{
 const {s,a}=fixture();const initial=productionSources(s,a).materials.stock;assert.equal(completeGoodsWork(s,a,work('no-workshop'),{kind:'tools',units:1}).quantity,0);a.objects.push({id:'bench',kind:'workshop',owner:'p',state:'intact'});assert.equal(completeGoodsWork(s,a,work('craft'),{kind:'tools',units:1}).quantity,1);assert.equal(a.civic.tools,4);assert.equal(a.goods.sources.materials.stock,initial-2);a.objects[0].state='burned';assert.equal(completeGoodsWork(s,a,work('burned'),{kind:'tools',units:1}).quantity,0);balanced(a);
});
test('raw extraction and delivery move a finite physical cargo once and resume tool production after exhaustion',()=>{
 const {s,a}=fixture();a.objects.push({id:'bench',kind:'workshop',owner:'p',state:'intact'});const source=productionSources(s,a);source.materials.used+=source.materials.stock;source.materials.stock=0;assert.equal(completeGoodsWork(s,a,work('empty'),{kind:'tools',units:1}).quantity,0);const wild=s.areas.a2={id:'a2',type:'mountain',objects:[],links:[]},site=rawSite(s,wild),initial=site.remaining;assert.equal(extractRaw(s,wild,2),2);const p=s.people.p;p.goodsRawCargo={quantity:2,source:wild.id};assert.equal(deliverRaw(s,a,p,2),2);assert.equal(deliverRaw(s,a,p,2),0);assert.equal(completeGoodsWork(s,a,work('supplied'),{kind:'tools',units:1}).quantity,1);assert.equal(site.remaining,initial-2);assert.equal(source.materials.initial+source.materials.delivered-source.materials.used,source.materials.stock);balanced(a);
});
test('disabled execution preserves source data and restores previous capped stock behavior without a second warehouse',()=>{
 const {s,a}=fixture();productionSources(s,a);const saved=JSON.stringify(a.goods);s.rules['goods-cycle']=false;assert.equal(completeGoodsWork(s,a,work()).quantity,0);s.tick=96;goodsTick(s);putGoods(s,a,'food',60);assert.equal(a.civic.food,100);assert.equal(JSON.stringify(a.goods),saved);
});
test('in-progress labour receipt and all finite quantities survive exact plain JSON roundtrip',()=>{
 const {s,a}=fixture(),task={kind:'farm',remaining:3};goodsWorkReceipt(s,s.people.p,task);task.remaining--;const text=JSON.stringify({s,task}),copy=JSON.parse(text);goodsWorkReceipt(copy.s,copy.s.people.p,copy.task);copy.task.remaining--;goodsWorkReceipt(copy.s,copy.s.people.p,copy.task);copy.task.remaining--;const result=completeGoodsWork(copy.s,copy.s.areas.a0,copy.task.goodsWork);assert.equal(result.quantity,6);assert.equal(JSON.stringify(JSON.parse(JSON.stringify(copy))),JSON.stringify(copy));balanced(copy.s.areas.a0);
});
