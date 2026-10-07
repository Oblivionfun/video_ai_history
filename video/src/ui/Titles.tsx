import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CHAPTER_INFO, plateCover} from '../data/cards';
import {clamp, easeInCubic, easeOutBack, easeOutCubic, env} from '../lib/interp';
import {C, L, TIMELINE} from '../lib/time';
import {COLOR, FONT, SHADOW} from '../theme';

const SealBox: React.FC<{text: string; size: number; s?: number}> = ({text, size, s = 1}) => {
  const two = Array.from(text).length > 1;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: COLOR.cinnabar,
        boxShadow: 'inset 0 0 0 3px rgba(255,214,196,0.32), 0 6px 24px rgba(0,0,0,0.5)',
        color: '#fff2e8',
        fontFamily: FONT.brush,
        fontSize: two ? size * 0.44 : size * 0.7,
        lineHeight: two ? 1.05 : `${size}px`,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transform: `scale(${s})`,
      }}
    >
      {two ? Array.from(text).map((c, i) => <span key={i}>{c}</span>) : text}
    </div>
  );
};

export const ChapterTitles: React.FC<{t: number}> = ({t}) => {
  const ch = TIMELINE.chapters.find((c) => t >= c.start && t < c.end && CHAPTER_INFO[c.id]);
  if (!ch) return null;
  const info = CHAPTER_INFO[ch.id];
  const t0 = ch.start + 0.15;
  const t1 = ch.start + 4.6;
  const big = t < t1;
  if (big) {
    const k = t - t0;
    const seal = easeOutCubic(clamp(k / 0.35));
    const name = clamp((k - 0.25) / 0.9);
    const theme = easeOutCubic(clamp((k - 0.8) / 0.7));
    const out = easeInCubic(clamp((t - (t1 - 0.7)) / 0.7));
    return (
      <div
        style={{
          position: 'absolute',
          left: 118,
          top: 128,
          opacity: (1 - out) * Math.min(1, seal * 1.5),
          filter: `blur(${out * 8}px)`,
          display: 'flex',
          gap: 30,
          alignItems: 'flex-start',
        }}
      >
        <SealBox text={info.num} size={104} s={1 + 0.5 * (1 - seal)} />
        <div>
          <div
            style={{
              fontFamily: FONT.serif,
              fontWeight: 900,
              fontSize: 98,
              lineHeight: 1,
              letterSpacing: '0.12em',
              color: COLOR.paper,
              textShadow: '0 4px 30px rgba(0,0,0,0.8)',
              WebkitMaskImage: `linear-gradient(90deg, #000 ${name * 120 - 20}%, transparent ${name * 120}%)`,
              maskImage: `linear-gradient(90deg, #000 ${name * 120 - 20}%, transparent ${name * 120}%)`,
              filter: `blur(${(1 - name) * 4}px)`,
            }}
          >
            {info.name}
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 20, opacity: theme, transform: `translateX(${(1 - theme) * 20}px)`}}>
            <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 32, letterSpacing: '0.42em', color: COLOR.goldBright, textShadow: SHADOW.text}}>
              {info.theme}
            </div>
            <div style={{width: 140 * theme, height: 1, background: 'linear-gradient(90deg, rgba(230,196,126,0.9), transparent)'}} />
          </div>
          <div style={{fontFamily: FONT.latin, fontWeight: 500, fontSize: 21, letterSpacing: '0.5em', color: 'rgba(230,196,126,0.75)', marginTop: 12, opacity: theme}}>
            {info.en}
          </div>
        </div>
      </div>
    );
  }
  const a = env(t, t1 - 0.2, ch.end - 0.3, 0.6, 0.5) * (1 - plateCover(t));
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 70, top: 58, display: 'flex', alignItems: 'center', gap: 14, opacity: a * 0.92}}>
      <SealBox text={info.num} size={38} />
      <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 26, letterSpacing: '0.2em', color: COLOR.paper, textShadow: SHADOW.text}}>{info.name}</div>
      <div style={{width: 26, height: 1, background: 'rgba(230,196,126,0.7)'}} />
      <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 19, letterSpacing: '0.3em', color: COLOR.gold, textShadow: SHADOW.text}}>{info.theme}</div>
    </div>
  );
};

