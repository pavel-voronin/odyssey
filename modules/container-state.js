import {publicRepairCargoLoad} from './public-repair-cargo.js';
import {causewayCargoLoad} from './causeway-state.js';
import {remainsPassengerLoad} from './remains-mass.js';
// Current bag arrays remain authoritative. A pack is a location, never a second owner.
export const PACK_CAPACITY=24;
export const containersOn=s=>s.rules?.containers!==false;
const nonnegative=n=>Number.isFinite(n)?Math.max(0,n):0;
export function itemUnits(item){return item?.slot==='armor'?3:item?.slot==='weapon'?2:Math.max(1,Math.ceil(nonnegative(item?.quantity)/4));}
export function packContents(s,id=s.hero.lineage){const h=s.hero?.lineage===id?s.hero:s.actorStates?.[id],p=s.people[id];return {h,p,items:h?.bag||p?.looseItems||[],inventory:h?.inventory||p?.actorLink?.inventory||{}};}
export function packView(s,id=s.hero.lineage,{items,stacks={},passenger=true}={}){
 const {p,items:held,inventory:i}=packContents(s,id),n=k=>nonnegative(stacks[k]??({rations:i.rations,potions:i.potions,herbs:i.herbs,food:p?.roadSupplies?.food,medicine:p?.roadSupplies?.medicine,tools:p?.marketCargo?.tools,mushroom:p?.localFood?.stock?.mushroom,fish:p?.localFood?.stock?.fish,farmSeeds:p?.farmSeeds?.stock,tobaccoSeeds:p?.tobaccoSeeds?.stock,hobbypaper:p?.hobbyStock?.paper.stock,hobbytobacco:p?.hobbyStock?.tobacco.stock,sketchPaper:packContents(s,id).h?.sketchbook.paper,pipeTobacco:packContents(s,id).h?.smoking.tobacco})[k]);
 const itemLoad=(items||held).reduce((sum,item)=>sum+itemUnits(item),0),stackLoad=(packContents(s,id).h?.workMaterials?.cargo?.length||0)+Math.ceil(nonnegative(p?.fieldCraft?.kit.remaining)/4)+n('rations')+n('potions')+Math.ceil(n('herbs')/4)+Math.ceil(n('food')/4)+Math.ceil(n('medicine')/4)+n('tools')+Math.ceil(n('mushroom')/2)+n('fish')+Math.ceil(n('farmSeeds')/4)+Math.ceil(n('tobaccoSeeds')/4)+Math.ceil(n('hobbypaper')/4)+Math.ceil(n('hobbytobacco')/4)+Math.ceil(n('sketchPaper')/4)+Math.ceil(n('pipeTobacco')/4)+causewayCargoLoad(s,id)+publicRepairCargoLoad(s,id),ownLoad=itemLoad+stackLoad,h=packContents(s,id).h,q=passenger&&s.people[h?.injuredPassenger],carried=q?.alive&&q.partyInjury?.stage==='supported'&&q.partyInjury.leader===id?8+packView(s,q.id,{passenger:false}).used:0,deadLoad=passenger?remainsPassengerLoad(s,id):0,used=ownLoad+carried+deadLoad;
 return {id:'pack/'+id,owner:id,capacity:PACK_CAPACITY,used,itemLoad,stackLoad,...(carried?{passengerLoad:carried}:{}),...(deadLoad?{remainsLoad:deadLoad}:{}),free:Math.max(0,PACK_CAPACITY-used),excess:Math.max(0,used-PACK_CAPACITY)};
}
export function fitsPack(s,id,options){return !containersOn(s)||packView(s,id,options).used<=PACK_CAPACITY;}
export function fitsAcquisition(s,item,h=s.hero){
 if(!containersOn(s))return true;if(packView(s,h.lineage).excess)return false;
 const current=h.equipment?.[item.slot],wearable=['weapon','armor','charm'].includes(item.slot)&&!['workPart','bioMaterial','socketComponent'].includes(item.kind);if(wearable&&!current)return true;return fitsPack(s,h.lineage,{items:[...h.bag,...(current?[current]:[])]})&&fitsPack(s,h.lineage,{items:[...h.bag,item]});
}
export function stackRoom(s,id,kind,wanted){
 if(!containersOn(s))return wanted;const {p,inventory:i}=packContents(s,id),map={rations:i.rations,potions:i.potions,herbs:i.herbs,food:p?.roadSupplies?.food,medicine:p?.roadSupplies?.medicine,tools:p?.marketCargo?.tools,mushroom:p?.localFood?.stock?.mushroom,fish:p?.localFood?.stock?.fish},old=nonnegative(map[kind]);if(!Object.hasOwn(map,kind)||packView(s,id).excess)return 0;
 let lo=0,hi=Math.max(0,Math.min(1000,Math.floor(wanted)));while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fitsPack(s,id,{stacks:{[kind]:old+mid}}))lo=mid;else hi=mid-1;}return lo;
}
