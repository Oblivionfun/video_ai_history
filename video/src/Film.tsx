import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {CARDS, plateCover, rightBusy} from './data/cards';
import {useFonts} from './fonts';
import {clamp, env, rng} from './lib/interp';
import {C, L} from './lib/time';
import {MapOverlay} from './map/MapOverlay';
import {MapScene, useMapFrame} from './map/MapScene';
import {DuoCard, FactsCard, ImageCard, Plate, QuoteCard, RightShade} from './ui/Cards';
import {ColdFlash, ColdOpen, coldFilter, coldGrade} from './ui/ColdOpen';
import {BottomShade, Dread, Dust, GhostFires, Grain, LightLeak, Ripples, Sand, shake, Snow, Storm, Vignette} from './ui/Effects';
import {Finale, Footsteps, Somersault} from './ui/Outro';
import {Counter, Letter, Lineage, Stats, Wendie} from './ui/Specials';
import {Subtitles} from './ui/Subtitles';
import {ChapterTitles, IntroTitle, TourTitle} from './ui/Titles';

const Starfield: React.FC<{t: number}> = ({t}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const a = 1 - clamp((t - L('pro4').start) / 3.2);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, 1920, 1080);
    if (a <= 0) return;
    const r = rng(2024);
    for (let i = 0; i < 900; i++) {
      const x = r() * 1920, y = r() * 1080, m = r() ** 3;
      const tw = 0.6 + 0.4 * Math.sin(t * (0.5 + r() * 2) + i);
      ctx.fillStyle = `rgba(${220 + 35 * r()},${225 + 30 * r()},255,${(0.15 + 0.85 * m) * tw * a})`;
      ctx.beginPath();
      ctx.arc(x - t * 3, y, 0.4 + m * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  return <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0}} />;
};

/** Grade applied to the map only: warm highlights, a touch of haze in the sky. */
const MapGrade: React.FC<{t: number}> = ({t}) => {
  const journey = Math.max(clamp((t - L('pro4').start) / 3), coldGrade(t));
  return (
    <>
      <AbsoluteFill style={{background: 'rgba(255,186,110,0.16)', mixBlendMode: 'soft-light', opacity: journey}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(10,14,22,0.45) 0%, rgba(10,14,22,0) 26%)', opacity: journey}} />
    </>
  );
};

const MapFx: React.FC = () => {
  const mf = useMapFrame();
  if (!mf) return null;
  return (
    <>
      <GhostFires t={mf.t} head={mf.head.on ? mf.head : null} />
      <Ripples t={mf.t} p={mf.pos['p:p_indus']} />
    </>
  );
};

export const Film: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const sh = shake(t);
  const fadeIn = 1 - clamp(t / 0.3);
  const epiMap = env(t, C('epi').start - 1, L('e3').start + 1.4, 0.1, 1.2);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Starfield t={t} />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${1 + Math.abs(sh.x) * 0.002})`}}>
        <MapScene filter={coldFilter(t)}>
          <MapGrade t={t} />
          <MapFx />
          <MapOverlay />
          <ColdOpen />
          {epiMap > 0 && <Somersault />}
        </MapScene>
      </AbsoluteFill>
      <ColdFlash t={t} />
      <Snow t={t} />
      <Sand t={t} />
      <Storm t={t} />
      <Dread t={t} />
      <RightShade a={rightBusy(t) * (1 - plateCover(t))} />
      {CARDS.map((c, i) => {
        if (t < c.t0 - 0.05 || t > c.t1 + 0.05) return null;
        switch (c.type) {
          case 'image':
            return <ImageCard key={c.id} c={c} t={t} seed={i + 1} />;
          case 'duo':
            return <DuoCard key={c.id} c={c} t={t} />;
          case 'quote':
            return <QuoteCard key={c.id} c={c} t={t} />;
          case 'facts':
            return <FactsCard key={c.id} c={c} t={t} />;
          case 'plate':
            return <Plate key={c.id} c={c} t={t} seed={i + 3} />;
          case 'wendie':
            return <Wendie key={c.id} c={c} t={t} />;
          case 'counter':
            return <Counter key={c.id} c={c} t={t} />;
          case 'stats':
            return <Stats key={c.id} c={c} t={t} />;
          case 'lineage':
            return <Lineage key={c.id} c={c} t={t} />;
          case 'letter':
            return <Letter key={c.id} c={c} t={t} />;
          default:
            return null;
        }
      })}
      <ChapterTitles t={t} />
      <IntroTitle t={t} />
      <TourTitle t={t} />
      <Footsteps t={t} />
      <Finale t={t} />
      <Vignette />
      <LightLeak t={t} />
      <BottomShade />
      <Subtitles t={t} />
      <Dust t={t} a={0.8} />
      <Grain frame={frame} />
      {fadeIn > 0 && <AbsoluteFill style={{background: '#000', opacity: fadeIn}} />}
    </AbsoluteFill>
  );
};
