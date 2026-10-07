import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CARDS, CHAPTER_INFO, rightBusy} from '../data/cards';
import {AREA_LABELS, STORY_PINS} from '../data/route';
import {REACH} from '../director';
import {clamp, easeOutBack, easeOutCubic, env, inv} from '../lib/interp';
import {NAMED_NODES} from '../lib/journey';
import {at, C, TIMELINE} from '../lib/time';
import {COLOR, FONT, SHADOW} from '../theme';
import {Projected, useMapFrame} from './MapScene';

const EPI = C('epi').start;

/** Labels fade out where right-hand cards live, so the two never collide. */
const sideFade = (x: number, busy: number) => 1 - busy * clamp((x - 900) / 160);

/** The big chapter title occupies the top-left corner for its first seconds. */
function titleBusy(t: number) {
  let v = 0;
  for (const c of TIMELINE.chapters) {
    if (!CHAPTER_INFO[c.id]) continue;
    v = Math.max(v, env(t, c.start, c.start + 4.7, 0.3, 0.6));
  }
  return v;
}
const titleFade = (p: Projected, tb: number) =>
  (1 - tb * clamp((860 - p.x) / 80) * clamp((400 - p.y) / 60)) * (1 - clamp((640 - p.x) / 60) * clamp((150 - p.y) / 40));

const Marker: React.FC<{major: boolean; age: number}> = ({major, age}) => {
  const pop = easeOutBack(clamp(age / 0.55));
  const ring = clamp(age / 1.4);
  return (
    <div style={{position: 'absolute', left: 0, top: 0}}>
      {ring < 1 && (
        <div
          style={{
            position: 'absolute',
            left: -30 * ring - 4,
            top: -30 * ring - 4,
            width: 60 * ring + 8,
            height: 60 * ring + 8,
            borderRadius: '50%',
            border: `1.5px solid ${COLOR.goldBright}`,
            opacity: (1 - ring) * 0.9,
          }}
        />
      )}
      {major ? (
        <div
          style={{
            position: 'absolute',
            left: -7,
            top: -7,
            width: 14,
            height: 14,
            transform: `rotate(45deg) scale(${pop})`,
            border: `2px solid ${COLOR.goldBright}`,
            background: 'rgba(20,14,6,0.85)',
            boxShadow: `0 0 12px rgba(248,214,140,0.8)`,
          }}
        >
          <div style={{position: 'absolute', left: 3, top: 3, width: 4, height: 4, background: COLOR.goldBright}} />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: -4.5,
            top: -4.5,
            width: 9,
            height: 9,
            borderRadius: '50%',
            transform: `scale(${pop})`,
            background: COLOR.gold,
            border: '1.5px solid rgba(10,8,4,0.9)',
            boxShadow: '0 0 8px rgba(248,214,140,0.7)',
          }}
        />
      )}
    </div>
  );
};

const NodeLabel: React.FC<{
  p: Projected;
  name: string;
  modern?: string;
  major: boolean;
  side: 'l' | 'r';
  age: number;
  alpha: number;
}> = ({p, name, modern, major, side, age, alpha}) => {
  const a = easeOutCubic(clamp((age - 0.15) / 0.6)) * alpha;
  if (a <= 0.01) return null;
  if (major) {
    return (
      <div style={{position: 'absolute', left: p.x, top: p.y, opacity: a}}>
        <div
          style={{
            position: 'absolute',
            left: -18,
            bottom: 18 + (1 - a) * 8,
            writingMode: 'vertical-rl',
            whiteSpace: 'nowrap',
            fontFamily: FONT.serif,
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: '0.14em',
            color: COLOR.paper,
            textShadow: SHADOW.text,
            lineHeight: 1,
          }}
        >
          {name}
        </div>
        {modern && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: -60,
              width: 120,
              textAlign: 'center',
              fontFamily: FONT.serif,
              fontWeight: 500,
              fontSize: 15,
              letterSpacing: '0.2em',
              color: COLOR.gold,
              textShadow: SHADOW.text,
            }}
          >
            {modern}
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: side === 'r' ? p.x + 12 : undefined,
        right: side === 'l' ? 1920 - p.x + 12 : undefined,
        top: p.y - 13,
        opacity: a,
        whiteSpace: 'nowrap',
        fontFamily: FONT.serif,
        fontWeight: 600,
        fontSize: 21,
        letterSpacing: '0.08em',
        color: COLOR.paper,
        textShadow: SHADOW.text,
        transform: `translateX(${(side === 'r' ? -1 : 1) * (1 - a) * 8}px)`,
      }}
    >
      {name}
      {modern && <span style={{fontSize: 14, fontWeight: 400, color: COLOR.gold, marginLeft: 6}}>{modern}</span>}
    </div>
  );
};

