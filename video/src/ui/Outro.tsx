import React from 'react';
import {AbsoluteFill} from 'remotion';
import brand from '../config/brand.json';
import {episodeOf} from '../shorts/registry';
import {CREDITS} from '../data/cards';
import {clamp, easeInCubic, easeInOutCubic, easeOutCubic, env, inv} from '../lib/interp';
import {at, C, DURATION, L} from '../lib/time';
import {useMapFrame} from '../map/MapScene';
import {COLOR, FONT, SHADOW} from '../theme';
import {InkImage} from './InkImage';
import {SealBox} from './Titles';

/** 筋斗云: one somersault from Chang'an to Vulture Peak. Rendered inside the map context. */
export const Somersault: React.FC = () => {
  const mf = useMapFrame();
  if (!mf) return null;
  const t = mf.t;
  const t0 = at('e1', '筋斗云', -0.2);
  const a = env(t, t0, L('e1').end + 0.8, 0.2, 0.9);
  if (a <= 0) return null;
  const A = mf.pos['n:changan'], B = mf.pos['x:lingjiu'];
  if (!A || !B) return null;
  const p = easeInOutCubic(clamp((t - t0) / 1.0));
  const cx = (A.x + B.x) / 2, cy = Math.min(A.y, B.y) - 380;
  const q = (u: number) => {
    const x = (1 - u) ** 2 * A.x + 2 * (1 - u) * u * cx + u * u * B.x;
    const y = (1 - u) ** 2 * A.y + 2 * (1 - u) * u * cy + u * u * B.y;
    return [x, y];
  };
  const [hx, hy] = q(p);
  const d = `M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`;
  const textA = easeOutCubic(clamp((t - at('e1', '十万八千里', -0.2)) / 0.6)) * a;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: a}}>
        <defs>
          <linearGradient id="cloudg" x1="0" x2="1">
            <stop offset="0" stopColor="#ffd88a" stopOpacity="0.1" />
            <stop offset="1" stopColor="#fff4d6" stopOpacity="1" />
          </linearGradient>
          <filter id="cloudglow">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <path d={d} fill="none" stroke="#ffcf7a" strokeWidth={26} pathLength={1} strokeDasharray={`${p} 1`} opacity={0.5} filter="url(#cloudglow)" />
        <path d={d} fill="none" stroke="#fff0c8" strokeWidth={9} pathLength={1} strokeDasharray={`${p} 1`} opacity={0.6} filter="url(#cloudglow)" />
        <path d={d} fill="none" stroke="url(#cloudg)" strokeWidth={4} pathLength={1} strokeDasharray={`${p} 1`} />
      </svg>
      {p < 1 && (
        <div style={{position: 'absolute', left: hx, top: hy}}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: -70 + i * 16,
                top: -26 + (i % 2) * 12,
                width: 70 + (i % 3) * 18,
                height: 44,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,250,235,0.95), rgba(255,220,150,0.4) 60%, rgba(255,200,120,0) 75%)',
              }}
            />
          ))}
        </div>
      )}
      <div style={{position: 'absolute', right: 130, top: 640, textAlign: 'right', opacity: textA, transform: `translateY(${(1 - textA) * 14}px)`}}>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 22, letterSpacing: '0.5em', color: '#f0a58e'}}>神话 · 筋斗云</div>
        <div style={{fontFamily: FONT.brush, fontSize: 116, color: COLOR.paper, textShadow: '0 6px 40px rgba(0,0,0,0.85)'}}>十万八千里</div>
      </div>
    </AbsoluteFill>
  );
};

const Num: React.FC<{text: string; label: string; a: number}> = ({text, label, a}) => (
  <div style={{opacity: a, transform: `translateX(${(1 - a) * 20}px)`, display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 22}}>
    <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 21, letterSpacing: '0.3em', color: COLOR.gold}}>{label}</div>
    <div style={{fontFamily: FONT.brush, fontSize: 92, color: COLOR.paper, lineHeight: 1.12, textShadow: '0 6px 40px rgba(0,0,0,0.85)'}}>{text}</div>
  </div>
);

export const Footsteps: React.FC<{t: number}> = ({t}) => {
  const a = env(t, L('e2').start - 0.2, L('e3').start - 0.5, 0.5, 0.7);
  if (a <= 0) return null;
  const a1 = easeOutCubic(clamp((t - at('e2', '五万里', -0.2)) / 0.6));
  const a2 = easeOutCubic(clamp((t - at('e2', '十七年', -0.2)) / 0.6));
  const a3 = easeOutCubic(clamp((t - at('e2', '十七年', 0.7)) / 0.6));
  return (
    <div style={{position: 'absolute', right: 130, top: 560, opacity: a, textAlign: 'right'}}>
      <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 22, letterSpacing: '0.5em', color: '#f0a58e', marginBottom: 4}}>历史 · 一双脚</div>
      <Num text="五万里" label="行程" a={a1} />
      <Num text="十七年" label="629 — 645" a={a2} />
      <Num text="一百三十八国" label="亲践一百一十 · 传闻二十八" a={a3} />
    </div>
  );
};

