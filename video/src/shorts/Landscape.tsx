import React from 'react';
import {AbsoluteFill} from 'remotion';
import brand from '../config/brand.json';
import {Card} from '../data/cards';
import {clamp, easeInOutCubic, easeOutCubic, inv} from '../lib/interp';
import {COLOR, FONT, SHADOW} from '../theme';
import {FactsCard, ImageCard, Plate, QuoteCard, RightShade} from '../ui/Cards';
import {InkImage} from '../ui/InkImage';
import {WENDIE, WendieBody} from '../ui/Specials';
import {SealBox} from '../ui/Titles';
import {BuiltCut} from './build';
import {chapterAt, titleOn} from './OpenCards';
import {CutTimeline} from './spec';

/** Big centred hook for the first seconds, then it settles into a corner tag. */
export const LTitle: React.FC<{cut: BuiltCut; t: number}> = ({cut, t}) => {
  const h = cut.entry.json.hook;
  const inA = easeOutCubic(clamp((t - 0.1) / 0.8));
  const move = easeInOutCubic(clamp((t - 3.4) / 0.9));
  const out = clamp((t - (cut.endT - 0.5)) / 0.5);
  if (move < 1) {
    return (
      <AbsoluteFill style={{opacity: inA * (1 - move)}}>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0.6), rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 75%)'}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', transform: `scale(${1 - 0.15 * move})`}}>
          <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 30, letterSpacing: '0.4em', color: COLOR.goldBright, textShadow: SHADOW.text}}>{h.kicker}</div>
          {h.lines.map((line, i) => (
            <div key={line} style={{fontFamily: FONT.brush, fontSize: 150, lineHeight: 1.1, color: i ? '#ffe9c4' : COLOR.paper, textShadow: '0 6px 40px rgba(0,0,0,0.9)'}}>
              {line}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  const ch = chapterAt(cut, t);
  if (ch?.opening || titleOn(cut, t)) return null;
  if (ch) {
    const a = clamp((t - ch.c.t1) / 0.6) * (1 - out) * (1 - cut.plate(t));
    return (
      <div style={{position: 'absolute', left: 70, top: 58, display: 'flex', alignItems: 'center', gap: 14, opacity: a * 0.92}}>
        <SealBox text={ch.c.num} size={38} />
        <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 26, letterSpacing: '0.2em', color: COLOR.paper, textShadow: SHADOW.text}}>{ch.c.name}</div>
        {ch.c.theme && <div style={{width: 26, height: 1, background: 'rgba(230,196,126,0.7)'}} />}
        {ch.c.theme && <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 19, letterSpacing: '0.3em', color: COLOR.gold, textShadow: SHADOW.text}}>{ch.c.theme}</div>}
      </div>
    );
  }
  return (
    <div style={{position: 'absolute', left: 70, top: 58, display: 'flex', alignItems: 'center', gap: 14, opacity: 0.94 * (1 - out)}}>
      <div style={{width: 38, height: 38, background: COLOR.cinnabar, color: '#fff2e8', fontFamily: FONT.serif, fontWeight: 900, fontSize: 21, lineHeight: '38px', textAlign: 'center'}}>史</div>
      <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 28, letterSpacing: '0.16em', color: COLOR.paper, textShadow: SHADOW.text}}>{h.lines.join('，')}</div>
    </div>
  );
};

export const LSubtitles: React.FC<{tl: CutTimeline; t: number; hide: number}> = ({tl, t, hide}) => {
  const s = tl.subs.find((x) => t >= x.start - 0.05 && t < x.end + 0.1);
  if (!s || hide >= 1) return null;
  const a = Math.min(clamp((t - s.start + 0.05) / 0.12), clamp((s.end + 0.1 - t) / 0.12)) * (1 - hide);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 64, textAlign: 'center', opacity: a}}>
      <span style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 46, letterSpacing: '0.06em', color: '#f6eedc', whiteSpace: 'pre', textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.75), 0 0 2px #000'}}>
        {s.segs.map((g, i) => (
          <span key={i} style={g.q ? {color: COLOR.goldBright} : undefined}>
            {g.text}
          </span>
        ))}
      </span>
    </div>
  );
};

