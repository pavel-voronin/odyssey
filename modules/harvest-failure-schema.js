import {harvestZone} from './harvest-failure-state.js';
import {DAY_TICKS,YEAR_TICKS,CLIMATES,worldDate} from '../calendar.js';
export function validateHarvestFailures(s,fail){
 const t=s.harvestFailures;if(t===undefined)return;
 const int=n=>Number.isSafeInteger(n)&&n>=0,time=n=>int(n)&&n<=s.tick;
 if(!t||typeof t!=='object'||Array.isArray(t)||t.version!==1||!time(t.created)||!int(t.nextAt)||t.nextAt<t.created||!int(t.after)||!int(t.serial)||!Array.isArray(t.events)||t.events.length>8)fail('harvestFailures');
 let last=-1,lastUntil=-YEAR_TICKS;const ids=new Set();
 for(const e of t.events){if(e.id!=='harvest-failure/'+s.seed+'/'+Number(e.id?.split('/').at(-1))||!(Number(e.id?.split('/').at(-1))>0)||!int(Number(e.id?.split('/').at(-1)))||Number(e.id.split('/').at(-1))>t.serial||ids.has(e.id)||!time(e.at)||e.at<=last||e.at<t.created||e.at<lastUntil+YEAR_TICKS/2||e.until<=e.at||e.until>e.at+4*DAY_TICKS||!int(e.until)||typeof e.zone!=='string'||!Array.isArray(e.areas)||!e.areas.length||new Set(e.areas).size!==e.areas.length||e.areas.some(id=>!s.areas[id]||harvestZone(s,s.areas[id])!==e.zone)||!CLIMATES[e.climate]?.seasons.some(c=>c[0]===e.season)||!int(e.year)||![4,5,6].includes(e.exposure)||e.factor!==.5)fail('harvestFailures.event');const d=worldDate(s,e.at,{climate:e.climate}),end=(Math.floor(e.at/DAY_TICKS)+d.seasonDays-d.seasonDay+1)*DAY_TICKS;if(d.season!==e.season||d.yearIndex!==e.year||e.until!==Math.min(end,e.at+4*DAY_TICKS))fail('harvestFailures.season');last=e.at;lastUntil=e.until;ids.add(e.id);}
 const e=t.events.at(-1);if(e&&(t.after!==e.until+YEAR_TICKS/2||Number(e.id.split('/').at(-1))!==t.serial))fail('harvestFailures.pause');
}
export function validateHarvestShortfalls(s,fail){
 const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,int=n=>Number.isSafeInteger(n)&&n>=0;
 const cause=id=>typeof id==='string'&&id==='harvest-failure/'+s.seed+'/'+Number(id.split('/').at(-1))&&Number(id.split('/').at(-1))>0&&Number(id.split('/').at(-1))<=(s.harvestFailures?.serial||0);
 for(const a of Object.values(s.areas)){const r=a.goods?.harvestShortfall;if(!r)continue;const e=s.harvestFailures?.events.find(e=>e.id===r.cause),area=s.areas[r.area];if(r.version!==1||!cause(r.cause)||!time(r.at)||!area||!s.people[r.actor]||typeof r.receipt!=='string'||!int(r.expected)||!int(r.quantity)||r.quantity>=r.expected||r.missing!==r.expected-r.quantity||(s.areas[area.city]||area)!==a||e&&(r.at<e.at||r.at>=e.until||harvestZone(s,area)!==e.zone))fail('harvestShortfall');}
 const check=(r,d)=>{if(!r)return;if(r.version!==1||!cause(r.cause)||!time(r.at)||typeof r.harvest!=='string'||!int(r.requested)||r.requested>12||!int(r.loaded)||r.loaded<2||r.loaded>=r.requested||r.missing!==r.requested-r.loaded||d&&(d.kind!=='food'||r.loaded!==d.quantity||r.at!==d.source))fail('convoy.harvestShortfall');};
 for(const c of s.logistics.convoys)check(c.demand?.shortfall,c.demand);for(const h of s.logistics.history)check(h.shortfall);
}
