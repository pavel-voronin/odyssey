// Relative payload names avoid repeating the absolute Windows workspace path.
// Keep each invocation well below Windows' command-line limit as the bundle grows.
export function uploadRelease(run,release,destination){
 const options=['-q','-o','BatchMode=yes','-o','ConnectTimeout=30','-o','ServerAliveInterval=10','-o','ServerAliveCountMax=3'];
 let batch=[],length=options.join(' ').length+destination.length+64;
 const flush=()=>{if(batch.length)run('scp',[...options,...batch,destination],{cwd:release.dir});batch=[];length=options.join(' ').length+destination.length+64;};
 for(const file of release.files){if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(file)||file.length>512)throw Error('Invalid release payload name');if(length+file.length+3>12000)flush();batch.push(file);length+=file.length+3;}
 flush();
}
