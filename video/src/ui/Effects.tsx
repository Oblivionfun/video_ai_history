import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, Img, staticFile, useVideoConfig} from 'remotion';
import {clamp, env, noise1, rng} from '../lib/interp';
import {at, C, L} from '../lib/time';

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.62}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 52%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

export const BottomShade: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 76%, rgba(0,0,0,0.5) 100%)'}} />
);

export const Grain: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = 0.07}) => {
  const r = rng(frame * 31 + 7);
  const v = frame % 4;
  const ox = -Math.floor(r() * 400), oy = -Math.floor(r() * 400);
  return (
    <AbsoluteFill style={{overflow: 'hidden', mixBlendMode: 'overlay', opacity}}>
      <div style={{position: 'absolute', left: ox, top: oy, width: 2560, height: 2560, display: 'flex', flexWrap: 'wrap'}}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Img key={i} src={staticFile(`fx/grain${v}.png`)} style={{width: 1024 * 0.84, height: 1024 * 0.84}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Canvas that redraws deterministically every frame, sized to the composition. */
const FrameCanvas: React.FC<{draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void; style?: React.CSSProperties}> = ({draw, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const {width: W, height: H} = useVideoConfig();
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    draw(ctx, W, H);
  });
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', inset: 0, ...style}} />;
};

export const Dust: React.FC<{t: number; a?: number}> = ({t, a = 1}) => {
  if (a <= 0) return null;
  return (
    <FrameCanvas
      style={{mixBlendMode: 'screen'}}
      draw={(ctx, W, H) => {
        const r = rng(4242);
        const n = Math.round((70 * W * H) / (1920 * 1080));
        for (let i = 0; i < n; i++) {
          const x0 = r() * W, y0 = r() * H, sp = 6 + r() * 16, sz = 0.6 + r() * 2.2, ph = r() * 10;
          const x = (x0 + t * sp * (0.6 + 0.4 * noise1(i))) % (W + 40) - 20;
          const y = (y0 - t * sp * 0.35 + H + 20) % (H + 20) - 10;
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.8 + r()) + ph));
          ctx.fillStyle = `rgba(255,224,170,${0.32 * tw * a})`;
          ctx.beginPath();
          ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fill();
        }
      }}
    />
  );
};

const snowWindows = () => [
  [L('c5a').start - 0.8, L('c5a').end + 0.8],
  [L('c12a').start - 0.6, L('c12a').end + 1.0],
];

export const Snow: React.FC<{t: number}> = ({t}) => {
  let a = 0;
  for (const [s, e] of snowWindows()) a = Math.max(a, env(t, s, e, 1.2, 1.2));
  return <SnowField t={t} a={a} />;
};

export const SnowField: React.FC<{t: number; a: number}> = ({t, a}) => {
  if (a <= 0) return null;
  return (
    <FrameCanvas
      draw={(ctx, W, H) => {
        const r = rng(99);
        const bw = W + 280, bh = H + 120;
        const n = Math.round((420 * W * H) / (1920 * 1080));
        for (let i = 0; i < n; i++) {
          const depth = r();
          const x0 = r() * bw, y0 = r() * bh, ph = r() * 6.28;
          const fall = 40 + depth * 160, wind = -70 - depth * 120;
          const x = ((x0 + wind * t + Math.sin(t * 1.3 + ph) * 18) % bw + bw) % bw - 140;
          const y = ((y0 + fall * t) % bh) - 60;
          const sz = 0.8 + depth * 3.2;
          ctx.fillStyle = `rgba(245,248,255,${(0.25 + depth * 0.6) * a})`;
          ctx.beginPath();
          ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fill();
        }
      }}
    />
  );
};

const sandWindows = () => [
  [L('c3a').start - 0.6, L('c3b').end + 0.6],
  [L('c12c').start - 0.4, L('c12c').end + 0.8],
];

