import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {clamp, easeOutCubic, noise1, rng} from '../lib/interp';

const cache = new Map<string, HTMLImageElement>();

export function useImage(name: string) {
  const src = staticFile(`img2x/${name}.jpg`);
  const [img, setImg] = useState<HTMLImageElement | null>(() => cache.get(src) ?? null);
  const [handle] = useState(() => (cache.has(src) ? null : delayRender(`image ${name}`)));
  useEffect(() => {
    if (img) return;
    const el = new Image();
    el.onload = () => {
      el.decode().finally(() => {
        cache.set(src, el);
        setImg(el);
        if (handle !== null) continueRender(handle);
      });
    };
    el.onerror = () => handle !== null && continueRender(handle);
    el.src = src;
  }, [img, src, handle]);
  return img;
}

export interface KenBurns {
  /** 0..1 progress through the shot */
  p: number;
  from?: number;
  to?: number;
  /** pan direction, each in [-1, 1] */
  dx?: number;
  dy?: number;
  /** horizontal focus of the crop, 0 = left edge, 1 = right edge */
  fx?: number;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, kb: KenBurns, filter = 'none') {
  const scale = (kb.from ?? 1.04) + ((kb.to ?? 1.12) - (kb.from ?? 1.04)) * kb.p;
  const base = Math.max(w / img.width, h / img.height) * scale;
  const dw = img.width * base, dh = img.height * base;
  const fx = (dw - w) / 2, fy = (dh - h) / 2;
  const focus = (kb.fx ?? 0.5) * 2;
  const ox = -fx * focus + Math.min(fx * focus, fx * (2 - focus)) * (kb.dx ?? 0) * (kb.p - 0.5) * 1.6;
  const oy = -fy + fy * (kb.dy ?? 0) * (kb.p - 0.5) * 1.6;
  ctx.filter = filter;
  ctx.drawImage(img, ox, oy, dw, dh);
  ctx.filter = 'none';
}

function inkMask(ctx: CanvasRenderingContext2D, w: number, h: number, reveal: number, seed: number) {
  const r = rng(seed * 7919 + 13);
  const maxR = Math.hypot(w, h) * 0.62;
  const blobs = 7;
  ctx.fillStyle = '#fff';
  for (let i = 0; i < blobs; i++) {
    const cx = i === 0 ? w * (0.4 + 0.2 * r()) : w * (0.1 + 0.8 * r());
    const cy = i === 0 ? h * (0.4 + 0.2 * r()) : h * (0.1 + 0.8 * r());
    const size = i === 0 ? 1 : 0.45 + 0.4 * r();
    const delay = i === 0 ? 0 : 0.08 + 0.4 * r();
    const g = easeOutCubic(clamp((reveal - delay) / (1 - delay)));
    const R = maxR * size * g;
    if (R < 1) continue;
    ctx.beginPath();
    const n = 90;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2;
      const wob = 1 + 0.2 * noise1(a * 2.1 + seed + i * 3.7, i) + 0.08 * noise1(a * 8.3 + seed * 1.3 + i, i + 9);
      const x = cx + Math.cos(a) * R * wob, y = cy + Math.sin(a) * R * wob;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // satellite droplets along the rim give the bleeding-ink edge
    for (let d = 0; d < 9; d++) {
      const a = r() * Math.PI * 2;
      const rr = R * (0.92 + 0.22 * r());
      const dr = R * (0.04 + 0.08 * r());
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, dr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export const InkImage: React.FC<{
  name: string;
  width: number;
  height: number;
  reveal: number;
  seed?: number;
  kb: KenBurns;
  filter?: string;
  style?: React.CSSProperties;
}> = ({name, width, height, reveal, seed = 1, kb, filter, style}) => {
  const img = useImage(name);
  const ref = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv || !img) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    if (reveal <= 0) return;
    if (reveal >= 1) {
      drawCover(ctx, img, width, height, kb, filter);
      return;
    }
    if (!maskRef.current) maskRef.current = document.createElement('canvas');
    const m = maskRef.current;
    m.width = width;
    m.height = height;
    const mctx = m.getContext('2d')!;
    mctx.clearRect(0, 0, width, height);
    inkMask(mctx, width, height, reveal, seed);
    ctx.filter = `blur(${Math.round(6 + 26 * (1 - reveal))}px)`;
    ctx.drawImage(m, 0, 0);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-in';
    drawCover(ctx, img, width, height, kb, filter);
    ctx.globalCompositeOperation = 'source-over';
  });

  return <canvas ref={ref} width={width} height={height} style={{width, height, display: 'block', ...style}} />;
};
