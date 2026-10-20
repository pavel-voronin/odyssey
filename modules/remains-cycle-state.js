import {enabled} from '../rules.js';
export const remainsCycleOn=s=>enabled(s,'remains-cycle')&&enabled(s,'remains');
const organic=new Set(['human','elf','dwarf','halfling','orc','goblin']);
const units={deer:4,wolf:3,dragon:8,crab:2,boar:4,bear:6,rat:1};
const copy=v=>JSON.parse(JSON.stringify(v));
// Only the actual new-death constructor issues physical material. Old bodies
// have no guessed edible stock when loading, viewing or enabling this module.
export function initializeRemainsSubstance(s,b){
 if(!remainsCycleOn(s)||b.substance)return;const d=b.death,form=d.anatomy.form,kind=form==='ghost'||d.race==='ghost'?'trace':['skeleton','automaton','construct','slime','fungus'].includes(form)||d.race==='automaton'?'inedible':organic.has(d.race)||form==='human'?'organic':Object.hasOwn(units,form)?'animal':form==='ghost'?'trace':'inedible';
 let flesh=kind==='organic'?Math.max(0,7-(d.anatomy.recorded?.missing||[]).length):kind==='animal'?units[form]:0;flesh=Math.floor(flesh*(d.anatomy.stature||1));const structure=kind==='organic'||kind==='animal'?(form==='crab'?8:16):form==='skeleton'?16:0;
 const episode=b.source.kind==='person'&&s.people[b.source.id]?.returnEpisode,source=episode&&s.remains.byId[episode.body]?.substance,actual=episode?.material||(source?{flesh:source.flesh.remaining,bone:source.structure.remaining}:null),bone=actual?actual.bone:structure;if(actual)flesh=form==='skeleton'?0:actual.flesh;
 b.substance={version:1,kind,issued:d.tick,flesh:{initial:flesh,remaining:flesh,eaten:0,spoiled:0,extracted:0},structure:{kind:form==='crab'?'carapace':'bone',initial:bone,remaining:bone,eaten:0,spoiled:0,extracted:0},nextDecay:flesh?d.tick+240:null,history:[]};if(form==='skeleton')b.stage='bones';
}
export function substanceEvent(s,b,part,kind,amount,actor=null){const r=b.substance?.[part];if(b.stage==='returned'||!r||!Number.isSafeInteger(amount)||amount<=0||r.remaining<amount)return false;r.remaining-=amount;r[kind]+=amount;b.substance.history.push({tick:s.tick,part,kind,units:amount,actor:copy(actor)});if(b.substance.history.length>8)b.substance.history.shift();if(!b.substance.flesh.remaining&&b.substance.flesh.initial>0){b.substance.nextDecay=null;if(['fresh','bones'].includes(b.stage))b.stage=b.substance.structure.remaining?'bones':'consumed';}return true;}
export function decayRemains(s,b){const q=b.substance;if(!q?.nextDecay||s.tick<q.nextDecay||!q.flesh.remaining)return;const n=Math.min(q.flesh.remaining,1+Math.floor((s.tick-q.nextDecay)/80)),next=q.nextDecay+n*80;substanceEvent(s,b,'flesh','spoiled',n);if(q.flesh.remaining)q.nextDecay=next;}
export function edibleRemains(b){return Boolean(b?.substance?.flesh.remaining>0&&b.stage==='fresh'&&!b.carrier&&b.position.kind==='area');}
export function remainsByArea(s){const byArea=new Map();for(const b of Object.values(s.remains?.byId||{})){decayRemains(s,b);if(b.position.kind!=='area'||b.carrier)continue;const list=byArea.get(b.position.area)||[];list.push(b);byArea.set(b.position.area,list);}return byArea;}

