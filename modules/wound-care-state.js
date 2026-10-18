import {enabled} from '../rules.js';
import {woundImpairment} from './wound-state.js';
export const woundCareOn=s=>enabled(s,'local-wounds')&&enabled(s,'wound-care');
export const goodDressing=w=>Boolean(w.dressing&&w.dressing.remaining>4);
export function careIssue(s,p){
 if(!woundCareOn(s)||!p?.alive)return null;
 return (p.localWounds?.active||[]).filter(w=>w.kind==='cut'&&w.closure<100&&!goodDressing(w)||w.severity>=2&&w.function<60).sort((a,b)=>Number(b.kind==='cut'&&b.closure<100&&!goodDressing(b))-Number(a.kind==='cut'&&a.closure<100&&!goodDressing(a))||b.severity-a.severity)[0]||null;
}
export function seriousWound(s,p){const w=careIssue(s,p);return Boolean(w&&(w.severity>=2||woundImpairment(s,p,'head')>=.65));}
export function holdWoundRest(s){return Boolean(woundCareOn(s)&&s.hero.goal?.woundCare&&s.hero.goal.kind==='rest'&&s.hero.hunger<=75&&seriousWound(s,s.people[s.hero.lineage]));}
export function careState(p){return p.woundCare ||= {version:1,lastActionTick:-1,treatments:0,decision:null,failedClinic:null};}
