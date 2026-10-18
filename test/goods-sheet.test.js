import test from 'node:test';import assert from 'node:assert/strict';
import {goodsTownFixture} from '../scripts/goods-scenarios.mjs';import {goodsHTML} from '../goods-sheet.js';import {step,serialize} from '../engine.js';
const escape=x=>String(x).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
test('local stock inspection shows actual units and already existing sources without mutating the world',()=>{
 const {s,h,towns}=goodsTownFixture();for(let i=0;i<32;i++)step(s);h.area=towns[0].id;h.x=42;const before=serialize(s),html=goodsHTML(s,escape);assert.ok(html.includes('ОСМОТР КЛАДОВОЙ'));assert.ok(html.includes('Еда · порции'));assert.ok(html.includes('Доступный урожай'));assert.equal(serialize(s),before);
});
test('remote stock, transit, a disabled module and a distant warehouse cannot leak through the sheet',()=>{
 const {s,h,towns}=goodsTownFixture();assert.equal(goodsHTML(s,escape),'');h.area=towns[0].id;h.x=0;assert.equal(goodsHTML(s,escape),'');h.x=42;h.transit={from:'a1',to:'a2'};assert.equal(goodsHTML(s,escape),'');h.transit=null;s.rules['goods-cycle']=false;assert.equal(goodsHTML(s,escape),'');
});