/** Teaser for the next episode + follow line; sides stay clear for platform end-screen elements. */
const EndCard: React.FC<{t: number; t0: number}> = ({t, t0}) => {
  const a = easeOutCubic(clamp((t - t0) / 0.9));
  if (a <= 0) return null;
  const img = clamp((t - t0 - 0.15) / 1.4);
  const ta = easeOutCubic(clamp((t - t0 - 0.6) / 0.8));
  const ca = easeOutCubic(clamp((t - t0 - 1.3) / 0.8));
  const n = episodeOf('ep01').next;
  return (
    <AbsoluteFill style={{opacity: a}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16}}>
        <div style={{width: 34, height: 34, background: COLOR.cinnabar, color: '#fff2e8', fontFamily: FONT.serif, fontWeight: 900, fontSize: 20, lineHeight: '34px', textAlign: 'center'}}>
          下
        </div>
        <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 28, letterSpacing: '0.5em', color: COLOR.goldBright}}>{n.kicker}</div>
      </div>
      <div style={{position: 'absolute', left: 580, top: 214, width: 760, padding: 8, border: '1px solid rgba(230,196,126,0.6)'}}>
        <div style={{width: 744, height: 418, overflow: 'hidden', background: '#0b0a08'}}>
          <InkImage name={n.img} width={744} height={418} reveal={img} seed={33} kb={{p: inv(t0, t0 + 9, t), from: 1.02, to: 1.09, dx: -0.4, dy: 0}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 676, textAlign: 'center', opacity: ta, transform: `translateY(${(1 - ta) * 12}px)`}}>
        <div style={{fontFamily: FONT.brush, fontSize: 92, color: COLOR.paper, lineHeight: 1.1, textShadow: '0 6px 40px rgba(0,0,0,0.9)'}}>{n.title}</div>
        <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 27, letterSpacing: '0.24em', color: '#e2d6bc', marginTop: 14}}>{n.sub}</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 912, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, opacity: ca}}>
        <SealBox text="关注" size={56} />
        <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 30, letterSpacing: '0.3em', color: COLOR.paper}}>
          {brand.name ? `${brand.name} · ` : ''}
          {brand.slogan}
        </div>
        <div style={{width: 1, height: 30, background: 'rgba(230,196,126,0.6)'}} />
        <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 26, letterSpacing: '0.3em', color: COLOR.gold}}>{brand.cadence}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Finale: React.FC<{t: number}> = ({t}) => {
  const t0 = L('e3').start - 0.7;
  if (t < t0) return null;
  const reveal = clamp((t - t0) / 2.2);
  const titleT = L('e3').end + 0.5;
  const credT = titleT + 2.4;
  const cardT = credT + 4.4;
  const out = easeInCubic(clamp((t - cardT + 0.6) / 0.6));
  const ta = easeOutCubic(clamp((t - titleT) / 1.2)) * (1 - out);
  const ca = easeOutCubic(clamp((t - credT) / 1.0)) * (1 - out);
  const end = easeInCubic(clamp((t - (DURATION - 1.6)) / 1.5));
  const dim = 0.25 + 0.4 * easeOutCubic(clamp((t - titleT) / 1.2)) + 0.2 * easeOutCubic(clamp((t - cardT) / 1.0));
  return (
    <AbsoluteFill>
      <InkImage name="xy_finale" width={1920} height={1080} reveal={reveal} seed={21} kb={{p: inv(t0, DURATION, t), from: 1.0, to: 1.1, dx: 0.4, dy: -0.4}} />
      <AbsoluteFill style={{background: `rgba(0,0,0,${dim})`}} />
      <EndCard t={t} t0={cardT} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', opacity: ta, filter: `blur(${(1 - ta) * 8}px)`}}>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26}}>
          <div style={{fontFamily: FONT.brush, fontSize: 210, color: COLOR.paper, lineHeight: 1, textShadow: '0 6px 50px rgba(0,0,0,0.9)'}}>玄奘西行</div>
          <SealBox text="西游" size={74} />
        </div>
        <div style={{fontFamily: FONT.latin, fontWeight: 600, fontSize: 32, letterSpacing: '0.34em', color: COLOR.gold, marginTop: 26}}>629 — 645</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 150, opacity: ca}}>
        {CREDITS.map(([k, v]) => (
          <div key={k} style={{display: 'flex', justifyContent: 'center', gap: 24, marginTop: 10, fontFamily: FONT.serif, fontSize: 19, letterSpacing: '0.14em', textShadow: SHADOW.text}}>
            <span style={{color: COLOR.gold, width: 140, textAlign: 'right', fontWeight: 700}}>{k}</span>
            <span style={{color: '#d8cfbd', width: 900, textAlign: 'left', fontWeight: 400}}>{v}</span>
          </div>
        ))}
      </div>
      <AbsoluteFill style={{background: '#000', opacity: end}} />
    </AbsoluteFill>
  );
};

export const epiStart = () => C('epi').start;
