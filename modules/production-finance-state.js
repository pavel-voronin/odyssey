// Current rights change only through an actual agreement or death act.
export const productionBeneficiary=c=>Object.hasOwn(c,'beneficiary')?c.beneficiary:c.investor;
export const outstandingProduction=c=>['working','selling','payable'].includes(c.status)&&!c.exit;
export function inheritProductionRights(s,p,heir,estate){
 for(const c of Object.values(s.productionDeals||{}))if(outstandingProduction(c)&&productionBeneficiary(c)===p.id){
  const rights=c.rights ||= [];if(rights.some(r=>r.estate===estate.id))continue;
  rights.push({at:s.tick,from:p.id,to:heir?.id??null,estate:estate.id});c.beneficiary=heir?.id??null;
  estate.assets.push({kind:'production-right',area:c.area,id:c.id});
 }
}
