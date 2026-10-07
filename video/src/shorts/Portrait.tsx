/**
 * 9:16 layout. Safe area: platform UI covers roughly the top 140px, the bottom 420px and a right-hand
 * button column (x > 940, y 900–1550), so text lives in x 80–940, y 150–1440.
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import brand from '../config/brand.json';
import {clamp, easeInCubic, easeOutCubic, inv} from '../lib/interp';
import {COLOR, FONT, SHADOW} from '../theme';
import {InkImage} from '../ui/InkImage';
import {WENDIE, WendieBody} from '../ui/Specials';
import {SealBox} from '../ui/Titles';
import {BuiltCut, Timed} from './build';
import {CutCard, CutTimeline} from './spec';

export const PHook: React.FC<{cut: BuiltCut; t: number}> = ({cut, t}) => {
  const h = cut.entry.json.hook;
  const e = easeOutCubic(clamp((t - 0.05) / 0.7));
  const out = easeInCubic(clamp((t - (cut.endT - 0.4)) / 0.5));
  return (
    <>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,5,8,0.82) 0%, rgba(4,5,8,0.55) 22%, rgba(4,5,8,0) 34%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', opacity: e * (1 - out)}}>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 32, height: 32, background: COLOR.cinnabar, color: '#fff2e8', fontFamily: FONT.serif, fontWeight: 900, fontSize: 19, lineHeight: '32px'}}>史</div>
          <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 28, letterSpacing: '0.24em', color: COLOR.goldBright, textShadow: SHADOW.text}}>{h.kicker}</div>
        </div>
        {h.lines.map((line, i) => {
          const k = easeOutCubic(clamp((t - 0.15 - i * 0.18) / 0.7));
          return (
            <div
              key={line}
              style={{
                fontFamily: FONT.brush,
                fontSize: 124,
                lineHeight: 1.08,
                marginTop: i === 0 ? 14 : 0,
                color: i === h.lines.length - 1 ? '#ffe9c4' : COLOR.paper,
                textShadow: '0 4px 24px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)',
                opacity: k,
                filter: `blur(${(1 - k) * 10}px)`,
                transform: `translateY(${(1 - k) * 18}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </>
  );
};

export const PSubtitles: React.FC<{tl: CutTimeline; t: number; hide: number}> = ({tl, t, hide}) => {
  const s = (tl.subsP ?? tl.subs).find((x) => t >= x.start - 0.05 && t < x.end + 0.1);
  return (
    <>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.7) 100%)'}} />
      {s && hide < 1 && (
        <div style={{position: 'absolute', left: 70, right: 70, bottom: 470, textAlign: 'center', opacity: Math.min(clamp((t - s.start + 0.05) / 0.12), clamp((s.end + 0.1 - t) / 0.12)) * (1 - hide)}}>
          <span
            style={{
              fontFamily: FONT.serif,
              fontWeight: 700,
              fontSize: 58,
              lineHeight: 1.3,
              letterSpacing: '0.04em',
              color: '#f8f0de',
              whiteSpace: 'pre-wrap',
              textShadow: '0 3px 6px rgba(0,0,0,0.95), 0 0 22px rgba(0,0,0,0.8), 0 0 2px #000',
            }}
          >
            {s.segs.map((g, i) => (
              <span key={i} style={g.q ? {color: COLOR.goldBright} : undefined}>
                {g.text}
              </span>
            ))}
          </span>
        </div>
      )}
    </>
  );
};

function motion(t: number, t0: number, t1: number) {
  const e = easeOutCubic(clamp((t - t0) / 0.7));
  const x = easeInCubic(clamp((t - (t1 - 0.45)) / 0.45));
  return {e, x, style: {opacity: e * (1 - x), transform: `translateY(${(1 - e) * 46 - x * 20}px)`, filter: `blur(${(1 - e) * 10 + x * 6}px)`} as React.CSSProperties};
}

const PTag: React.FC<{text: string; novel?: boolean}> = ({text, novel}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18}}>
    <div
      style={{
        width: 38,
        height: 38,
        background: novel ? COLOR.cinnabar : 'transparent',
        border: `2px solid ${novel ? '#f3c9b8' : COLOR.gold}`,
        color: novel ? '#fff2e8' : COLOR.gold,
        fontFamily: FONT.serif,
        fontWeight: 900,
        fontSize: 22,
        lineHeight: '34px',
        textAlign: 'center',
      }}
    >
      {novel ? '戏' : '史'}
    </div>
    <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 28, letterSpacing: '0.24em', color: novel ? '#f0a58e' : COLOR.gold, whiteSpace: 'nowrap'}}>{text}</div>
  </div>
);

const PImage: React.FC<{c: Timed<Extract<CutCard, {type: 'image'}>>; t: number; seed: number}> = ({c, t, seed}) => {
  const m = motion(t, c.t0, c.t1);
  const novel = c.kind === 'novel';
  const w = 940, h = 529;
  const lt = (c.loss as {t?: number} | undefined)?.t;
  const loss = lt !== undefined ? easeOutCubic(clamp((t - lt) / 1.8)) : 0;
  const filter = loss > 0 ? `grayscale(${loss}) brightness(${1 - 0.5 * loss}) sepia(${0.3 * loss})` : undefined;
  return (
    <div style={{position: 'absolute', left: 70, width: 940, top: 600, ...m.style}}>
      <PTag text={c.tag} novel={novel} />
      <div style={novel ? {padding: 6, border: '1px solid rgba(230,196,126,0.6)'} : {padding: 9, background: '#d6c39a'}}>
        <div style={{width: w - (novel ? 14 : 18), height: h, overflow: 'hidden', background: '#0b0a08'}}>
          <InkImage name={c.src} width={w - (novel ? 14 : 18)} height={h} reveal={clamp((t - c.t0 - 0.05) / 1.3)} seed={seed} kb={{p: inv(c.t0, c.t1, t), from: 1.03, to: 1.12, dx: seed % 2 ? 0.8 : -0.8, dy: 0.2, fx: c.fx}} filter={filter} />
        </div>
      </div>
      {loss > 0 && c.loss && (
        <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 36, letterSpacing: '0.12em', color: COLOR.cinnabarBright, marginTop: 18, opacity: loss, textShadow: SHADOW.text}}>{c.loss.text}</div>
      )}
      <div style={{opacity: easeOutCubic(clamp((t - c.t0 - 0.45) / 0.6)), marginTop: 22}}>
        <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 62, letterSpacing: '0.08em', color: COLOR.paper, textShadow: SHADOW.text}}>{c.title}</div>
        {c.sub && <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 32, color: '#e0d5bd', marginTop: 8, letterSpacing: '0.06em'}}>{c.sub}</div>}
        {c.quote && <div style={{fontFamily: FONT.brush, fontSize: 50, color: COLOR.goldBright, marginTop: 10, textShadow: SHADOW.text}}>“{c.quote}”</div>}
        {c.source && <div style={{fontFamily: FONT.serif, fontSize: 24, color: COLOR.muted, marginTop: 6, letterSpacing: '0.16em'}}>—— {c.source}</div>}
      </div>
    </div>
  );
};

const PQuote: React.FC<{c: Timed<Extract<CutCard, {type: 'quote'}>>; t: number}> = ({c, t}) => {
  const m = motion(t, c.t0, c.t1);
  const longest = Math.max(...c.lines.map((l) => l.length));
  const size = longest > 6 ? 82 : 100;
  const total = c.lines.join('').length;
  const span = Math.min(c.t1 - c.t0 - 0.8, 0.8 + total * 0.2);
  let acc = 0;
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 600, height: 760, ...m.style}}>
      <div style={{display: 'flex', flexDirection: 'row-reverse', justifyContent: 'center', gap: size * 0.45}}>
        {c.lines.map((line) => {
          const a0 = acc / total;
          acc += line.length;
          const p = inv(c.t0 + 0.25 + a0 * span, c.t0 + 0.25 + (acc / total) * span, t);
          return (
            <div
              key={line}
              style={{
                writingMode: 'vertical-rl',
                whiteSpace: 'nowrap',
                fontFamily: FONT.brush,
                fontSize: size,
                lineHeight: 1,
                letterSpacing: '0.12em',
                color: COLOR.paper,
                textShadow: SHADOW.text,
                WebkitMaskImage: `linear-gradient(to bottom, #000 ${p * 110 - 12}%, transparent ${p * 110}%)`,
                maskImage: `linear-gradient(to bottom, #000 ${p * 110 - 12}%, transparent ${p * 110}%)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, opacity: easeOutCubic(clamp((t - c.t0 - 0.3 - span * 0.6) / 0.6))}}>
        <SealBox text="史" size={52} />
        <div style={{fontFamily: FONT.serif, fontSize: 28, letterSpacing: '0.16em', color: '#d9cfb9', textShadow: SHADOW.text}}>{c.source}</div>
      </div>
    </div>
  );
};

const PFacts: React.FC<{c: Timed<Extract<CutCard, {type: 'facts'}>>; t: number}> = ({c, t}) => {
  const m = motion(t, c.t0, c.t1);
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: 690, ...m.style}}>
      <PTag text={c.tag} />
      <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 88, letterSpacing: '0.1em', color: COLOR.paper, textShadow: SHADOW.text}}>{c.title}</div>
      {c.items?.map((it, i) => {
        const a = easeOutCubic(clamp((t - c.t0 - 0.4 - i * 0.35) / 0.6));
        return (
          <div key={it} style={{opacity: a, transform: `translateX(${(1 - a) * 20}px)`, display: 'flex', alignItems: 'center', gap: 18, marginTop: 22, fontFamily: FONT.serif, fontWeight: 600, fontSize: 42, color: '#ece0c6', letterSpacing: '0.06em', textShadow: SHADOW.text}}>
            <div style={{width: 11, height: 11, transform: 'rotate(45deg)', background: COLOR.gold, flex: 'none'}} />
            {it}
          </div>
        );
      })}
      {c.quote && <div style={{fontFamily: FONT.brush, fontSize: 56, color: COLOR.goldBright, marginTop: 24, textShadow: SHADOW.text}}>“{c.quote}”</div>}
      {c.source && <div style={{fontFamily: FONT.serif, fontSize: 26, color: COLOR.muted, marginTop: 10, letterSpacing: '0.16em'}}>—— {c.source}</div>}
    </div>
  );
};

const PPlate: React.FC<{c: Timed<Extract<CutCard, {type: 'plate'}>>; t: number; seed: number}> = ({c, t, seed}) => {
  const reveal = clamp((t - c.t0) / 1.6);
  const out = easeInCubic(clamp((t - (c.t1 - 0.7)) / 0.7));
  const ta = easeOutCubic(clamp((t - c.t0 - 0.9) / 0.8)) * (1 - out);
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <InkImage name={c.src} width={1080} height={1920} reveal={reveal} seed={seed} kb={{p: inv(c.t0, c.t1, t), from: 1.02, to: 1.1, dx: 0.5, dy: -0.2, fx: c.fx ?? 0.5}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.78) 72%)', opacity: reveal}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 960, textAlign: 'center', opacity: ta, transform: `translateY(${(1 - ta) * 16}px)`}}>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, fontFamily: FONT.serif, fontWeight: 600, fontSize: 26, letterSpacing: '0.3em', color: '#f0a58e'}}>
          <div style={{width: 34, height: 34, background: COLOR.cinnabar, color: '#fff2e8', fontWeight: 900, fontSize: 20, lineHeight: '34px', letterSpacing: 0}}>戏</div>
          {c.tag}
        </div>
        <div style={{fontFamily: FONT.brush, fontSize: 150, lineHeight: 1.12, color: COLOR.paper, textShadow: '0 4px 30px rgba(0,0,0,0.85)'}}>{c.title}</div>
        <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 38, letterSpacing: '0.18em', color: COLOR.goldBright, textShadow: SHADOW.text}}>{c.sub}</div>
        {c.note && <div style={{fontFamily: FONT.serif, fontSize: 28, letterSpacing: '0.14em', color: '#d9cfb9', marginTop: 10}}>{c.note}</div>}
      </div>
    </AbsoluteFill>
  );
};

const PScroll: React.FC<{c: Timed<Extract<CutCard, {type: 'scroll'}>>; t: number}> = ({c, t}) => {
  const out = easeInCubic(clamp((t - (c.t1 - 0.5)) / 0.5));
  const la = easeOutCubic(clamp((t - (c.sealT ?? c.t0) - 1.6) / 0.7));
  const k = 940 / WENDIE.W;
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', left: 70, top: 660, transform: `scale(${k})`, transformOrigin: '0 0'}}>
        <WendieBody t={t} t0={c.t0} sealStart={c.sealT ?? c.t0 + 1} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 660 + WENDIE.H * k + 46, textAlign: 'center', opacity: la}}>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 28, letterSpacing: '0.36em', color: '#f0a58e'}}>{c.tag ?? '西游记 · 小说'}</div>
        <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 56, letterSpacing: '0.24em', color: COLOR.paper, marginTop: 8, textShadow: SHADOW.text}}>{c.label ?? '国书 → 通关文牒'}</div>
      </div>
    </AbsoluteFill>
  );
};

export const PCards: React.FC<{cut: BuiltCut; t: number}> = ({cut, t}) => {
  const dim = cut.busy(t);
  return (
    <>
      {dim > 0 && <AbsoluteFill style={{background: `rgba(3,4,6,${0.62 * dim})`}} />}
      {cut.cards.map((c, i) => {
        if (t < c.t0 - 0.05 || t > c.t1 + 0.05) return null;
        if (c.type === 'image') return <PImage key={i} c={c} t={t} seed={i + 3} />;
        if (c.type === 'quote') return <PQuote key={i} c={c} t={t} />;
        if (c.type === 'facts') return <PFacts key={i} c={c} t={t} />;
        if (c.type === 'scroll') return <PScroll key={i} c={c} t={t} />;
        if (c.type === 'plate') return <PPlate key={i} c={c} t={t} seed={i + 5} />;
        return null;
      })}
    </>
  );
};

export const PEnd: React.FC<{cut: BuiltCut; t: number}> = ({cut, t}) => {
  const t0 = cut.endT;
  const a = easeOutCubic(clamp((t - t0) / 0.7));
  if (a <= 0) return null;
  const b = easeOutCubic(clamp((t - t0 - 0.5) / 0.7));
  const c = easeOutCubic(clamp((t - t0 - 1.1) / 0.7));
  const n = cut.next;
  return (
    <AbsoluteFill style={{opacity: a}}>
      <AbsoluteFill style={{background: 'rgba(4,5,8,0.78)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 30, letterSpacing: '0.4em', color: COLOR.gold}}>{cut.entry.json.end?.full ?? '完整版 · 看主页'}</div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, marginTop: 18}}>
          <div style={{fontFamily: FONT.brush, fontSize: 150, color: COLOR.paper, lineHeight: 1, textShadow: '0 6px 40px rgba(0,0,0,0.9)', whiteSpace: 'nowrap'}}>{cut.identity.film}</div>
          <SealBox text={cut.identity.seal} size={70} />
        </div>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 36, letterSpacing: '0.2em', color: '#efe4cc', marginTop: 22}}>{cut.identity.tagline}</div>
      </div>
      <div style={{position: 'absolute', left: 110, right: 110, top: 760, opacity: b, transform: `translateY(${(1 - b) * 20}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 20}}>
          <div style={{width: 34, height: 34, background: COLOR.cinnabar, color: '#fff2e8', fontFamily: FONT.serif, fontWeight: 900, fontSize: 20, lineHeight: '34px', textAlign: 'center'}}>下</div>
          <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 28, letterSpacing: '0.4em', color: COLOR.goldBright}}>{n.kicker}</div>
        </div>
        <div style={{padding: 6, border: '1px solid rgba(230,196,126,0.6)'}}>
          <div style={{width: 848, height: 477, overflow: 'hidden'}}>
            <InkImage name={n.img} width={848} height={477} reveal={clamp((t - t0 - 0.4) / 1.2)} seed={44} kb={{p: inv(t0, t0 + 6, t), from: 1.02, to: 1.08, dx: -0.4, dy: 0}} />
          </div>
        </div>
        <div style={{fontFamily: FONT.brush, fontSize: 62, color: COLOR.paper, textAlign: 'center', marginTop: 24, whiteSpace: 'nowrap', textShadow: SHADOW.text}}>{n.title}</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1420, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, opacity: c}}>
        <SealBox text="关注" size={60} />
        <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 34, letterSpacing: '0.24em', color: COLOR.paper}}>{brand.name ? `${brand.name} · ` : ''}{brand.slogan}</div>
      </div>
    </AbsoluteFill>
  );
};
