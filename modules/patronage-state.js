export const patronageActive=c=>['repairing','awaiting-stock','working','selling'].includes(c.status);
// The existing actual restoration receipt owns this transition, including when
// future patronage gifts are OFF. Loading never calls it or supplies a repair.
export function recordPatronRepair(s,a,o,proof){
 for(const c of Object.values(s.patronProjects||{}))if(c.status==='repairing'&&c.area===a.id&&c.workshop===o.id&&c.producer===o.owner&&c.donor===proof.payer&&c.damageAt===proof.damageAt&&o.state==='intact'){
  c.status='awaiting-stock';c.repaired={at:s.tick,actor:proof.actor,payer:proof.payer,damageAt:proof.damageAt};
 }
}
