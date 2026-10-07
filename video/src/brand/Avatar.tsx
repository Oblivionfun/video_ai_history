import React from 'react';
import {AbsoluteFill} from 'remotion';
import {useFonts} from '../fonts';
import {MapScene} from '../map/MapScene';
import {COLOR, FONT} from '../theme';
import {Grain} from '../ui/Effects';

/** Channel avatar, 1024×1024. Platforms crop it to a circle, so everything stays within r ≈ 470 of the centre. */
export type AvatarVariant = 'seal4' | 'seal2' | 'brush' | 'brushBold';

const S = 1024;
const C = S / 2;

// Tibetan Plateau, Himalaya and Tarim: the channel's home terrain
const cam = () => ({center: [86.5, 33.4] as [number, number], zoom: 4.15, pitch: 28, bearing: -8, padR: 0});

/** A carved seal: cinnabar block, characters and stone pits show the paper underneath. cols run right to left. */
const Seal: React.FC<{id: string; x: number; y: number; w: number; h: number; cols: string[][]; size: number; rot?: number}> = ({id, x, y, w, h, cols, size, rot = -2}) => {
  const pad = Math.min(w, h) * 0.07;
  const rows = Math.max(...cols.map((c) => c.length));
  const cw = (w - 2 * pad) / cols.length;
  const ch = (h - 2 * pad) / rows;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        <filter id={`rough-${id}`} x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves={3} seed={11} result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale={9} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`pits-${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={5} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  13 0 0 0 -8.6" />
        </filter>
        <mask id={`m-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={S} height={S}>
          <rect x={x} y={y} width={w} height={h} rx={w * 0.03} fill="white" />
          <g fill="black" fontFamily={FONT.brush} fontSize={size} textAnchor="middle" dominantBaseline="central">
            {cols.flatMap((col, i) =>
              col.map((g, j) => (
                <text key={`${i}-${j}`} x={x + w - pad - (i + 0.5) * cw} y={y + pad + (j + 0.5) * ch + size * 0.04}>
                  {g}
                </text>
              )),
            )}
          </g>
          <rect x={x} y={y} width={w} height={h} fill="black" filter={`url(#pits-${id})`} />
        </mask>
      </defs>
      <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`} filter={`url(#rough-${id})`}>
        <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={w * 0.03} fill={COLOR.paper} />
        <rect x={x} y={y} width={w} height={h} fill={COLOR.cinnabar} mask={`url(#m-${id})`} />
      </g>
    </svg>
  );
};

/** The gold route line with its cinnabar end marker, as drawn on the films' maps. */
const Route: React.FC<{d: string; end: [number, number]}> = ({d, end}) => (
  <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{position: 'absolute', inset: 0}}>
    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
    </defs>
    <path d={d} fill="none" stroke={COLOR.goldDeep} strokeWidth={22} strokeLinecap="round" opacity={0.45} filter="url(#glow)" />
    <path d={d} fill="none" stroke={COLOR.goldBright} strokeWidth={7} strokeLinecap="round" />
    <rect x={end[0] - 17} y={end[1] - 17} width={34} height={34} fill={COLOR.cinnabarBright} stroke="#ffe2d4" strokeWidth={4} transform={`rotate(45 ${end[0]} ${end[1]})`} />
  </svg>
);

export const Avatar: React.FC<{variant: AvatarVariant}> = ({variant}) => {
  useFonts();
  return (
    <AbsoluteFill style={{background: COLOR.ink}}>
      <MapScene cam={cam} head={() => 0} preview={() => 0} time={0} mercator filter="contrast(1.12) saturate(0.8) brightness(0.85)" />
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 50%, rgba(5,7,10,0.42) 0%, rgba(5,7,10,0.7) 55%, rgba(5,7,10,0.94) 100%)'}} />
      {variant === 'seal4' && (
        <>
          <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{position: 'absolute', inset: 0}}>
            <circle cx={C} cy={C} r={455} fill="none" stroke={COLOR.gold} strokeWidth={4} opacity={0.75} />
            <circle cx={C} cy={C} r={438} fill="none" stroke={COLOR.gold} strokeWidth={1.5} opacity={0.45} />
          </svg>
          <Seal id="s4" x={C - 300} y={C - 300} w={600} h={600} cols={[['山', '河'], ['司', '马']]} size={238} />
        </>
      )}
      {variant === 'seal2' && (
        <>
          <Route d="M 150 820 C 260 700, 330 760, 420 640 S 600 520, 640 420 S 760 250, 868 214" end={[868, 214]} />
          <Seal id="s2" x={C - 205} y={C - 330} w={410} h={660} cols={[['山', '河']]} size={300} rot={-3} />
        </>
      )}
      {variant === 'brush' && (
        <>
          <Route d="M 140 760 C 300 690, 380 800, 520 720 S 760 610, 884 650" end={[884, 650]} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontFamily: FONT.brush, fontSize: 330, lineHeight: 1, color: COLOR.paper, letterSpacing: '-0.02em', textShadow: '0 8px 40px rgba(0,0,0,0.85)'}}>
            山河
          </div>
          <Seal id="sb" x={640} y={590} w={130} h={220} cols={[['司', '马']]} size={96} rot={-4} />
        </>
      )}
      {variant === 'brushBold' && (
        <>
          <AbsoluteFill style={{background: 'radial-gradient(ellipse 62% 40% at 50% 44%, rgba(5,7,10,0.55), rgba(5,7,10,0) 100%)'}} />
          <Route d="M 150 700 C 280 650, 360 770, 480 712 S 590 676, 640 716" end={[640, 716]} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 205, textAlign: 'center', fontFamily: FONT.brush, fontSize: 400, lineHeight: 1, color: COLOR.paper, letterSpacing: '-0.05em', textShadow: '0 0 28px rgba(0,0,0,0.9), 0 10px 50px rgba(0,0,0,0.9)'}}>
            山河
          </div>
          <Seal id="sbb" x={662} y={604} w={152} h={258} cols={[['司', '马']]} size={114} rot={-4} />
        </>
      )}
      <Grain frame={3} opacity={0.05} />
    </AbsoluteFill>
  );
};