/** Cut cards rendered with the main film's right-hand panel components. */
export const LCards: React.FC<{cut: BuiltCut; t: number}> = ({cut, t}) => (
  <>
    <RightShade a={cut.busy(t) * (1 - cut.plate(t))} />
    {cut.cards.map((c, i) => {
      if (t < c.t0 - 0.05 || t > c.t1 + 0.05) return null;
      const id = `${cut.entry.json.id}-${i}`;
      const card = {...c, id} as unknown as Card;
      if (c.type === 'image') return <ImageCard key={id} c={card as Extract<Card, {type: 'image'}>} t={t} seed={i + 2} />;
      if (c.type === 'quote') return <QuoteCard key={id} c={card as Extract<Card, {type: 'quote'}>} t={t} />;
      if (c.type === 'facts') return <FactsCard key={id} c={card as Extract<Card, {type: 'facts'}>} t={t} />;
      if (c.type === 'scroll') {
        const out = clamp((t - (c.t1 - 0.5)) / 0.5);
        return (
          <AbsoluteFill key={id} style={{opacity: 1 - out}}>
            <AbsoluteFill style={{background: 'rgba(4,4,6,0.6)', opacity: easeOutCubic(clamp((t - c.t0) / 1.0))}} />
            <div style={{position: 'absolute', left: (1920 - WENDIE.W) / 2, top: 150}}>
              <WendieBody t={t} t0={c.t0} sealStart={c.sealT ?? c.t0 + 1} />
            </div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 750, textAlign: 'center', opacity: easeOutCubic(clamp((t - (c.sealT ?? c.t0) - 1.6) / 0.7))}}>
              <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 22, letterSpacing: '0.4em', color: '#f0a58e'}}>{c.tag ?? '西游记 · 小说'}</div>
              <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 48, letterSpacing: '0.3em', color: COLOR.paper, marginTop: 6, textShadow: SHADOW.text}}>{c.label ?? '国书 → 通关文牒'}</div>
            </div>
          </AbsoluteFill>
        );
      }
      if (c.type === 'plate') return <Plate key={id} c={card as Extract<Card, {type: 'plate'}>} t={t} seed={i + 4} />;
      return null;
    })}
  </>
);

export const LEnd: React.FC<{cut: BuiltCut; t: number}> = ({cut, t}) => {
  const t0 = cut.endT;
  const a = easeOutCubic(clamp((t - t0) / 0.7));
  if (a <= 0) return null;
  const b = easeOutCubic(clamp((t - t0 - 0.5) / 0.7));
  const n = cut.next;
  return (
    <AbsoluteFill style={{opacity: a}}>
      <AbsoluteFill style={{background: 'rgba(4,5,8,0.8)'}} />
      <div style={{position: 'absolute', left: 150, top: 300, width: 760}}>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 26, letterSpacing: '0.4em', color: COLOR.gold}}>{cut.entry.json.end?.full ?? '完整版 · 看主页'}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 14}}>
          <div style={{fontFamily: FONT.brush, fontSize: 132, color: COLOR.paper, lineHeight: 1, whiteSpace: 'nowrap'}}>{cut.identity.film}</div>
          <SealBox text={cut.identity.seal} size={64} />
        </div>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 32, letterSpacing: '0.2em', color: '#efe4cc', marginTop: 20}}>{cut.identity.tagline}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 70}}>
          <SealBox text="关注" size={54} />
          <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 30, letterSpacing: '0.24em', color: COLOR.paper}}>{brand.name ? `${brand.name} · ` : ''}{brand.slogan}</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 1040, top: 270, width: 720, opacity: b, transform: `translateX(${(1 - b) * 24}px)`}}>
        <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 26, letterSpacing: '0.4em', color: COLOR.goldBright, marginBottom: 16}}>{n.kicker}</div>
        <div style={{padding: 6, border: '1px solid rgba(230,196,126,0.6)'}}>
          <div style={{width: 706, height: 397, overflow: 'hidden'}}>
            <InkImage name={n.img} width={706} height={397} reveal={clamp((t - t0 - 0.4) / 1.2)} seed={45} kb={{p: inv(t0, t0 + 6, t), from: 1.02, to: 1.08, dx: -0.4, dy: 0}} />
          </div>
        </div>
        <div style={{fontFamily: FONT.brush, fontSize: 56, color: COLOR.paper, marginTop: 20, whiteSpace: 'nowrap', textShadow: SHADOW.text}}>{n.title}</div>
      </div>
    </AbsoluteFill>
  );
};