export const Sand: React.FC<{t: number}> = ({t}) => {
  let a = 0;
  for (const [s, e] of sandWindows()) a = Math.max(a, env(t, s, e, 1.2, 1.2));
  return <SandField t={t} a={a} />;
};

export const SandField: React.FC<{t: number; a: number}> = ({t, a}) => {
  if (a <= 0) return null;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(190,140,80,0.10), rgba(160,110,60,0.18))', opacity: a, mixBlendMode: 'multiply'}} />
      <FrameCanvas
        draw={(ctx, W, H) => {
          const r = rng(7);
          const bw = W + 480;
          const n = Math.round((260 * W * H) / (1920 * 1080));
          for (let i = 0; i < n; i++) {
            const depth = r();
            const x0 = r() * bw, y0 = r() * H;
            const sp = 260 + depth * 680;
            const x = ((x0 - sp * t) % bw + bw) % bw - 240;
            const y = y0 + Math.sin(t * 2 + i) * 6;
            const len = 18 + depth * 70;
            ctx.strokeStyle = `rgba(232,200,150,${(0.08 + depth * 0.22) * a})`;
            ctx.lineWidth = 0.6 + depth * 1.4;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + len, y - len * 0.08);
            ctx.stroke();
          }
        }}
      />
    </AbsoluteFill>
  );
};

