import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {useFonts} from '../fonts';
import {clamp, easeInCubic} from '../lib/interp';
import {MapScene} from '../map/MapScene';
import {Dust, Grain, SandField, SnowField, Vignette} from '../ui/Effects';
import {buildCut} from './build';
import {LCards, LEnd, LSubtitles, LTitle} from './Landscape';
import {OpenCards} from './OpenCards';
import {PCards, PEnd, PHook, PSubtitles} from './Portrait';
import {cutByKey} from './registry';
import {ShortOverlay} from './ShortOverlay';
import {Orientation} from './spec';

const Grade: React.FC<{night: number; heat: number}> = ({night, heat}) => (
  <>
    <AbsoluteFill style={{background: 'rgba(255,186,110,0.16)', mixBlendMode: 'soft-light'}} />
    {night > 0 && <AbsoluteFill style={{background: 'rgba(8,16,40,0.5)', mixBlendMode: 'multiply', opacity: night}} />}
    {heat > 0 && (
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 55% at 50% 52%, rgba(255,92,34,0.42), rgba(255,92,34,0) 70%)', mixBlendMode: 'screen', opacity: heat}} />
    )}
  </>
);

export const ShortFilm: React.FC<{cutKey: string; orientation: Orientation}> = ({cutKey, orientation: o}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const entry = cutByKey(cutKey);
  const cut = useMemo(() => buildCut(entry), [entry]);
  const camFn = useMemo(() => (tt: number) => cut.cam(tt, o), [cut, o]);
  const fx = (k: string) => cut.fx[k]?.(t) ?? 0;
  const endHide = clamp((t - cut.endT + 0.2) / 0.4);
  const fadeIn = 1 - clamp(t / 0.3);
  const fadeOut = easeInCubic(clamp((t - (cut.duration - 0.8)) / 0.8));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <MapScene cam={camFn} head={cut.head} journey={cut.journey} preview={() => 0} mercator filter={o === 'portrait' ? 'contrast(1.08) saturate(1.12)' : 'contrast(1.04) saturate(1.06)'}>
        <Grade night={fx('night')} heat={fx('heat')} />
        <ShortOverlay cut={cut} o={o} />
      </MapScene>
      <SandField t={t} a={fx('sand')} />
      <SnowField t={t} a={fx('snow')} />
      {o === 'portrait' ? (
        <>
          <PCards cut={cut} t={t} />
          <OpenCards cut={cut} t={t} o={o} />
          <PHook cut={cut} t={t} />
          <PSubtitles tl={entry.timeline} t={t} hide={endHide} />
          <PEnd cut={cut} t={t} />
        </>
      ) : (
        <>
          <LCards cut={cut} t={t} />
          <OpenCards cut={cut} t={t} o={o} />
          <LTitle cut={cut} t={t} />
          <Vignette />
          <LSubtitles tl={entry.timeline} t={t} hide={endHide} />
          <LEnd cut={cut} t={t} />
        </>
      )}
      {o === 'portrait' && <Vignette strength={0.42} />}
      <Dust t={t} a={0.7} />
      <Grain frame={frame} opacity={0.06} />
      {fadeIn > 0 && <AbsoluteFill style={{background: '#000', opacity: fadeIn}} />}
      {fadeOut > 0 && <AbsoluteFill style={{background: '#000', opacity: fadeOut}} />}
    </AbsoluteFill>
  );
};
