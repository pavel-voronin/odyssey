// Stop only the controller's current activity; keep original dates, supplies and history.
export function stopHostileLife(s,p,stage){const q=p.hostileLife;if(!q)return;q.stage=stage;q.goal=null;q.action=stage==='dead'?'dead':'watch';}
