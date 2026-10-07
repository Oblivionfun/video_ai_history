// Bundle once, then render videos and covers.
// usage: node scripts/render.mjs --out ../out/ep01/_build [--concurrency 6] ep01-s1-toudu-v ep01-s1-toudu-cover-v ...
// Ids containing "cover" (or "Cover") are rendered as a single PNG still; everything else as a muted H.264 MP4.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let outDir = path.resolve('../out/_build');
let concurrency = 6;
const ids = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outDir = path.resolve(args[++i]);
  else if (args[i] === '--concurrency') concurrency = Number(args[++i]);
  else ids.push(args[i]);
}
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const browser = await openBrowser('chrome', {chromiumOptions: {gl: 'angle'}});

for (const id of ids) {
  const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
  const t0 = Date.now();
  if (/cover/i.test(id)) {
    const output = path.join(outDir, `${id}.png`);
    await renderStill({serveUrl, composition, frame: 0, output, imageFormat: 'png', puppeteerInstance: browser, timeoutInMilliseconds: 240000});
    console.log(`${id}: still -> ${output} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    continue;
  }
  const output = path.join(outDir, `${id}.mp4`);
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: 'h264',
    outputLocation: output,
    crf: 16,
    x264Preset: 'slow',
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    imageFormat: 'jpeg',
    jpegQuality: 95,
    concurrency,
    muted: true,
    chromiumOptions: {gl: 'angle'},
    timeoutInMilliseconds: 240000,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        console.log(`${id}: ${p * 10}%`);
      }
    },
  });
  console.log(`${id}: ${composition.durationInFrames} frames -> ${output} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
await browser.close({silent: true});