const AREA_STYLE: Record<string, {size: number; color: string; z: [number, number]}> = {
  mountain: {size: 25, color: 'rgba(242,232,210,0.62)', z: [4.2, 8.4]},
  desert: {size: 24, color: 'rgba(240,214,160,0.62)', z: [4.2, 8.4]},
  region: {size: 22, color: 'rgba(242,232,210,0.5)', z: [4.0, 7.2]},
  water: {size: 21, color: 'rgba(170,222,236,0.7)', z: [3.8, 8.4]},
  river: {size: 18, color: 'rgba(170,222,236,0.75)', z: [4.4, 8.4]},
};

export const Head: React.FC<{p: Projected; t: number}> = ({p, t}) => {
  const pulse = 1 + 0.12 * Math.sin(t * 5.2);
  return (
    <div style={{position: 'absolute', left: p.x, top: p.y}}>
      <div
        style={{
          position: 'absolute',
          left: -40 * pulse,
          top: -40 * pulse,
          width: 80 * pulse,
          height: 80 * pulse,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,236,190,0.55) 0%, rgba(240,170,70,0.22) 38%, rgba(240,170,70,0) 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -6,
          top: -6,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#fffaf0',
          boxShadow: '0 0 14px 4px rgba(255,226,160,0.95), 0 0 34px 10px rgba(240,160,60,0.45)',
        }}
      />
    </div>
  );
};

/** Vermilion seal pin that ties a novel episode to its real-world place. */
export const StoryPin: React.FC<{
  p: Projected;
  novel: string;
  real: string;
  a: number;
  side: 'l' | 'r';
  showReal: boolean;
  below?: boolean;
  dy?: number;
}> = ({p, novel, real, a, side, showReal, below = false, dy = 0}) => {
  if (a <= 0.01) return null;
  const s = easeOutBack(clamp(a));
  return (
    <div style={{position: 'absolute', left: p.x, top: p.y + dy, opacity: clamp(a * 1.4)}}>
      <div
        style={{
          position: 'absolute',
          left: -9,
          top: -9,
          width: 18,
          height: 18,
          transform: `scale(${s}) rotate(45deg)`,
          background: COLOR.cinnabar,
          border: '2px solid #f6d7c8',
          boxShadow: '0 0 16px rgba(232,90,60,0.85)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: below ? 30 : -20,
          left: side === 'r' ? (below ? -6 : 18) : undefined,
          right: side === 'l' ? (below ? -6 : 18) : undefined,
          whiteSpace: 'nowrap',
          padding: '3px 12px 4px',
          background: 'rgba(150,34,20,0.88)',
          border: '1px solid rgba(255,200,180,0.55)',
          fontFamily: FONT.serif,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.12em',
          color: '#fff3ea',
          transform: `translateX(${(side === 'r' ? -1 : 1) * (1 - a) * 12}px)`,
        }}
      >
        {novel}
        {showReal && (
          <span style={{fontWeight: 400, fontSize: 15, color: '#ffd9c9', marginLeft: 8, letterSpacing: '0.06em'}}>
            {real}
          </span>
        )}
      </div>
    </div>
  );
};

