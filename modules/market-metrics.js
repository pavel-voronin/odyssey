import {rootWorld} from '../world-ref.js';
// Opt-in diagnostics are outside saves and RNG. Normal play never allocates a
// counter object, and actor views share the same world counter when enabled.
const metrics=new WeakMap();
export function startMarketMetrics(s){const value={quote:0,quoteHit:0,quoteMiss:0,route:0,production:0,productionPhase:0,observations:0,reports:0,foodPlans:0,foodCandidates:0};metrics.set(rootWorld(s),value);return value;}
export function countMarket(s,key,n=1){const m=metrics.get(rootWorld(s));if(m)m[key]=(m[key]||0)+n;}
export function readMarketMetrics(s){return {...metrics.get(rootWorld(s))};}
