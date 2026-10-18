import {enabled} from '../rules.js';
import {selfDrivenActor} from '../actor-projection.js';
import {profile} from './common.js';
export const textsOn=s=>enabled(s,'texts')&&enabled(s,'equipment');
export const textActor=(s,id)=>selfDrivenActor(s,id)?(s.hero.lineage===id?s.hero:s.actorStates[id]):null;
export const heldTexts=(s,id)=>s.hero.lineage===id?s.hero.bag:s.actorStates?.[id]?.bag||s.people[id]?.looseItems||[];
export function canWriteText(s,p){const h=textActor(s,p?.id);return Boolean(p?.alive&&(h?['knowledge','time','parley'].includes(profile(h).skill):p.agenda?.job==='scholar'));}
export function canReadText(s,p){const h=textActor(s,p?.id);return canWriteText(s,p)||Boolean(p?.alive&&(h?profile(h).skill==='trade':p.agenda?.job==='merchant'));}
export const textWork=(s,item)=>item?.textCopy?.version===1?s.literature?.works[item.textCopy.content]||null:null;
export const isTextItem=item=>Boolean(item?.writingMaterial?.version===1&&['writingPaper','textCopy'].includes(item.kind));
export function textMemory(p){return p.textCraft ||= {version:1,serial:0,work:null,copied:[],readings:[],lastActionTick:-1,offer:null};}
