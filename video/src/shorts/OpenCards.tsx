import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, easeInCubic, easeOutCubic} from '../lib/interp';
import {COLOR, FONT, SHADOW} from '../theme';
import {SealBox} from '../ui/Titles';
import {BuiltCut, Timed} from './build';
import {CutCard, Orientation} from './spec';

type TitleC = Timed<Extract<CutCard, {type: 'title'}>>;
type ChapterC = Timed<Extract<CutCard, {type: 'chapter'}>>;

export const TitleCard: React.FC<{c: TitleC; t: number; o: Orientation}> = ({c, t, o}) => {
  const P = o === 'portrait';
  const k = t - c.t0;
  const out = easeInCubic(clamp((t - (c.t1 - 1.2)) / 1.2));
  const glyphs = Array.from(c.text);
  const size = Math.min(P ? 170 : 236, Math.floor((P ? 860 : 1500) / glyphs.length));
  const top = P ? 640 : 330;
  const kick = easeOutCubic(clamp((k - 1.2) / 1.0));
  const sub = easeOutCubic(clamp((k - 1.9) / 1.0));
  const seal = clamp((k - 0.4 - glyphs.length * 0.28) / 0.3);
  return (
    <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 + out * 0.08})`, filter: `blur(${out * 6}px)`}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% ${P ? 42 : 48}%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 42%, rgba(0,0,0,0) 70%)`, opacity: clamp(k / 0.8)}} />
      {c.kicker && (
        <div style={{position: 'absolute', left: 0, right: 0, top: top - (P ? 70 : 62), textAlign: 'center', opacity: kick}}>
          <div style={{fontFamily: FONT.latin, fontWeight: 500, fontSize: P ? 24 : 26, letterSpacing: '0.62em', color: COLOR.gold}}>{c.kicker}</div>
        </div>
      )}
      <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', gap: 6}}>
        {glyphs.map((g, i) => {
          const e = easeOutCubic(clamp((k - i * 0.28) / 1.1));
          return (
            <div
              key={i}
              style={{
                fontFamily: FONT.brush,
                fontSize: size,
                lineHeight: 1,
                color: COLOR.paper,
                opacity: e,
                filter: `blur(${(1 - e) * 14}px)`,
                transform: `translateY(${(1 - e) * 26}px) scale(${1.12 - 0.12 * e})`,
                textShadow: '0 0 40px rgba(240,200,120,0.25), 0 6px 40px rgba(0,0,0,0.8)',
              }}
            >
              {g}
            </div>
          );
        })}
        {c.seal && (
          <div style={{position: 'relative', width: 0}}>
            <div style={{position: 'absolute', left: 18, top: size * 0.64, opacity: seal, transform: `scale(${1 + 0.6 * (1 - seal)})`}}>
              <SealBox text={c.seal} size={P ? 64 : 78} />
            </div>
          </div>
        )}
      </div>
      <div style={{position: 'absolute', left: P ? 80 : 0, right: P ? 80 : 0, top: top + size + (P ? 40 : 46), textAlign: 'center', opacity: sub, transform: `translateY(${(1 - sub) * 12}px)`}}>
        {c.sub && <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: P ? 34 : 36, letterSpacing: P ? '0.2em' : '0.36em', color: '#efe4cc', textShadow: SHADOW.text}}>{c.sub}</div>}
        {c.dates && (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 26}}>
            <div style={{width: 120 * sub, height: 1, background: 'linear-gradient(90deg, transparent, rgba(230,196,126,0.9))'}} />
            <div style={{fontFamily: FONT.latin, fontWeight: 600, fontSize: 30, letterSpacing: '0.3em', color: COLOR.gold}}>{c.dates}</div>
            <div style={{width: 120 * sub, height: 1, background: 'linear-gradient(90deg, rgba(230,196,126,0.9), transparent)'}} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const ChapterCard: React.FC<{c: ChapterC; t: number; o: Orientation}> = ({c, t, o}) => {
  const P = o === 'portrait';
  const k = t - c.t0;
  const seal = easeOutCubic(clamp(k / 0.35));
  const name = clamp((k - 0.25) / 0.9);
  const theme = easeOutCubic(clamp((k - 0.8) / 0.7));
  const out = easeInCubic(clamp((t - (c.t1 - 0.7)) / 0.7));
  const mask = `linear-gradient(90deg, #000 ${name * 120 - 20}%, transparent ${name * 120}%)`;
  const nameEl = (
    <div
      style={{
        fontFamily: FONT.serif,
        fontWeight: 900,
        fontSize: P ? 92 : 98,
        lineHeight: 1,
        letterSpacing: '0.12em',
        color: COLOR.paper,
        whiteSpace: 'nowrap',
        textShadow: '0 4px 30px rgba(0,0,0,0.8)',
        WebkitMaskImage: mask,
        maskImage: mask,
        filter: `blur(${(1 - name) * 4}px)`,
      }}
    >
      {c.name}
    </div>
  );
  const themeEl = c.theme && (
    <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: P ? 34 : 32, letterSpacing: P ? '0.3em' : '0.42em', color: COLOR.goldBright, textShadow: SHADOW.text}}>{c.theme}</div>
  );
  const enEl = c.en && (
    <div style={{fontFamily: FONT.latin, fontWeight: 500, fontSize: P ? 22 : 21, letterSpacing: '0.5em', color: 'rgba(230,196,126,0.75)', marginTop: 12, opacity: theme}}>{c.en}</div>
  );
  const wrap: React.CSSProperties = {opacity: (1 - out) * Math.min(1, seal * 1.5), filter: `blur(${out * 8}px)`};
  if (P) {
    return (
      <AbsoluteFill style={wrap}>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0) 70%)'}} />
        <div style={{position: 'absolute', left: 80, right: 80, top: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30}}>
          <SealBox text={c.num} size={96} s={1 + 0.5 * (1 - seal)} />
          {nameEl}
          <div style={{textAlign: 'center', opacity: theme, transform: `translateY(${(1 - theme) * 14}px)`}}>
            {themeEl}
            {enEl}
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <div style={{position: 'absolute', left: 118, top: 128, display: 'flex', gap: 30, alignItems: 'flex-start', ...wrap}}>
      <SealBox text={c.num} size={104} s={1 + 0.5 * (1 - seal)} />
      <div>
        {nameEl}
        <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 20, opacity: theme, transform: `translateX(${(1 - theme) * 20}px)`}}>
          {themeEl}
          <div style={{width: 140 * theme, height: 1, background: 'linear-gradient(90deg, rgba(230,196,126,0.9), transparent)'}} />
        </div>
        {enEl}
      </div>
    </div>
  );
};

/** The chapter whose opener has started by t, and whether its big opener is still on screen. */
export function chapterAt(cut: BuiltCut, t: number): {c: ChapterC; opening: boolean} | null {
  let hit: ChapterC | null = null;
  for (const c of cut.cards) if (c.type === 'chapter' && t >= c.t0) hit = c as ChapterC;
  return hit ? {c: hit, opening: t < hit.t1} : null;
}

export const titleOn = (cut: BuiltCut, t: number) => cut.cards.some((c) => c.type === 'title' && t >= c.t0 - 0.3 && t <= c.t1);

export const OpenCards: React.FC<{cut: BuiltCut; t: number; o: Orientation}> = ({cut, t, o}) => (
  <>
    {cut.cards.map((c, i) => {
      if (t < c.t0 - 0.05 || t > c.t1 + 0.05) return null;
      if (c.type === 'title') return <TitleCard key={i} c={c as TitleC} t={t} o={o} />;
      if (c.type === 'chapter') return <ChapterCard key={i} c={c as ChapterC} t={t} o={o} />;
      return null;
    })}
  </>
);
