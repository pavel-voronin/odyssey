import {productFood,openProductFood} from './food-stores.js';
// Shared finite-stock transfers: overflow stays with the current owner.
export function reserveCargo(area,wanted,leave={},transfer=null){
  const cargo={};
  for(const [kind,amount]of Object.entries(wanted)){
    const taken=Math.min(amount,Math.max(0,(area.civic[kind]||0)-(leave[kind]||0)));
    if(transfer)cargo[kind]=transfer(area,kind,taken);else{area.civic[kind]=(area.civic[kind]||0)-taken;cargo[kind]=taken;}
  }
  return cargo;
}
export function depositCargo(area,cargo,transfer=null){
  for(const kind of Object.keys(cargo)){
    const stock=area.civic[kind]||0,amount=Math.min(cargo[kind],Math.max(0,100-stock));
    if(transfer)cargo[kind]-=transfer(area,kind,cargo[kind]);else{area.civic[kind]=stock+amount;cargo[kind]-=amount;}
  }
}
export function consumeCarriedSupplies(person,cargo,kind,amount){
  const own=person.roadSupplies?.[kind]||0,goods=cargo?.[kind]||0,inventory=person.actorLink?.inventory;
  const packs=kind==='food'&&Number.isInteger(inventory?.rations)?Math.max(0,inventory.rations):0;
  if(!Number.isFinite(amount)||amount<=0||own+packs*4+goods+(kind==='food'?productFood(person):0)<amount)return false;
  const personal=Math.min(own,amount);if(personal)person.roadSupplies[kind]-=personal;let remaining=amount-personal;
  if(remaining&&packs){const opened=Math.min(packs,Math.ceil(remaining/4)),eaten=Math.min(remaining,opened*4),left=opened*4-eaten;inventory.rations-=opened;remaining-=eaten;if(left){person.roadSupplies ||= {food:0,medicine:0};person.roadSupplies.food=(person.roadSupplies.food||0)+left;}}
  if(remaining&&kind==='food'&&productFood(person)){openProductFood(person,remaining);const n=Math.min(remaining,person.roadSupplies.food);person.roadSupplies.food-=n;remaining-=n;}
  if(remaining)cargo[kind]-=remaining;return true;
}
export function carriedFood(person,inventory){return Math.max(0,person?.roadSupplies?.food||0)+Math.max(0,inventory?.rations||0)*4+productFood(person);}
// Existing sealed meals keep their four-serving semantics. Already opened food is spent first.
export function consumeTravelMeal(person,inventory,portions=1){
 const opened=Math.max(0,person?.roadSupplies?.food||0);
 if(opened||productFood(person)){const available=opened+productFood(person)+(person.actorLink?.inventory===inventory?Math.max(0,inventory.rations||0)*4:0),amount=Math.min(Math.max(1,Math.min(4,portions)),available);return consumeCarriedSupplies(person,null,'food',amount)?amount:0;}
 if(inventory?.rations>0){inventory.rations--;return 4;}return 0;
}
