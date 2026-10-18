import {enabled} from '../rules.js';
export const materialDeliveryEnabled=s=>['material-delivery','goods-cycle','people','property','npc-control','npc-knowledge'].every(id=>enabled(s,id));
export const MATERIAL_DELIVERY_POLICY=Object.freeze({quantity:2,fee:6,negotiatedFee:8,advance:2,work:3,effort:2,window:960,cooldown:480,records:48});
export function materialContracts(s,id){return Object.values(s.materialDeliveries?.orders||{}).filter(o=>o.client===id||o.carrier===id);}
export function pendingMaterialContract(s,id){return materialContracts(s,id).find(o=>['quoted','outward','collecting','returning'].includes(o.status))||null;}
export function materialDeliverySpent(s,id){return s.people[id]?.materialMemory?.lastActionTick===s.tick;}
