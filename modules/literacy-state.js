import {enabled} from '../rules.js';
import {profession} from '../content.js';
export const literacyOn=s=>enabled(s,'literacy');
export const TEXT_LANGUAGES=['river','coast','steppe','deep','grove','glass','ember','dream','trade'];
export const LANGUAGE_NAMES={river:'речная речь',coast:'береговая речь',steppe:'степная речь',deep:'речь каменных домов',grove:'лесная речь',glass:'речь стеклянных кругов',ember:'пепельная речь',dream:'речь сновидений',trade:'общая торговая речь'};
export const nativeLanguage=p=>p?.culture||'river';
function roleCaps(p,h){
 const native=nativeLanguage(p),skill=h?profession(h.profession).skill:null,writer=h?h.profession==='scholar'||['time','parley'].includes(skill):p?.agenda?.job==='scholar',reader=writer||(h?skill==='trade':p?.agenda?.job==='merchant');
 return {reading:reader?[native,'trade']:[],writing:writer?[native,'trade']:[],spoken:reader?[native,'trade']:[native]};
}
export function literacyCaps(s,p,h=null){
 const current=p?.literacy,base=current?{reading:[...current.reading],writing:[...current.writing],spoken:[...current.spoken]}:roleCaps(p,h);
 // Already performed, dated text actions remain evidence of skill. This pure
 // query never initializes literacy or manufactures a historical lesson.
 for(const e of p?.textCraft?.readings||[]){const lang=s.literature?.works[e.content]?.language;if(lang){base.reading.push(lang);base.spoken.push(lang);}}
 for(const id of [p?.textCraft?.work,...(p?.textCraft?.copied||[])]){const lang=s.literature?.works[id]?.language;if(lang)base.writing.push(lang);}
 return Object.fromEntries(Object.entries(base).map(([key,list])=>[key,[...new Set(list)]]));
}
export function registerLiteracy(s,p,h=null,kind='action',source=null){
 if(!literacyOn(s)||!p?.alive)return null;if(p.literacy)return p.literacy;
 const caps=literacyCaps(s,p,h);p.literacy={version:1,native:nativeLanguage(p),reading:caps.reading,writing:caps.writing,spoken:caps.spoken,origin:{kind,tick:s.tick,role:h?.profession||p?.agenda?.job||null,source,reading:[...caps.reading],writing:[...caps.writing],spoken:[...caps.spoken]},courses:[],reports:[],lastActionTick:-1};return p.literacy;
}
export function birthLiteracy(s,p,h=null){if(p?.role==='герой'&&!h)return;registerLiteracy(s,p,h,'birth');}
export const readingScript=(s,p,lang,h=null)=>literacyCaps(s,p,h).reading.includes(lang);
export const writingScript=(s,p,lang,h=null)=>literacyCaps(s,p,h).writing.includes(lang);
export const speakingLanguage=(s,p,lang,h=null)=>literacyCaps(s,p,h).spoken.includes(lang);