export const MapOverlay: React.FC = () => {
  const mf = useMapFrame();
  if (!mf) return null;
  const {t, zoom, pos, head} = mf;
  const busy = rightBusy(t);
  const tb = titleBusy(t);
  const epi = clamp((t - EPI - 1.5) / 2);
  const zMinor = clamp((zoom - 5.5) / 0.4);
  const zMajor = clamp((zoom - 4.9) / 0.4);
  const journey = t > C('pro').end - 1;

  const pinCards = CARDS.filter((c) => 'pin' in c && c.pin) as (typeof CARDS[number] & {pin: string})[];

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {AREA_LABELS.map((al) => {
        const p = pos[`a:${al.id}`];
        if (!p?.on || !journey) return null;
        const st = AREA_STYLE[al.kind];
        const za = Math.min(inv(st.z[0], st.z[0] + 0.4, zoom), 1 - inv(st.z[1] - 0.4, st.z[1], zoom));
        const a = za * sideFade(p.x, busy) * titleFade(p, tb) * (1 - epi * 0.6);
        if (a <= 0.01) return null;
        return (
          <div
            key={al.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              transform: 'translate(-50%, -50%)',
              opacity: a,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              fontFamily: FONT.serif,
              fontWeight: 500,
              fontSize: st.size,
              letterSpacing: al.kind === 'river' ? '0.3em' : '0.55em',
              color: st.color,
              textShadow: '0 1px 6px rgba(0,0,0,0.9)',
            }}
          >
            {al.text}
            {al.sub && (
              <div style={{fontSize: 13, letterSpacing: '0.3em', marginTop: 3, opacity: 0.85}}>{al.sub}</div>
            )}
          </div>
        );
      })}

      {NAMED_NODES.map((n) => {
        const p = pos[`n:${n.id}`];
        const r = REACH[n.id];
        if (!p?.on || r === undefined || t < r) return null;
        const major = n.kind === 'major';
        const age = t - r;
        const settle = major ? 1 : 1 - 0.35 * clamp((age - 5) / 2);
        const za = major ? zMajor : zMinor;
        const alpha = settle * za * sideFade(p.x, busy) * titleFade(p, tb) * (1 - epi);
        if (alpha <= 0.01 && age > 1.5) return null;
        return (
          <React.Fragment key={n.id}>
            <div style={{position: 'absolute', left: p.x, top: p.y, opacity: Math.max(alpha, epi * 0.75)}}>
              <Marker major={major} age={age} />
            </div>
            <NodeLabel p={p} name={n.name!} modern={n.modern} major={major} side={n.side ?? 'r'} age={age} alpha={alpha} />
          </React.Fragment>
        );
      })}

      {pinCards.map((c) => {
        const pin = STORY_PINS.find((sp) => sp.id === c.pin)!;
        const p = pos[`p:${pin.id}`];
        const a = env(t, c.t0 + 0.4, c.t1, 0.6, 0.4);
        if (!p?.on || a <= 0) return null;
        const draw = easeOutCubic(clamp((t - c.t0 - 0.5) / 0.9));
        const x2 = 1062, y2 = 540;
        const mx = (p.x + x2) / 2;
        const path = `M ${p.x} ${p.y} C ${mx} ${p.y - 40}, ${mx} ${y2}, ${x2} ${y2}`;
        return (
          <React.Fragment key={c.id}>
            <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: a}}>
              <path d={path} fill="none" stroke="rgba(232,90,60,0.9)" strokeWidth={1.6} pathLength={1} strokeDasharray={`${draw} 1`} />
              <circle cx={x2} cy={y2} r={3.5 * draw} fill={COLOR.cinnabarBright} />
            </svg>
            <StoryPin p={p} novel={pin.novel} real={pin.real} a={a} side={pin.side} showReal={false} below />
          </React.Fragment>
        );
      })}

      {epi > 0 &&
        STORY_PINS.map((sp, i) => {
          const p = pos[`p:${sp.id}`];
          if (!p?.on) return null;
          const a = clamp((t - EPI - 2.2 - i * 0.32) / 0.6);
          return <StoryPin key={sp.id} p={p} novel={sp.novel} real={sp.real} a={a} side={sp.epiSide ?? sp.side} showReal dy={sp.dy} />;
        })}

      {(() => {
        const p = pos['x:huoyan'];
        const a = env(t, at('c4d', '火焰山', -0.4), at('c4d', '夏季', 1.2), 0.6, 0.6);
        if (!p?.on || a <= 0) return null;
        return (
          <div style={{position: 'absolute', left: p.x, top: p.y, opacity: a}}>
            <div
              style={{
                position: 'absolute',
                left: -140,
                top: -60,
                width: 280,
                height: 120,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(255,90,40,0.45), rgba(255,90,40,0) 70%)',
                mixBlendMode: 'screen',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: -200,
                width: 400,
                top: -96,
                textAlign: 'center',
                fontFamily: FONT.brush,
                fontSize: 58,
                letterSpacing: '0.2em',
                color: '#ffd2b8',
                textShadow: '0 0 18px rgba(255,80,30,0.9), 0 2px 8px rgba(0,0,0,0.9)',
              }}
            >
              火焰山
            </div>
          </div>
        );
      })()}

      {journey && head.on && t < C('epi').start + 1 && <Head p={head} t={t} />}
    </AbsoluteFill>
  );
};
