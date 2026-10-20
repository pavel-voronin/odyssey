import {clinicalOn,clinicalReady,clinicalMagic} from './clinical-state.js';import {authorityBody} from './authority-state.js';import {physicalDistance} from '../geometry.js';import {diplomaticSpeech} from './diplomacy-state.js';
export const clinicalStudyOn=s=>clinicalOn(s)&&s.rules['clinical-transmission']!==false&&s.rules.texts!==false&&s.rules.equipment!==false;
export const clinicalStudyMemory=p=>p.clinicalStudy ||= {version:1,known:{},courses:{},works:{},requests:[],teaching:[],lastAt:-1};
export function clinicalProof(s,p,id){const r=s.clinicalPractice?.cases.find(r=>r.id===id);return r?.doctor===p.id&&r.status==='cleansed'&&r.return?r:null;}
export function clinicalSource(s,p,id){return clinicalProof(s,p,id)||p.clinicalStudy?.known[id]||null;}
export function clinicalStudyReady(s,p){const b=p&&authorityBody(s,p.id);return clinicalStudyOn(s)&&clinicalReady(s,p)&&(b.lineage?b.hunger:p.needs.hunger)<35&&(b.lineage?b.energy:p.needs.energy)>=35&&(p.clinicalStudy?.lastAt??-1)<s.tick;}
export function clinicalStudyContact(s,p,t){const a=p&&authorityBody(s,p.id),b=t&&authorityBody(s,t.id);return p?.id!==t?.id&&clinicalStudyReady(s,p)&&clinicalReady(s,t)&&a.area===b.area&&physicalDistance(s.areas[a.area],a.x,b.x)<=3&&diplomaticSpeech(s,p,t);}
export function clinicalStudyMagic(s,p){const m=clinicalMagic(s,p);return m?.maxMana>0?m:null;}
