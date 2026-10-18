export function pointInGame(rect,e){return Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)&&e.clientX>=rect.left&&e.clientX<rect.right&&e.clientY>=rect.top&&e.clientY<rect.bottom;}
export function startsInGame(root,e){return Boolean(root.contains(e.target)&&!e.target?.closest?.('dialog, button, a, input, select, textarea, summary')&&pointInGame(root.getBoundingClientRect(),e));}
