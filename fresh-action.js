import {beginGesture,moveGesture,isTap} from './gestures.js';

// A control revealed during a held pointer must require its own new press.
export function bindFreshAction(button,enabled,action,root=document,view=window,within=()=>true){
  let press=null;
  const cancel=()=>{press=null;};
  button.addEventListener('pointerdown',e=>{
    cancel();
    if(e.isPrimary!==false&&e.button===0&&enabled()&&within(e))press=beginGesture(e);
  });
  root.addEventListener('pointermove',e=>{if(press){if(!within(e))cancel();else moveGesture(press,e);}});
  root.addEventListener('pointercancel',cancel);
  view.addEventListener('blur',cancel);
  view.addEventListener('resize',cancel);
  button.addEventListener('click',e=>{
    const fresh=e.detail===0||isTap(press,e)&&within(e);cancel();
    if(fresh&&enabled())action();
  });
  return cancel;
}

// One delegated binding survives list redraws without accumulating global listeners.
export function bindFreshChoice(list,choice,enabled,action,root=document,view=window,within=()=>true){
 let pressed=null;
 list.addEventListener('pointerdown',e=>{pressed=choice(e);});
 list.addEventListener('click',e=>{const id=choice(e);if(e.detail===0)pressed=id;else if(id!==pressed)pressed=null;});
 const cancel=bindFreshAction(list,()=>pressed!==null&&enabled(pressed),()=>{const id=pressed;pressed=null;action(id);},root,view,within);
 return ()=>{pressed=null;cancel();};
}