export const IntroTitle: React.FC<{t: number}> = ({t}) => {
  const t0 = L('pro3').end + 0.1;
  const t1 = L('pro4').start + 2.6;
  if (t < t0 - 0.5 || t > t1 + 0.1) return null;
  const k = t - t0;
  const out = easeInCubic(clamp((t - (t1 - 1.2)) / 1.2));
  const glyphs = Array.from('玄奘西行');
  const en = easeOutCubic(clamp((k - 1.6) / 1.0));
  const sub = easeOutCubic(clamp((k - 2.3) / 1.0));
  const seal = clamp((k - 1.9) / 0.3);
  return (
    <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 + out * 0.08})`, filter: `blur(${out * 6}px)`}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 42%, rgba(0,0,0,0) 70%)', opacity: clamp(k / 0.8)}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 268, textAlign: 'center', opacity: en}}>
        <div style={{fontFamily: FONT.latin, fontWeight: 500, fontSize: 26, letterSpacing: '0.62em', color: COLOR.gold}}>THE REAL JOURNEY TO THE WEST</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', gap: 6}}>
        {glyphs.map((g, i) => {
          const p = clamp((k - i * 0.28) / 1.1);
          const e = easeOutCubic(p);
          return (
            <div
              key={g}
              style={{
                fontFamily: FONT.brush,
                fontSize: 236,
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
        <div style={{position: 'relative', width: 0}}>
          <div style={{position: 'absolute', left: 18, top: 150, opacity: seal, transform: `scale(${1 + 0.6 * (1 - seal)})`}}>
            <SealBox text="西游" size={78} />
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 612, textAlign: 'center', opacity: sub, transform: `translateY(${(1 - sub) * 12}px)`}}>
        <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 36, letterSpacing: '0.36em', color: '#efe4cc', textShadow: SHADOW.text}}>
          一条真实的取经路 · 与《西游记》的诞生
        </div>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 26}}>
          <div style={{width: 120 * sub, height: 1, background: 'linear-gradient(90deg, transparent, rgba(230,196,126,0.9))'}} />
          <div style={{fontFamily: FONT.latin, fontWeight: 600, fontSize: 30, letterSpacing: '0.3em', color: COLOR.gold}}>629 — 645</div>
          <div style={{width: 120 * sub, height: 1, background: 'linear-gradient(90deg, rgba(230,196,126,0.9), transparent)'}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TourTitle: React.FC<{t: number}> = ({t}) => {
  const c = C('tour');
  const a = env(t, c.start + 0.3, c.end - 0.2, 0.8, 0.7);
  if (a <= 0) return null;
  const k = t - c.start;
  return (
    <div style={{position: 'absolute', left: 150, top: 330, opacity: a}}>
      <div style={{display: 'flex', gap: 4}}>
        {Array.from('遍游五印').map((g, i) => {
          const e = easeOutCubic(clamp((k - 0.4 - i * 0.22) / 0.9));
          return (
            <div key={g} style={{fontFamily: FONT.brush, fontSize: 150, lineHeight: 1, color: COLOR.paper, opacity: e, filter: `blur(${(1 - e) * 10}px)`, textShadow: '0 6px 40px rgba(0,0,0,0.85)'}}>
              {g}
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 26, fontFamily: FONT.serif, fontWeight: 600, fontSize: 27, letterSpacing: '0.3em', color: COLOR.goldBright, textShadow: SHADOW.text, opacity: easeOutCubic(clamp((k - 1.6) / 0.8))}}>
        东到海滨 · 南抵建志补罗 · 西至信度河畔
      </div>
    </div>
  );
};

export {SealBox, easeOutBack};
