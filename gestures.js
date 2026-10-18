export function beginGesture(e){return{id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,held:false};}
export function moveGesture(g,e){if(g&&g.id===e.pointerId&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>8)g.moved=true;return Boolean(g?.moved);}
export function isTap(g,e){return Boolean(g&&g.id===e.pointerId&&!g.moved&&!g.held);}
