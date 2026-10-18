import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
export async function build() {
  const sources = {};
  const dependencyPattern = /(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+\.js)['"]/g;
  const resolve = (file, spec) => path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
  async function collect(file) {
    if (sources[file] !== undefined) return;
    if (file.startsWith('../') || path.isAbsolute(file)) throw new Error('Module outside project');
    sources[file] = await readFile(path.join(root, file), 'utf8');
    if (file.endsWith('.js')) for (const match of sources[file].matchAll(dependencyPattern)) await collect(resolve(file, match[1]));
  }
  const styles=['style.css','viewport.css'];
  for (const file of ['index.html', ...styles, 'app.js']) await collect(file);
  const sourceFiles = Object.keys(sources).sort();
  const revision = hash(sourceFiles.map(file => `${file}\0${sources[file]}`).join('\0')).slice(0, 16);
  const dir = path.join(root, 'dist', revision);
  await mkdir(dir, { recursive: true });
  const files = {}, emitted = {}, visiting = new Set();
  function emitModule(file) {
    if (emitted[file]) return emitted[file];
    if (visiting.has(file)) throw new Error(`Circular module dependency: ${file}`);
    visiting.add(file);
    let content = sources[file];
    const dependencies = [...content.matchAll(dependencyPattern)];
    for (const match of dependencies) content = content.replace(match[0], match[0].replace(match[1], './' + emitModule(resolve(file, match[1]))));
    const name = file.replace(/\.js$/, '').replaceAll('/', '-') + '.' + hash(content).slice(0, 12) + '.js';
    files[name] = content; emitted[file] = name; visiting.delete(file); return name;
  }
  const app = emitModule('app.js');
  let html = sources['index.html']
    .replace('src="app.js"', `src="${app}"`)
    .replace('<span id="build">dev</span>', `<span id="build">${revision.slice(0, 7)}</span>`)
    .replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  <meta name="odyssey-build" content="${revision}">`);
  for(const style of styles){const name=style.replace('.css','')+'.'+hash(sources[style]).slice(0,12)+'.css';files[name]=sources[style];html=html.replace(`href="${style}"`,`href="${name}"`);}
  files['index.html'] = html;
  const manifest = { revision, files: Object.fromEntries(Object.entries(files).map(([file, content]) => [file, hash(content)])) };
  files['release.json'] = JSON.stringify(manifest, null, 2) + '\n';
  for (const [file, content] of Object.entries(files)) await writeFile(path.join(dir, file), content, 'utf8');
  return { revision, dir, files: Object.keys(files), manifest };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await build(), null, 2));
