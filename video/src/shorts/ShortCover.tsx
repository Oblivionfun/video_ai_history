import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {useFonts} from '../fonts';
import {MapScene} from '../map/MapScene';
import {COLOR, FONT} from '../theme';
import {Grain, Vignette} from '../ui/Effects';
import {SealBox} from '../ui/Titles';
import {buildCut} from './build';
import {cutByKey} from './registry';
import {ShortOverlay} from './ShortOverlay';

/** Thumbnail for a cut: map frozen at `cover.at` with its pins, plus the hook as big type. */
/** aspect: 'v' 9:16 · '34' 3:4 · 'h' 16:9 · 'b' 16:10 for B站, whose app feeds may crop to 4:3 (keep text in x 160–1760). */
export const ShortCover: React.FC<{cutKey: string; aspect: 'v' | '34' | 'h' | 'b'}> = ({cutKey, aspect}) => {
  useFonts();
  const entry = cutByKey(cutKey);
  const cut = useMemo(() => buildCut(entry), [entry]);
  const j = entry.json;
  const at = cut.T(j.cover?.at ?? 'h2');
  const wide = aspect === 'h' || aspect === 'b';
  const o = wide ? 'landscape' : 'portrait';
  const lines = j.cover?.lines ?? j.hook.lines;
  const cam = useMemo(
    () => (tt: number) => {
      const c = cut.cam(tt, o);
      if (aspect === 'v') return {...c, padT: 640, padB: 260};
      if (aspect === '34') return {...c, padT: 520, padB: 120};
      if (aspect === 'b') return {...c, zoom: c.zoom - 0.18, padR: 0, padL: 660};
      return {...c, padR: 0, padL: 860};
    },
    [cut, o, aspect],
  );
  const big = wide ? 150 : aspect === 'v' ? 160 : 140;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <MapScene cam={cam} head={cut.head} journey={cut.journey} preview={() => 0} time={at} mercator filter="contrast(1.1) saturate(1.15)">
        <AbsoluteFill style={{background: 'rgba(255,186,110,0.16)', mixBlendMode: 'soft-light'}} />
        <ShortOverlay cut={cut} o={o} />
      </MapScene>
      <Vignette strength={0.45} />
      {wide ? (
        <>
          <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(4,6,9,0.9) 0%, rgba(4,6,9,0.75) 34%, rgba(4,6,9,0) 55%)'}} />
          <div style={{position: 'absolute', left: aspect === 'b' ? 200 : 120, top: aspect === 'b' ? 300 : 240, width: 800}}>
            <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 30, letterSpacing: '0.32em', color: COLOR.goldBright}}>{j.cover?.kicker ?? j.hook.kicker}</div>
            {lines.map((l, i) => (
              <div key={l} style={{fontFamily: FONT.brush, fontSize: big, lineHeight: 1.1, color: i ? '#ffe9c4' : COLOR.paper, textShadow: '0 6px 40px rgba(0,0,0,0.9)', marginTop: i ? 0 : 18, whiteSpace: 'nowrap'}}>
                {l}
              </div>
            ))}
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 36}}>
              <SealBox text={cut.identity.seal} size={62} />
              <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 30, letterSpacing: '0.2em', color: '#efe4cc'}}>{cut.identity.cover_tag}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(4,6,9,0.92) 0%, rgba(4,6,9,0.7) ${aspect === 'v' ? 26 : 30}%, rgba(4,6,9,0) ${aspect === 'v' ? 40 : 46}%)`}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: aspect === 'v' ? 190 : 110, textAlign: 'center'}}>
            <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 34, letterSpacing: '0.3em', color: COLOR.goldBright}}>{j.cover?.kicker ?? j.hook.kicker}</div>
            {lines.map((l, i) => (
              <div key={l} style={{fontFamily: FONT.brush, fontSize: big, lineHeight: 1.08, color: i ? '#ffe9c4' : COLOR.paper, textShadow: '0 6px 40px rgba(0,0,0,0.9)', marginTop: i ? 0 : 16, whiteSpace: 'nowrap'}}>
                {l}
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: aspect === 'v' ? 300 : 70, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16}}>
            <SealBox text={cut.identity.seal} size={58} />
            <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 32, letterSpacing: '0.2em', color: '#f2e8d2', textShadow: '0 2px 12px rgba(0,0,0,0.9)'}}>{cut.identity.cover_tag}</div>
          </div>
        </>
      )}
      <Grain frame={2} opacity={0.05} />
    </AbsoluteFill>
  );
};
