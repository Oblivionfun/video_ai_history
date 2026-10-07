import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, easeOutBack, easeOutCubic} from '../lib/interp';
import {Head, StoryPin} from '../map/MapOverlay';
import {Projected, useMapFrame} from '../map/MapScene';
import {COLOR, FONT, SHADOW} from '../theme';
import {BuiltCut} from './build';
import {Orientation, win} from './spec';

const Scaled: React.FC<{p: Projected; s: number; children: React.ReactNode}> = ({p, s, children}) => (
  <div style={{position: 'absolute', left: p.x, top: p.y, transform: `scale(${s})`, transformOrigin: '0 0'}}>{children}</div>
);

const City: React.FC<{name: string; modern?: string; a: number; side: 'l' | 'r'}> = ({name, modern, a, side}) => {
  const pop = easeOutBack(clamp(a));
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: clamp(a * 1.4)}}>
      <div
        style={{
          position: 'absolute',
          left: -8,
          top: -8,
          width: 16,
          height: 16,
          transform: `rotate(45deg) scale(${pop})`,
          border: `2px solid ${COLOR.goldBright}`,
          background: 'rgba(20,14,6,0.85)',
          boxShadow: '0 0 12px rgba(248,214,140,0.8)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -17,
          left: side === 'r' ? 18 : undefined,
          right: side === 'l' ? 18 : undefined,
          whiteSpace: 'nowrap',
          fontFamily: FONT.serif,
          fontWeight: 900,
          fontSize: 28,
          letterSpacing: '0.1em',
          color: COLOR.paper,
          textShadow: SHADOW.text,
        }}
      >
        {name}
        {modern && <span style={{fontSize: 17, fontWeight: 500, color: COLOR.gold, marginLeft: 8}}>{modern}</span>}
      </div>
    </div>
  );
};

const Label: React.FC<{text: string; sub?: string; style?: string; a: number}> = ({text, sub, style, a}) => {
  const fire = style === 'fire';
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: a}}>
      {fire && (
        <div
          style={{
            position: 'absolute',
            left: -170,
            top: -70,
            width: 340,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,90,40,0.5), rgba(255,90,40,0) 70%)',
            mixBlendMode: 'screen',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: -260,
          width: 520,
          top: fire ? -104 : -30,
          textAlign: 'center',
          fontFamily: fire ? FONT.brush : FONT.serif,
          fontWeight: fire ? 400 : 600,
          fontSize: fire ? 64 : 30,
          letterSpacing: fire ? '0.2em' : '0.5em',
          color: fire ? '#ffd2b8' : style === 'gold' ? COLOR.goldBright : 'rgba(242,232,210,0.82)',
          textShadow: fire ? '0 0 18px rgba(255,80,30,0.9), 0 2px 8px rgba(0,0,0,0.9)' : '0 1px 8px rgba(0,0,0,0.9)',
          transform: `translateY(${(1 - a) * 8}px)`,
        }}
      >
        {text}
        {sub && <div style={{fontFamily: FONT.serif, fontSize: 18, letterSpacing: '0.3em', marginTop: 4, color: COLOR.gold}}>{sub}</div>}
      </div>
    </div>
  );
};

export const ShortOverlay: React.FC<{cut: BuiltCut; o: Orientation}> = ({cut, o}) => {
  const mf = useMapFrame();
  if (!mf) return null;
  const {t, pos} = mf;
  const s = o === 'portrait' ? 1.75 : 1.25;
  // portrait cards sit on top of the map, so labels step back while a card is up
  const dim = o === 'portrait' ? 1 - 0.85 * cut.busy(t) : 1;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: dim}}>
      {cut.overlays.map((ov, i) => {
        const a = win(t, ov.t0, ov.t1, 0.4, 0.35);
        if (a <= 0) return null;
        if (ov.type === 'line') {
          const A = pos[ov.a], B = pos[ov.b];
          if (!A || !B) return null;
          const draw = easeOutCubic(clamp((t - ov.t0) / 1.2));
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
          return (
            <AbsoluteFill key={i} style={{opacity: a}}>
              <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
                <line x1={A.x} y1={A.y} x2={A.x + (B.x - A.x) * draw} y2={A.y + (B.y - A.y) * draw} stroke="#ff6a4a" strokeWidth={4 * s} strokeDasharray={`${14 * s} ${10 * s}`} strokeLinecap="round" />
                <circle cx={A.x} cy={A.y} r={7 * s} fill="#ff6a4a" />
                {draw > 0.98 && <circle cx={B.x} cy={B.y} r={7 * s} fill="#ff6a4a" />}
              </svg>
              {ov.label && (
                <div style={{position: 'absolute', left: mx, top: my, transform: `translate(-50%, -150%) scale(${s})`, whiteSpace: 'nowrap', padding: '4px 14px', background: 'rgba(150,34,20,0.88)', border: '1px solid rgba(255,200,180,0.55)', fontFamily: FONT.serif, fontWeight: 700, fontSize: 22, letterSpacing: '0.14em', color: '#fff3ea', opacity: draw}}>
                  {ov.label}
                </div>
              )}
            </AbsoluteFill>
          );
        }
        if (ov.type === 'walker') {
          return mf.head.on ? (
            <div key={i} style={{opacity: a}}>
              <Head p={mf.head} t={t} />
            </div>
          ) : null;
        }
        if (ov.type === 'pin') {
          const p = pos[`p:${ov.pin}`];
          const sp = cut.journey.route.STORY_PINS.find((x) => x.id === ov.pin);
          if (!p?.on || !sp) return null;
          const k = easeOutCubic(clamp((t - ov.t0) / 0.5));
          return (
            <Scaled key={i} p={{...p, y: p.y + (ov.dy ?? 0)}} s={s}>
              <StoryPin p={{x: 0, y: 0, on: true}} novel={sp.novel} real={sp.real} a={k * a} side={ov.side ?? sp.side} showReal />
            </Scaled>
          );
        }
        if (ov.type === 'city') {
          const p = pos[`n:${ov.node}`];
          const n = cut.journey.NODES[ov.node];
          if (!p?.on || !n?.name) return null;
          return (
            <Scaled key={i} p={p} s={s}>
              <City name={n.name} modern={n.modern} a={a} side={ov.side ?? n.side ?? 'r'} />
            </Scaled>
          );
        }
        const p = pos[ov.anchor];
        if (!p?.on) return null;
        return (
          <Scaled key={i} p={p} s={s}>
            <Label text={ov.text} sub={ov.sub} style={ov.style} a={a} />
          </Scaled>
        );
      })}
    </AbsoluteFill>
  );
};
