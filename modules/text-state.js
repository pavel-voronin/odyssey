import {literacyOn,literacyCaps,nativeLanguage,readingScript,writingScript,speakingLanguage} from './literacy-state.js';
import {enabled} from '../rules.js';
import {selfDrivenActor} from '../actor-projection.js';
import {profile} from './common.js';
export const textsOn=s=>enabled(s,'texts')&&enabled(s,'equipment');
export const textActor=(s,id)=>selfDrivenActor(s,id)?(s.hero.lineage===id?s.hero:s.actorStates[id]):null;
export const heldTexts=(s,id)=>s.hero.lineage===id?s.hero.bag:s.actorStates?.[id]?.bag||s.people[id]?.looseItems||[];
export function canWriteText(s,p,language=null){if(literacyOn(s)){const lang=language||nativeLanguage(p),h=textActor(s,p?.id);return Boolean(p?.alive&&writingScript(s,p,lang,h)&&speakingLanguage(s,p,lang,h));}const h=textActor(s,p?.id);return Boolean(p?.alive&&(h?h.profession==='scholar'&&profile(h).skill==='relic'||['time','parley'].includes(profile(h).skill):p.agenda?.job==='scholar'));}
export function canReadText(s,p,language=null){if(literacyOn(s)){const h=textActor(s,p?.id),caps=literacyCaps(s,p,h);return Boolean(p?.alive&&(language?caps.reading.includes(language)&&caps.spoken.includes(language):caps.reading.length));}const h=textActor(s,p?.id);return canWriteText(s,p)||Boolean(p?.alive&&(h?profile(h).skill==='trade':p.agenda?.job==='merchant'));}
export const textWork=(s,item)=>item?.textCopy?.version===1?s.literature?.works[item.textCopy.content]||null:null;
export const isTextItem=item=>Boolean(item?.writingMaterial?.version===1&&['writingPaper','textCopy'].includes(item.kind));
export function textMemory(p){return p.textCraft ||= {version:1,serial:0,work:null,copied:[],readings:[],lastActionTick:-1,offer:null};}
