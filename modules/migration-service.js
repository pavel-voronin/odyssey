// Resolve physical paid work from the actual service owner without a knowledge cycle.
let available=()=>false;
export const installMigrationEmployment=fn=>{available=fn;};
export const migrationEmployment=(s,a)=>available(s,a);
