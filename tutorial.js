export function createTutorial(stage=1,until=0){return{stage,until,done:stage===0};}
export function tutorialInput(t,now){if(t.done)return;if(t.stage===1)t.stage=2;else{t.stage=3;t.until=now+5000;}}
export function tutorialTick(t,now,automatic=false){
  if(t.stage===3&&automatic){t.stage=4;t.until=now+2200;t.done=true;}
  if(t.stage===4&&now>=t.until)t.stage=0;
}
export function tutorialText(t,now){return t.stage===1?'Кликни на экран.':t.stage===2?'Кликни ещё раз.':t.stage===3?`Не кликай пять секунд · ${Math.max(1,Math.ceil((t.until-now)/1000))}`:t.stage===4?'Приятного приключения.':'';}
