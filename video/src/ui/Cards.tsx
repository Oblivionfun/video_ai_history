import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DuoCardData, FactsCardData, ImageCardData, PlateData, QuoteCardData} from '../data/cards';
import {clamp, easeInCubic, easeOutCubic, env, inv} from '../lib/interp';
import {COLOR, FONT, SHADOW} from '../theme';
import {InkImage} from './InkImage';

export const PANEL = {right: 96, width: 740};

/** Shared enter/exit motion for right-hand cards. */
export function cardMotion(t: number, t0: number, t1: number) {
  const e = easeOutCubic(clamp((t - t0) / 0.8));
  const x = easeInCubic(clamp((t - (t1 - 0.55)) / 0.55));
  return {
    visible: t >= t0 && t <= t1,
    e,
    x,
    style: {
      opacity: e * (1 - x),
      transform: `translateX(${(1 - e) * 70 + x * 30}px)`,
      filter: `blur(${(1 - e) * 10 + x * 8}px)`,
    } as React.CSSProperties,
  };
}

export const Tag: React.FC<{text: string; novel?: boolean; e?: number}> = ({text, novel, e = 1}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18}}>
    <div
      style={{
        width: 30,
        height: 30,
        background: novel ? COLOR.cinnabar : 'transparent',
        border: `1.5px solid ${novel ? '#f3c9b8' : COLOR.gold}`,
        color: novel ? '#fff2e8' : COLOR.gold,
        fontFamily: FONT.serif,
        fontWeight: 900,
        fontSize: 18,
        lineHeight: '28px',
        textAlign: 'center',
      }}
    >
      {novel ? '戏' : '史'}
    </div>
    <div
      style={{
        fontFamily: FONT.serif,
        fontWeight: 600,
        fontSize: 19,
        letterSpacing: '0.32em',
        color: novel ? '#f0a58e' : COLOR.gold,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
    <div
      style={{
        flex: 1,
        height: 1,
        background: `linear-gradient(90deg, ${novel ? 'rgba(232,90,60,0.7)' : 'rgba(230,196,126,0.7)'}, transparent)`,
        transform: `scaleX(${e})`,
        transformOrigin: 'left',
      }}
    />
  </div>
);

const Quote: React.FC<{text: string; size?: number; a?: number}> = ({text, size = 40, a = 1}) => (
  <div
    style={{
      fontFamily: FONT.brush,
      fontSize: size,
      lineHeight: 1.35,
      color: COLOR.goldBright,
      letterSpacing: '0.06em',
      textShadow: SHADOW.text,
      opacity: a,
      marginTop: 14,
    }}
  >
    “{text}”
  </div>
);

const Source: React.FC<{text: string; a?: number}> = ({text, a = 1}) => (
  <div
    style={{
      fontFamily: FONT.serif,
      fontSize: 18,
      letterSpacing: '0.18em',
      color: COLOR.muted,
      marginTop: 10,
      opacity: a,
    }}
  >
    —— {text}
  </div>
);

function Frame({kind, children}: {kind: string; children: React.ReactNode}) {
  if (kind === 'novel') {
    return (
      <div style={{position: 'relative', padding: 7, border: '1px solid rgba(230,196,126,0.55)'}}>
        <div style={{position: 'absolute', inset: 2, border: '1px solid rgba(230,196,126,0.25)'}} />
        {children}
      </div>
    );
  }
  return (
    <div
      style={{
        padding: 10,
        background: 'linear-gradient(135deg, #cdb98e, #e3d3ac 40%, #c7b083)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(60,40,10,0.5)',
      }}
    >
      <div style={{boxShadow: 'inset 0 0 0 1px rgba(60,40,10,0.6)'}}>{children}</div>
    </div>
  );
}

export const ImageCard: React.FC<{c: ImageCardData; t: number; seed: number}> = ({c, t, seed}) => {
  const m = cardMotion(t, c.t0, c.t1);
  if (!m.visible) return null;
  const novel = c.kind === 'novel';
  const reveal = clamp((t - c.t0 - 0.1) / 1.5);
  const kb = {p: inv(c.t0, c.t1, t), from: 1.03, to: 1.13, dx: seed % 2 ? 1 : -1, dy: 0.3};
  const loss = c.loss ? easeOutCubic(clamp((t - c.loss.t) / 2.2)) : 0;
  const filter = loss > 0 ? `grayscale(${loss}) brightness(${1 - 0.55 * loss}) contrast(${1 + 0.15 * loss}) sepia(${0.3 * loss})` : undefined;
  const textA = easeOutCubic(clamp((t - c.t0 - 0.6) / 0.7));
  const w = PANEL.width - (novel ? 16 : 20);
  const h = Math.round((w * 9) / 16);
  return (
    <div style={{position: 'absolute', right: PANEL.right, top: 150, width: PANEL.width, ...m.style}}>
      <Tag text={c.tag} novel={novel} e={m.e} />
      <Frame kind={c.kind}>
        <div style={{position: 'relative', width: w, height: h, background: '#0b0a08', overflow: 'hidden'}}>
          <InkImage name={c.src} width={w} height={h} reveal={reveal} seed={seed} kb={kb} filter={filter} />
          {loss > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at 62% 45%, rgba(0,0,0,${0.55 * loss}) 0%, rgba(0,0,0,0) 55%)`,
              }}
            />
          )}
        </div>
      </Frame>
      <div style={{opacity: textA, transform: `translateY(${(1 - textA) * 10}px)`}}>
        <div
          style={{
            marginTop: 22,
            fontFamily: FONT.serif,
            fontWeight: 900,
            fontSize: 50,
            letterSpacing: '0.1em',
            color: COLOR.paper,
            textShadow: SHADOW.text,
          }}
        >
          {c.title}
        </div>
        {c.sub && (
          <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 25, color: '#d9cfb9', marginTop: 8, letterSpacing: '0.08em'}}>
            {c.sub}
          </div>
        )}
        {c.quote && <Quote text={c.quote} />}
        {c.source && <Source text={c.source} />}
        {c.bullets && (
          <div style={{display: 'flex', gap: 34, marginTop: 18, flexWrap: 'wrap'}}>
            {c.bullets.map((b) => {
              const a = easeOutCubic(clamp((t - b.t + 0.1) / 0.5));
              return (
                <div
                  key={b.text}
                  style={{
                    opacity: a,
                    transform: `translateY(${(1 - a) * 12}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontFamily: FONT.serif,
                    fontWeight: 700,
                    fontSize: 27,
                    color: COLOR.goldBright,
                    letterSpacing: '0.08em',
                  }}
                >
                  <div style={{width: 8, height: 8, transform: 'rotate(45deg)', background: COLOR.cinnabarBright}} />
                  {b.text}
                </div>
              );
            })}
          </div>
        )}
        {c.loss && loss > 0 && (
          <div
            style={{
              marginTop: 18,
              fontFamily: FONT.serif,
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: '0.16em',
              color: COLOR.cinnabarBright,
              opacity: loss,
            }}
          >
            {c.loss.text}
          </div>
        )}
      </div>
    </div>
  );
};

