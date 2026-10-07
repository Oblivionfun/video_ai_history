import React from 'react';
import {AbsoluteFill} from 'remotion';
import {STORY_PINS} from '../data/route';
import {COLD, COLD_SHOTS} from '../director';
import {clamp, easeOutBack, easeOutCubic, env} from '../lib/interp';
import {L} from '../lib/time';
import {Head, StoryPin} from '../map/MapOverlay';
import {Projected, useMapFrame} from '../map/MapScene';

const pinOf = (id: string) => STORY_PINS.find((p) => p.id === id)!;

/** A story pin drawn at `scale` around its own anchor point. */
const BigPin: React.FC<{p: Projected; id: string; a: number; scale: number; side?: 'l' | 'r'; dy?: number}> = ({p, id, a, scale, side, dy}) => {
  const sp = pinOf(id);
  return (
    <div style={{position: 'absolute', left: p.x, top: p.y, transform: `scale(${scale})`, transformOrigin: '0 0'}}>
      <StoryPin p={{x: 0, y: 0, on: true}} novel={sp.novel} real={sp.real} a={a} side={side ?? sp.side} showReal dy={dy} />
    </div>
  );
};

/** Hook before the prologue: four novel places, each pinned to its real location, then the whole road. */
export const ColdOpen: React.FC = () => {
  const mf = useMapFrame();
  if (!mf || mf.t > COLD.end + 0.5) return null;
  const {t, pos} = mf;
  const shot = COLD_SHOTS.find((s) => t >= s.t0 && t < s.t1);
  const wideA = env(t, COLD.wide - 0.4, COLD.rewind[0] + 0.3, 0.3, 0.45);
  const walker = env(t, COLD.redraw[0], COLD.redraw[1] + 0.25, 0.2, 0.3);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {shot && (() => {
        const p = pos[`p:${shot.pin}`];
        if (!p?.on) return null;
        const a = clamp((t - shot.t0 - 0.08) / 0.32);
        const hot = shot.pin === 'p_huoyan';
        return (
          <>
            {hot && (
              <AbsoluteFill
                style={{
                  background: `radial-gradient(ellipse 70% 40% at ${(p.x / 1920) * 100}% ${(p.y / 1080) * 100}%, rgba(255,90,30,0.55), rgba(255,90,30,0) 72%)`,
                  mixBlendMode: 'screen',
                }}
              />
            )}
            <BigPin p={p} id={shot.pin} a={easeOutBack(a)} scale={1.75} side="r" />
          </>
        );
      })()}

      {wideA > 0 &&
        STORY_PINS.map((sp, i) => {
          const p = pos[`p:${sp.id}`];
          if (!p?.on) return null;
          const a = clamp((t - COLD.wide + 0.2 - i * 0.16) / 0.5) * wideA;
          if (a <= 0) return null;
          return <StoryPin key={sp.id} p={p} novel={sp.novel} real={sp.real} a={a} side={sp.epiSide ?? sp.side} showReal dy={sp.dy} />;
        })}

      {walker > 0 && mf.head.on && (
        <div style={{opacity: walker}}>
          <Head p={mf.head} t={t} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** White flash on every hard cut of the cold open. */
export const ColdFlash: React.FC<{t: number}> = ({t}) => {
  let a = 0;
  for (const s of COLD_SHOTS.slice(1)) a = Math.max(a, clamp(1 - (t - s.t0) / 0.2) * (t >= s.t0 ? 1 : 0));
  a = Math.max(a, clamp(1 - (t - COLD_SHOTS[0].t0) / 0.35) * 0.6 * (t < 0.35 ? 1 : 0));
  if (a <= 0) return null;
  return <AbsoluteFill style={{background: '#fff8ea', opacity: easeOutCubic(a) * 0.55, mixBlendMode: 'screen'}} />;
};

export const coldGrade = (t: number) => env(t, -1, L('pro2').start, 0, 3);

/** Extra punch on the map during the cold open (the low-res close-ups read flat otherwise). */
export const coldFilter = (t: number) => {
  const g = env(t, -1, COLD.end, 0, 1.2);
  return g > 0 ? `contrast(${1 + 0.16 * g}) saturate(${1 + 0.22 * g})` : undefined;
};