/** Desert night: “夜则妖魑举火，烂若繁星”. */
export const GhostFires: React.FC<{t: number; head: {x: number; y: number} | null}> = ({t, head}) => {
  const night = env(t, L('c3b').end - 0.4, L('c3c').end + 0.8, 1.2, 1.4);
  if (night <= 0) return null;
  const fire = env(t, at('c3c', '妖魑', -0.3), L('c3c').end + 0.6, 0.9, 1.2);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'rgba(8,16,40,0.52)', mixBlendMode: 'multiply', opacity: night}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 30%, rgba(30,50,90,0.25), rgba(0,0,0,0.35))', opacity: night}} />
      {fire > 0 && (
        <FrameCanvas
          style={{mixBlendMode: 'screen'}}
          draw={(ctx) => {
            const r = rng(31337);
            const cx = head?.x ?? 700, cy = head?.y ?? 600;
            // tiny glints scattered like stars over the dunes
            for (let i = 0; i < 160; i++) {
              const x = cx + (r() - 0.5) * 1700, y = cy + (r() - 0.45) * 520;
              const tw = Math.max(0, Math.sin(t * (1.5 + r() * 3) + i * 2.3));
              if (y < 300 || y > 1050 || tw <= 0) continue;
              ctx.fillStyle = `rgba(170,255,235,${0.75 * tw * fire})`;
              ctx.beginPath();
              ctx.arc(x, y, 0.8 + r() * 1.6, 0, Math.PI * 2);
              ctx.fill();
            }
            // drifting will-o'-the-wisps
            for (let i = 0; i < 28; i++) {
              const ang = r() * Math.PI * 2, rad = 90 + r() * 640;
              const drift = (t * (6 + r() * 10)) % 60;
              const x = cx + Math.cos(ang) * rad * 1.4 + noise1(t * 0.8 + i, 3) * 24;
              const y = cy + Math.sin(ang) * rad * 0.42 - drift;
              if (y < 320 || y > 1040) continue;
              const life = Math.max(0, Math.sin(t * (0.9 + r() * 1.8) + i * 1.9));
              const sz = (2.5 + r() * 5) * (0.5 + 0.5 * life);
              const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 4);
              g.addColorStop(0, `rgba(225,255,245,${0.95 * life * fire})`);
              g.addColorStop(0.3, `rgba(80,235,205,${0.45 * life * fire})`);
              g.addColorStop(1, 'rgba(30,110,150,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.ellipse(x, y - sz, sz * 1.5, sz * 3.6, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/** “选中的，正是玄奘。” — the room goes dark and red. */
export const Dread: React.FC<{t: number}> = ({t}) => {
  const a = env(t, L('c7b').start - 0.5, L('c7c').start + 0.6, 0.5, 0.9);
  if (a <= 0) return null;
  const beat = 0.5 + 0.5 * Math.sin((t - L('c7b').start) * Math.PI * 2 * 1.15);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'rgba(0,0,0,0.5)', opacity: a}} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, rgba(120,0,0,0) 35%, rgba(150,10,5,${0.55 + 0.2 * beat}) 100%)`,
          opacity: a,
        }}
      />
    </AbsoluteFill>
  );
};

export const stormLevel = (t: number) => env(t, L('c7c').start - 0.2, L('c7c').end + 0.5, 0.6, 1.4);

export const Storm: React.FC<{t: number}> = ({t}) => {
  const a = stormLevel(t);
  if (a <= 0) return null;
  const strikes = [at('c7c', '黑风', 0.1), at('c7c', '折树', 0.2), at('c7c', '河流涌浪', 0.3)];
  let flash = 0;
  for (const s of strikes) flash = Math.max(flash, clamp(1 - Math.abs(t - s) / 0.09) * 0.9, clamp(1 - Math.abs(t - s - 0.16) / 0.06) * 0.6);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'rgba(10,12,18,0.5)', opacity: a, mixBlendMode: 'multiply'}} />
      <FrameCanvas
        draw={(ctx) => {
          const r = rng(5150);
          for (let i = 0; i < 180; i++) {
            const depth = r();
            const x0 = r() * 2400, y0 = r() * 1200;
            const sp = 500 + depth * 900;
            const x = ((x0 - sp * t) % 2400 + 2400) % 2400 - 200;
            const y = ((y0 + sp * 0.35 * t) % 1200) - 60;
            ctx.strokeStyle = `rgba(30,25,20,${(0.25 + depth * 0.45) * a})`;
            ctx.lineWidth = 1 + depth * 2.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 40 + depth * 60, y - 14 - depth * 20);
            ctx.stroke();
          }
        }}
      />
      {flash > 0 && <AbsoluteFill style={{background: `rgba(225,232,255,${flash * a})`, mixBlendMode: 'screen'}} />}
    </AbsoluteFill>
  );
};

export const shake = (t: number) => {
  const a = stormLevel(t) * 6;
  return {x: noise1(t * 9, 1) * a, y: noise1(t * 11, 2) * a};
};

/** Warm light sweep at chapter changes. */
export const LightLeak: React.FC<{t: number}> = ({t}) => {
  let best = 0, u = 0;
  for (const ch of ['changan', 'guazhou', 'mohe', 'gaochang', 'lingshan', 'bamiyan', 'ganges', 'nalanda', 'tour', 'kannauj', 'indus', 'pamir', 'return']) {
    const s = C(ch).start;
    const a = env(t, s - 0.2, s + 1.8, 0.5, 1.1);
    if (a > best) {
      best = a;
      u = clamp((t - s + 0.2) / 2.0);
    }
  }
  if (best <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: best * 0.55,
        background: `radial-gradient(ellipse 40% 90% at ${-10 + u * 120}% 40%, rgba(255,170,80,0.55) 0%, rgba(255,120,40,0.18) 40%, rgba(0,0,0,0) 70%)`,
      }}
    />
  );
};

export const Ripples: React.FC<{t: number; p: {x: number; y: number; on: boolean} | undefined}> = ({t, p}) => {
  const a = env(t, at('c11b', '风浪骤起', -0.4), L('c11b').end + 0.6, 0.4, 0.8);
  if (a <= 0 || !p?.on) return null;
  return (
    <AbsoluteFill>
      {[0, 1, 2, 3].map((i) => {
        const u = ((t * 0.6 + i / 4) % 1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x - 140 * u,
              top: p.y - 50 * u,
              width: 280 * u,
              height: 100 * u,
              borderRadius: '50%',
              border: '2px solid rgba(170,225,240,0.8)',
              opacity: (1 - u) * a,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