export const DuoCard: React.FC<{c: DuoCardData; t: number}> = ({c, t}) => {
  const m = cardMotion(t, c.t0, c.t1);
  if (!m.visible) return null;
  const w = 352, h = 470;
  return (
    <div style={{position: 'absolute', right: PANEL.right, top: 150, width: PANEL.width, ...m.style}}>
      <Tag text={c.tag} novel e={m.e} />
      <div style={{display: 'flex', gap: 22}}>
        {c.items.map((it, i) => {
          const start = c.t0 + 0.1 + i * 0.7;
          const a = easeOutCubic(clamp((t - start - 0.5) / 0.6));
          return (
            <div key={it.src}>
              <Frame kind="novel">
                <div style={{width: w - 16, height: h, overflow: 'hidden', background: '#0b0a08'}}>
                  <InkImage
                    name={it.src}
                    width={w - 16}
                    height={h}
                    reveal={clamp((t - start) / 1.5)}
                    seed={11 + i * 5}
                    kb={{p: inv(c.t0, c.t1, t), from: 1.02, to: 1.1, dx: i ? 0.4 : -0.6, dy: -0.2, fx: it.fx}}
                  />
                </div>
              </Frame>
              <div style={{opacity: a, marginTop: 18}}>
                <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 42, letterSpacing: '0.12em', color: COLOR.paper, textShadow: SHADOW.text}}>
                  {it.title}
                </div>
                <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 21, color: '#f0a58e', marginTop: 6, letterSpacing: '0.1em'}}>
                  原型 · {it.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const QuoteCard: React.FC<{c: QuoteCardData; t: number}> = ({c, t}) => {
  const m = cardMotion(t, c.t0, c.t1);
  if (!m.visible) return null;
  const span = Math.min(c.t1 - c.t0 - 0.8, 0.9 + c.lines.join('').length * 0.22);
  const total = c.lines.join('').length;
  let acc = 0;
  const longest = Math.max(...c.lines.map((l) => l.length));
  const size = longest > 7 ? 58 : 70;
  return (
    <div
      style={{
        position: 'absolute',
        right: PANEL.right,
        top: 120,
        width: PANEL.width,
        height: 760,
        ...m.style,
      }}
    >
      {c.img && (
        <div style={{position: 'absolute', inset: 0, opacity: 0.85}}>
          <Frame kind="history">
            <div style={{width: PANEL.width - 20, height: 740, overflow: 'hidden'}}>
              <InkImage
                name={c.img}
                width={PANEL.width - 20}
                height={740}
                reveal={clamp((t - c.t0) / 1.8)}
                seed={3}
                kb={{p: inv(c.t0, c.t1, t), from: 1.0, to: 1.06, dx: -0.6, dy: 0}}
              />
            </div>
          </Frame>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          right: c.img ? 46 : 20,
          top: c.img ? 70 : 40,
          display: 'flex',
          flexDirection: 'row-reverse',
          gap: size * 0.42,
        }}
      >
        {c.lines.map((line) => {
          const a0 = acc / total;
          acc += line.length;
          const a1 = acc / total;
          const p = inv(c.t0 + 0.3 + a0 * span, c.t0 + 0.3 + a1 * span, t);
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
                color: c.img ? '#2a1d0e' : COLOR.paper,
                textShadow: c.img ? '0 0 1px rgba(40,25,5,0.4)' : SHADOW.text,
                WebkitMaskImage: `linear-gradient(to bottom, #000 ${p * 110 - 12}%, transparent ${p * 110}%)`,
                maskImage: `linear-gradient(to bottom, #000 ${p * 110 - 12}%, transparent ${p * 110}%)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: c.img ? 40 : undefined,
          right: c.img ? undefined : 24,
          bottom: c.img ? 46 : 70,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: c.img ? '8px 18px 8px 8px' : 0,
          background: c.img ? 'rgba(238,227,200,0.9)' : 'transparent',
          boxShadow: c.img ? '0 4px 18px rgba(60,40,10,0.35)' : 'none',
          opacity: easeOutCubic(clamp((t - c.t0 - 0.4 - span * 0.6) / 0.6)),
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            background: COLOR.cinnabar,
            color: '#fff1e6',
            fontFamily: FONT.brush,
            fontSize: 40,
            lineHeight: '52px',
            textAlign: 'center',
            boxShadow: 'inset 0 0 0 3px rgba(255,220,200,0.35)',
          }}
        >
          史
        </div>
        <div
          style={{
            fontFamily: FONT.serif,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '0.16em',
            color: c.img ? '#3b2a12' : COLOR.muted,
          }}
        >
          {c.source}
        </div>
      </div>
    </div>
  );
};

export const FactsCard: React.FC<{c: FactsCardData; t: number}> = ({c, t}) => {
  const m = cardMotion(t, c.t0, c.t1);
  if (!m.visible) return null;
  return (
    <div style={{position: 'absolute', right: PANEL.right, top: 300, width: PANEL.width, ...m.style}}>
      <Tag text={c.tag} e={m.e} />
      <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 66, letterSpacing: '0.12em', color: COLOR.paper, textShadow: SHADOW.text}}>
        {c.title}
      </div>
      {c.items && (
        <div style={{marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14}}>
          {c.items.map((it, i) => {
            const a = easeOutCubic(clamp((t - c.t0 - 0.45 - i * 0.35) / 0.6));
            return (
              <div
                key={it}
                style={{
                  opacity: a,
                  transform: `translateX(${(1 - a) * 18}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  fontFamily: FONT.serif,
                  fontWeight: 600,
                  fontSize: 30,
                  color: '#e8dcc2',
                  letterSpacing: '0.08em',
                }}
              >
                <div style={{width: 8, height: 8, transform: 'rotate(45deg)', background: COLOR.gold}} />
                {it}
              </div>
            );
          })}
        </div>
      )}
      {c.quote && <Quote text={c.quote} size={42} a={easeOutCubic(clamp((t - c.t0 - 0.5) / 0.7))} />}
      {c.source && <Source text={c.source} a={easeOutCubic(clamp((t - c.t0 - 0.8) / 0.7))} />}
      {c.legend && (
        <div style={{display: 'flex', gap: 40, marginTop: 30, opacity: easeOutCubic(clamp((t - c.t0 - 0.8) / 0.6))}}>
          {[
            ['去程', '#f6d58e'],
            ['归程', '#ff8a62'],
          ].map(([k, col]) => (
            <div key={k} style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.serif, fontSize: 24, color: '#e8dcc2', letterSpacing: '0.2em'}}>
              <div style={{width: 56, height: 4, background: col, boxShadow: `0 0 10px ${col}`}} />
              {k}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Plate: React.FC<{c: PlateData; t: number; seed: number}> = ({c, t, seed}) => {
  if (t < c.t0 || t > c.t1) return null;
  const reveal = clamp((t - c.t0) / 1.9);
  const out = easeInCubic(clamp((t - (c.t1 - 0.8)) / 0.8));
  const bars = easeOutCubic(clamp((t - c.t0 - 0.4) / 1.0)) * (1 - out);
  const ta = easeOutCubic(clamp((t - c.t0 - 1.2) / 0.9)) * (1 - out);
  const subA = easeOutCubic(clamp((t - c.t0 - 1.7) / 0.9)) * (1 - out);
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <InkImage
        name={c.src}
        width={1920}
        height={1080}
        reveal={reveal}
        seed={seed}
        kb={{p: inv(c.t0, c.t1, t), from: 1.02, to: 1.12, dx: seed % 2 ? 0.8 : -0.8, dy: -0.3}}
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.72) 100%)', opacity: reveal}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 92 * bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 92 * bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 130, bottom: 190, opacity: ta, transform: `translateY(${(1 - ta) * 16}px)`}}>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 21, letterSpacing: '0.36em', color: '#f0a58e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 30, height: 30, background: COLOR.cinnabar, color: '#fff2e8', fontWeight: 900, fontSize: 18, lineHeight: '30px', textAlign: 'center', letterSpacing: 0}}>戏</div>
          {c.tag}
        </div>
        <div style={{fontFamily: FONT.brush, fontSize: 128, lineHeight: 1.15, color: COLOR.paper, letterSpacing: '0.08em', textShadow: '0 4px 30px rgba(0,0,0,0.8)'}}>
          {c.title}
        </div>
        <div style={{opacity: subA}}>
          <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 32, letterSpacing: '0.22em', color: COLOR.goldBright, textShadow: SHADOW.text}}>
            {c.sub}
          </div>
          {c.note && (
            <div style={{fontFamily: FONT.serif, fontWeight: 400, fontSize: 22, letterSpacing: '0.16em', color: '#d9cfb9', marginTop: 10, textShadow: SHADOW.text}}>
              {c.note}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const RightShade: React.FC<{a: number}> = ({a}) =>
  a > 0 ? (
    <AbsoluteFill
      style={{
        opacity: a,
        background:
          'linear-gradient(90deg, rgba(6,6,8,0) 38%, rgba(6,6,8,0.55) 54%, rgba(6,6,8,0.86) 72%, rgba(6,6,8,0.9) 100%)',
      }}
    />
  ) : null;

export {env};
