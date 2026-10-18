import test from 'node:test';
import assert from 'node:assert/strict';
import {CLIMATES,DAY_TICKS,YEAR_TICKS,worldDate,climateId,dateLabel,elapsedLabel} from '../calendar.js';
import {createWorld,serialize,restore} from '../engine.js';
import {semanticText} from '../text.js';
const s={seed:10,tick:0,chronology:{year:743},areas:{a0:{type:'road',continent:'c0',era:0}},hero:{area:'a0',born:0}};
test('twenty-day temperate seasons and the eighty-day year have exact shared boundaries',()=>{
 assert.equal(YEAR_TICKS,19200);for(const c of Object.values(CLIMATES))assert.equal(c.seasons.reduce((n,v)=>n+v[3],0),80);
 assert.deepEqual([worldDate(s).season,worldDate(s).seasonDay,worldDate(s).year],['spring',1,743]);
 const last=worldDate(s,20*DAY_TICKS-1),next=worldDate(s,20*DAY_TICKS);assert.equal(last.seasonDay,20);assert.equal(last.season,'spring');assert.equal(next.season,'summer');assert.equal(next.seasonDay,1);
 const end=worldDate(s,YEAR_TICKS-1),start=worldDate(s,YEAR_TICKS);assert.equal(end.season,'winter');assert.equal(end.seasonDay,20);assert.equal(end.night,true);assert.equal(start.year,744);assert.equal(start.dayOfYear,1);assert.equal(start.seasonDay,1);
});
test('changing climate changes local season translation without advancing the world day, year, or night',()=>{
 const tick=25*DAY_TICKS+210,expected={temperate:['summer',6],tropical:['wet',26],arid:['summer',26],alpine:['autumn',1],underground:['deep',26]};
 for(const [climate,value]of Object.entries(expected)){const d=worldDate(s,tick,{climate,era:0});assert.deepEqual([d.season,d.seasonDay],value);assert.equal(d.dayOfYear,26);assert.equal(d.year,743);assert.equal(d.night,true);}
 const past=worldDate(s,tick,{climate:'arid',era:-120});assert.equal(past.year,743);assert.equal(past.sceneYear,623);assert.equal(past.temporalOffset,-120);assert.equal(past.dayOfYear,26);
});
test('old worlds keep their simulation and born values; passive dates consume no RNG or data and unknown climates fall back',()=>{
 const state=createWorld(7),before=serialize(state);for(let i=0;i<100;i++){worldDate(state,i*DAY_TICKS);dateLabel(state,i*DAY_TICKS);}assert.equal(serialize(state),before);assert.equal(serialize(restore(before)),before);
 assert.equal(climateId(s,{climate:'__proto__',type:'road',continent:'c0'}),'temperate');assert.equal(climateId(s,{type:'desert'}),'arid');assert.equal(climateId(s,{realm:'underground'}),'underground');assert.equal(worldDate({...s,chronology:{year:0}},0).year,0);
});
test('elapsed adventure time and journal durations use the game calendar while escaping text safely',()=>{
 assert.equal(elapsedLabel(2),'12 мин.');assert.equal(elapsedLabel(20),'2 ч.');assert.equal(elapsedLabel(240),'1 д.');assert.equal(elapsedLabel(YEAR_TICKS+DAY_TICKS),'1 г. 1 д.');
 const state=createWorld(2),text=semanticText(state,'Срок 240 тиков. <img src=x> Билетик.');assert.ok(text.includes('Срок 1 д.'));assert.ok(!text.includes('<img'));assert.ok(text.includes('Билетик.'));assert.ok(semanticText(state,'К тику 480 нужно вернуть долг.').includes('К дате «Весна, 3 · 743 г.»'));
});
