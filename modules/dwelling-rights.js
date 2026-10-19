// Actual current estate writer only. No reader/backfill/migration.
export function inheritDwellings(s,p,heir,estate){
 for(const a of Object.values(s.areas)){const plot=a.dwellingPlot;if(!plot)continue;const r=plot.project,h=plot.house;
  const transfer=(entry,field)=>{if(entry?.[field]!==p.id)return false;estate.assets.push({kind:'property',area:a.id,id:entry.id||plot.id});if(heir){entry.rights ||= [];entry.rights.push({tick:s.tick,from:p.id,to:heir.id,estate:estate.id});entry[field]=heir.id;}return true;};
  transfer(plot,'owner');if(plot.permission?.person===p.id&&heir){plot.permission.transfers ||= [];plot.permission.transfers.push({tick:s.tick,from:p.id,to:heir.id,estate:estate.id});plot.permission.person=heir.id;}
  if(r){if(transfer(r,'owner')){r.offer=null;if(r.mode==='self')r.worker=null;if(heir)heir.dwellingIntent={area:a.id,plot:plot.id,project:r.id};}
   for(const c of Object.values(r.payment.claims))if(c.beneficiary===p.id&&c.paid<c.amount){c.rights ||= [];c.rights.push({tick:s.tick,from:p.id,to:heir?.id??null,estate:estate.id});c.beneficiary=heir?.id??null;estate.assets.push({kind:'property',area:a.id,id:r.id+'/pay/'+c.person});}
  }
  if(h?.owner===p.id){estate.assets.push({kind:'property',area:a.id,id:h.id});if(!heir)continue;h.owner=heir.id;const door=a.objects.find(o=>o.id===h.id),room=s.areas[h.room],res=room.residence;door.owner=heir.id;door.history.push({tick:s.tick,kind:'inheritance',from:p.id,owner:heir.id,estate:estate.id});if(door.history.length>16)door.history.shift();res.owner=heir.id;res.occupants=[...new Set(res.occupants.map(id=>id===p.id?heir.id:id))];const chest=room.objects.find(o=>o.id===res.chest);chest.owner=heir.id;
   for(const item of chest.items){if(item.textCopy||item.libraryLoan?.returned===null||item.libraryTheft?.returned===null)continue;item.inheritance={estate:estate.id,owner:heir.id};estate.assets.push({kind:'item',area:room.id,id:item.id,cache:chest.id});}
   if(room.home?.owner===p.id){room.home.owner=heir.id;room.home.tenant=heir.id;const device=room.objects.find(o=>o.id===room.home.device);if(device){device.owner=heir.id;device.tenant=heir.id;}}
   // This is a title/address, not knowledge that the heir has visited or moved in.
   heir.dwellingIntent={area:a.id,plot:plot.id,project:r?.id??h.lastProject};
  }
 }
}
