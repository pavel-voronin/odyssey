import {enabled} from '../rules.js';
import {visualRandom} from '../appearance.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';

function preference(s,p){
 if(p.wordCustom)return p.wordCustom;
 const tradition=['river','deep','ember'].includes(p.culture) ? .52 : .24;
 const chance=tradition+((p.agenda?.duty??.5)-.5)*.3-((p.agenda?.sociability??.5)-.5)*.15;
 return {version:1,form:visualRandom(s.seed,'personal-word:'+p.id)()<chance?'witness':'private',culture:p.culture};
}
export function wordDecision(s,p,h,agreement,{urgent=false}={}){
 if(!enabled(s,'word-custom'))return {allowed:true,mode:'disabled'};
 const custom=preference(s,p);
 if(custom.version!==1)return {allowed:true,mode:'unknown-custom'};
 if(urgent)return {allowed:true,mode:'urgent'};
 if(custom.form!=='witness')return {allowed:true,mode:'private'};
 if((p.agenda?.bonds?.[h.lineage]||0)>=40||(p.craftRelations?.[h.lineage]?.respect||0)>=12)return {allowed:true,mode:'personal-trust'};
 const known=new Set([...(p.parents||[]),...Object.keys(p.agenda?.bonds||{}),...(p.navigation?.contacts||[]).map(c=>c.person)]);
 const witness=[...known].filter(id=>id!==p.id&&id!==h.lineage).map(id=>localContact(s,id,p.area)).find(b=>b&&b.person.role!=='ребёнок'&&!b.person.needs?.sleeping&&physicalDistance(s.areas[p.area],p.x,b.x)<=9&&physicalDistance(s.areas[p.area],h.x,b.x)<=9);
 if(witness)return {allowed:true,mode:'witness',person:witness.person.id};
 return {allowed:false,mode:s.tick-(agreement.word?.since??s.tick)>=72?'refused':'waiting'};
}
export function confirmWord(s,p,h,agreement,{urgent=false}={}){
 if(!enabled(s,'word-custom'))return {allowed:true,mode:'disabled'};
 const choice=wordDecision(s,p,h,agreement,{urgent});
 if(p.wordCustom?.version!==undefined&&p.wordCustom.version!==1)return choice;
 p.wordCustom ||= preference(s,p);
 if(agreement.word?.mode==='refused'&&!urgent)return {allowed:false,mode:'refused'};
 agreement.word ||= {since:s.tick};
 Object.assign(agreement.word,{mode:choice.mode,checked:s.tick,...(choice.person?{witness:choice.person}:{}),...(choice.allowed?{confirmed:s.tick}:{})});
 return choice;
}
