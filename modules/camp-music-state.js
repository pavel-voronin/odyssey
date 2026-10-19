import {enabled} from '../rules.js';
import {collectionItems} from './collection-state.js';
import {itemWorking} from './item-condition.js';
import {woundImpairment} from './wound-state.js';
import {presentParts} from './anatomy-state.js';
export const CAMP_MELODY={id:'road-evening',name:'Вечерняя дорога'};
export const musicOn=s=>enabled(s,'camp-music');
export function birthMusic(s,p,h={profession:p?.role==='бард'?'bard':null}){if(!musicOn(s)||!p||h.profession!=='bard'||p.music)return; p.music={version:1,melodies:{[CAMP_MELODY.id]:{learned:s.tick,source:{kind:'initial-profile',person:p.id,profile:'bard',tick:s.tick}}},audiences:[],history:[],calming:null};}
export function knownMelody(p){return p?.music?.melodies?.[CAMP_MELODY.id]||null;}
export function musicInstrument(s,p){return collectionItems(s,p.id).find(i=>i.instrument?.version===1&&i.instrument.kind==='whistle'&&itemWorking(i)&&i.physical?.holder.kind==='person'&&i.physical.holder.id===p.id)||null;}
export function canVoice(s,p){const parts=p&&presentParts(p);return p?.alive&&!p.needs?.sleeping&&woundImpairment(s,p,'head')<.5&&woundImpairment(s,p,'body')<.5&&parts.some(([, ,role])=>role==='head')&&parts.some(([, ,role])=>role==='body');}
export function rememberMelody(s,p,performance){if(knownMelody(p))return false;p.music ||= {version:1,melodies:{},audiences:[],history:[],calming:null};p.music.melodies[CAMP_MELODY.id]={learned:s.tick,source:{kind:'listened',person:performance.performer,event:performance.id,tick:s.tick,camp:performance.camp}};return true;}
