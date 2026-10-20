// Physical current links only. Absence is the existing free form, never a load-time constructor.
export const returnBond=s=>s?.returnEpisode?.bond||null;
export const activeReturnBond=p=>['bound','expired'].includes(returnBond(p)?.state);
export function returnBondAdmission(s,g){const p=s.people[s.hero.lineage];if(!activeReturnBond(p))return null;if(g.kind.startsWith('returnBond')||g.kind.startsWith('returnCare')||['rest','localRecovery','campPitch','campContinue','campLeave','routeWait','patientClinic','provision','eat','forage','brothCook','brothEat','roomBook'].includes(g.kind))return null;return {status:'blocked',reason:'Печать удерживает от других поручений. Можно исполнить условие или разрушить печать.',retryOn:'return-bond'};}
export function returnBondRevision(s){const b=returnBond(s.people[s.hero.lineage]);return b?.seal?b.state:null;}
export function returnSeal(s,b){return b?.seal&&s.areas[b.seal.area]?.objects.find(o=>o.id===b.seal.object&&o.kind==='returnSeal')||null;}
