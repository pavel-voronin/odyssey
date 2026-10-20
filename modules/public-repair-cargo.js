// Earmarked public/private repair material is carried, never market sale stock.
export const publicRepairCargoLoad=(s,id)=>s.people[id]?.publicRepairCargo?.status==='carried'?1:0;
