import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './build.mjs';
import {readPublishedTarget,verifyPublishedAssets} from './deploy-network.mjs';
import {runChecks,checkOptions} from './check.mjs';

// Publication target explicitly authorized by the project owner.
const host = 'agent';
const origin = 'https://odyssey.kolpaque.dev';
// A transient network timeout must be retried before rolling back a valid payload.
// Every attempt still verifies the complete response; a partial body never passes.
async function verifyPublic(url, validate) {
  let failure;
  for (let attempt=1;attempt<=3;attempt++) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(30000),cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      await validate(response);
      return;
    } catch(error) {
      failure=error;
      console.warn(`Public check ${attempt}/3 failed for ${url}: ${error.message}`);
    }
  }
  throw new Error(`Public verification failed: ${url}`,{cause:failure});
}
const run = (program, args, options = {}) => execFileSync(program, args, { cwd: root, encoding: 'utf8', ...options });
const started=performance.now(),options=checkOptions(process.argv.slice(2)),{full,files}=options;
if(!full&&!files.length)throw new Error('Ordinary deploy requires changed-path tests: --tests test/name.test.js (smoke is always included). Use --full for a checkpoint.');
const checksResult=await runChecks(options);
const release = checksResult.release;
if (!/^[a-f0-9]{16}$/.test(release.revision)) throw new Error('Invalid release identifier');
const remote = `/srv/kolpaque/releases/odyssey/${release.revision}`;
const live = '/srv/kolpaque/sites/odyssey';
const ssh = script => run('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30', '-o', 'ServerAliveInterval=10', '-o', 'ServerAliveCountMax=3', host, 'sh', '-s'], {input:script});
// Do not overwrite a pre-existing unmanaged deployment.
const previous = await readPublishedTarget(ssh);
if (previous && !/^\/srv\/kolpaque\/releases\/odyssey\/[a-f0-9]{16}$/.test(previous)) throw new Error('Unexpected previous release path');
if (previous === remote) {
  console.log(`Already published: ${origin} (${release.revision})`);
  process.exit(0);
}
ssh(`set -eu\nmkdir -p '${remote}'\nchmod 755 '${remote}'`);
run('scp', ['-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30', '-o', 'ServerAliveInterval=10', '-o', 'ServerAliveCountMax=3', ...release.files.map(file => path.join(release.dir, file)), `${host}:${remote}/`]);
// Verify every payload on the server before switching the public pointer.
const checks = Object.entries(release.manifest.files).map(([file, digest]) => `${digest}  ${file}`).join('\n');
ssh(`set -eu
cd '${remote}'
chmod 644 ./*
printf '%s\\n' '${checks}' | sha256sum -c -
ln -s '${remote}' '${live}.next-${release.revision}'
mv -Tf '${live}.next-${release.revision}' '${live}'
curl -fsS -H 'Host: odyssey.kolpaque.dev' http://127.0.0.1:8080/ | grep -q '${release.revision}'`);
try {
  await verifyPublic(`${origin}/?release=${release.revision}`,async response=>{
    const html=await response.text();
    if(!html.includes(`name="odyssey-build" content="${release.revision}"`))throw new Error('Public server returned an unexpected build');
  });
  await verifyPublishedAssets(Object.entries(release.manifest.files),async (file,digest)=>{
    await verifyPublic(`${origin}/${file}`,async asset=>{
      const actual=createHash('sha256').update(Buffer.from(await asset.arrayBuffer())).digest('hex');
      if(actual!==digest)throw new Error(`${file}: public checksum mismatch`);
    });
  },{onChecked:(checked,total)=>{if(checked%40===0)console.log(`Public checksums verified: ${checked}/${total}`);}});
} catch (error) {
  if (previous) ssh(`set -eu\nln -s '${previous}' '${live}.rollback-${release.revision}'\nmv -Tf '${live}.rollback-${release.revision}' '${live}'`);
  throw error;
}
const result = { url: origin, revision: release.revision, previous, publishedAt: new Date().toISOString(),scope:checksResult.scope,checksReused:checksResult.reused,exit:0,durationMs:Math.round(performance.now()-started),checksDurationMs:checksResult.durationMs,log:checksResult.log };
await writeFile(path.join(root, '.deploy-state.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`Published and verified: ${origin} (${release.revision})`);
