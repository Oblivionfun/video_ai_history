// Render preview stills at given timestamps (seconds) with one bundle + one browser.
// usage: node scripts/stills.mjs [--comp ep01-s1-toudu-v] [--out dir] 5 21 33 ...
//        (default composition: XuanzangFilm, default out: ../out/stills)
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
let comp = 'XuanzangFilm';
let outDir = path.resolve('../out/stills');
const times = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--comp') comp = args[++i];
  else if (args[i] === '--out') outDir = path.resolve(args[++i]);
  else times.push(Number(args[i]));
}
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const browser = await openBrowser('chrome', {chromiumOptions: {gl: 'angle'}});
const composition = await selectComposition({serveUrl, id: comp, puppeteerInstance: browser});
const prefix = comp === 'XuanzangFilm' ? 't' : `${comp}_t`;

for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
  const output = path.join(outDir, `${prefix}${String(t).replace('.', '_')}.jpg`);
  const t0 = Date.now();
  await renderStill({
    serveUrl,
    composition,
    frame,
    output,
    imageFormat: 'jpeg',
    jpegQuality: 88,
    puppeteerInstance: browser,
    timeoutInMilliseconds: 240000,
  });
  console.log(`t=${t}s frame=${frame} -> ${path.basename(output)} (${Date.now() - t0} ms)`);
}
await browser.close({silent: true});
