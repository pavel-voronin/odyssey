import {enabled} from '../rules.js';
// Availability is a base read contract. Service access must not import the
// repair controller, its suppliers, or its workshop event callbacks.
export function workToolReady(s,o){return !enabled(s,'property')||!enabled(s,'workshop-tools')||!o?.workTool||o.workTool.state==='working';}
