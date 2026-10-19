import {fracturesOn,fracturePending} from './fracture-state.js';
import {infectionNeedsCare,infectionSeverity} from './wound-infection-state.js';
import {enabled} from '../rules.js';
import {woundImpairment} from './wound-state.js';
export const woundCareOn=s=>enabled(s,'local-wounds')&&enabled(s,'wound-care');
export const goodDressing=w=>Boolean(w.dressing&&w.dressing.remaining>4);
export function careIssue(s,p){
 if(!woundCareOn(s)||!p?.alive)return null;
 return (p.localWounds?.active||[]).filter(w=>fracturesOn(s)&&fracturePending(w)||infectionNeedsCare(s,p,w)||infectionSeverity(s,p,w)>0||w.kind==='cut'&&w.closure<100&&!goodDressing(w)||w.severity>=2&&w.function<60).sort((a,b)=>infectionSeverity(s,p,b)-infectionSeverity(s,p,a)||Number(b.kind==='cut'&&b.closure<100&&!goodDressing(b))-Number(a.kind==='cut'&&a.closure<100&&!goodDressing(a))||b.severity-a.severity)[0]||null;
}
export function seriousWound(s,p){const w=careIssue(s,p);return Boolean(w&&(fracturesOn(s)&&fracturePending(w)||infectionSeverity(s,p,w)>0||w.severity>=2||woundImpairment(s,p,'head')>=.65));}
export function holdWoundRest(s){return Boolean(woundCareOn(s)&&s.hero.goal?.woundCare&&s.hero.goal.kind==='rest'&&s.hero.hunger<=75&&seriousWound(s,s.people[s.hero.lineage]));}
export function careState(p){return p.woundCare ||= {version:1,lastActionTick:-1,treatments:0,decision:null,failedClinic:null};}
