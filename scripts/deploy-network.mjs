import {setTimeout as delay} from 'node:timers/promises';
export async function verifyPublishedAssets(entries,verify,{concurrency=2,onChecked=()=>{}}={}){
 if(!Number.isInteger(concurrency)||concurrency<1)throw Error('Invalid verification concurrency');
 const files=entries.filter(([file])=>file!=='index.html');let checked=0;
 for(let offset=0;offset<files.length;offset+=concurrency)await Promise.all(files.slice(offset,offset+concurrency).map(async ([file,hash])=>{await verify(file,hash);onChecked(++checked,files.length);}));
 return checked;
}
// Only this read-only probe is retried. Uploads and pointer mutations are not.
export async function readPublishedTarget(ssh,{wait=()=>delay(1000),warn=console.warn}={}){
 const script="set -eu\nif test -L '/srv/kolpaque/sites/odyssey'; then readlink '/srv/kolpaque/sites/odyssey'; elif test -e '/srv/kolpaque/sites/odyssey'; then echo 'Refusing to replace an unmanaged directory' >&2; exit 1; fi";
 for(let attempt=1;attempt<=3;attempt++){
  try{return ssh(script).trim();}
  catch(error){const transient=error.status===255&&/timed out|connection reset|connection closed|network is unreachable|could not resolve hostname/i.test(String(error.stderr||error.message));if(!transient||attempt===3)throw error;warn(`SSH read-only probe ${attempt}/3 failed; retrying.`);await wait();}
 }
}
