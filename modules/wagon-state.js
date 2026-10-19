import {rootWorld} from '../world-ref.js';
import {itemUnits,packView} from './container-state.js';
export const wagonsOn=s=>s.rules?.wagons!==false&&s.rules?.riding!==false&&s.rules?.containers!==false;
export const wagons=input=>Object.values(rootWorld(input).areas).flatMap(a=>a.objects.filter(o=>o.kind==='wagon').map(w=>({w,a})));
export const wagonById=(s,id)=>wagons(s).find(({w})=>w.id===id)||null;
export const drivenWagon=(s,id)=>wagons(s).find(({w})=>w.driver===id)||null;
export function wagonLoad(s,w){const c=w.manifest||s.logistics.convoys.find(c=>c.id===w.convoy);return w.items.reduce((n,i)=>n+itemUnits(i),0)+(c?Math.ceil(c.food/4)+Math.ceil(c.medicine/4)+(c.tools||0):0)+(w.passenger?8+packView(s,w.passenger).used:0);}
export const wagonRoad=e=>e?.mode==='road'&&!e.narrow&&!e.lift&&!e.ford&&(!e.metric||['road','trail'].includes(e.metric.terrain));
export function wagonMoved(s,w){if(w.lastMove===s.tick)return;w.lastMove=s.tick;w.wear++;if(w.wear===12){w.wear=0;w.condition=Math.max(0,w.condition-1);}w.history.push({at:s.tick,kind:'moved'});if(w.history.length>12)w.history.shift();}
export function wagonReady(s,w){const m=s.horses?.byId[w.horse];return wagonsOn(s)&&w.condition>0&&m?.hp>=m.maxHp*.7&&m.energy>=25&&m.hunger<70&&m.fearUntil<=s.tick&&m.keeper===w.owner&&m.leader===w.driver&&!m.rider&&wagonLoad(s,w)<=w.capacity;}
export function wagonRate(s,body,metric,foot,weather,mount){const found=drivenWagon(s,body.lineage||body.id);if(!found||!wagonsOn(s))return null;const {w}=found;if(!wagonReady(s,w)||!['road','trail'].includes(metric.terrain))return {...foot,speed:0,energy:0,wagon:w,blocked:true};const load=wagonLoad(s,w),speed=Math.min(foot.speed,mount?.speed??6,6*(weather.speed??1)/(1+load/48));return {...foot,speed:Math.max(.1,speed),wagon:w};}
export function wagonSummary(s){const id=s.hero.lineage,ride=s.people[id]?.caravanPassenger;if(ride)return 'Пассажир телеги: '+(s.people[ride.driver]?.name||'возчик')+' везёт в '+(s.areas[ride.to]?.name||'поселение')+'; '+(ride.mode==='fare'?'плата ◈'+ride.paid:'подготовка вместо платы')+'.';const f=wagons(s).find(({w})=>w.owner===id);return f?`Телега: ${f.w.condition>0?'исправна':'сломана'}, груз ${wagonLoad(s,f.w)}/${f.w.capacity}; ${f.w.driver?'запряжена':'оставлена: '+f.a.name}.`:'';}
