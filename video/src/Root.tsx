import React from 'react';
import {Composition} from 'remotion';
import {Avatar} from './brand/Avatar';
import {Cover, CoverBili, MainCover34} from './Cover';
import {Film} from './Film';
import {DURATION, FPS} from './lib/time';
import {compId, CUTS} from './shorts/registry';
import {ShortCover} from './shorts/ShortCover';
import {ShortFilm} from './shorts/ShortFilm';
import {MapTest} from './spike/MapTest';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="XuanzangFilm" component={Film} durationInFrames={Math.ceil(DURATION * FPS)} fps={FPS} width={1920} height={1080} />
      <Composition id="Cover" component={Cover} durationInFrames={1} fps={FPS} width={1920} height={1080} />
      <Composition id="Cover34" component={MainCover34} durationInFrames={1} fps={FPS} width={1080} height={1440} />
      <Composition id="CoverBili" component={CoverBili} durationInFrames={1} fps={FPS} width={1920} height={1200} />
      {CUTS.flatMap((c) =>
        c.json.formats.map((o) => (
          <Composition
            key={compId(c, o)}
            id={compId(c, o === 'portrait' ? 'v' : 'h')}
            component={ShortFilm}
            defaultProps={{cutKey: c.key, orientation: o}}
            durationInFrames={Math.ceil(c.timeline.duration * FPS)}
            fps={FPS}
            width={o === 'portrait' ? 1080 : 1920}
            height={o === 'portrait' ? 1920 : 1080}
          />
        )),
      )}
      {CUTS.flatMap((c) => [
        ...(c.json.formats.includes('portrait')
          ? [
              <Composition key={compId(c, 'cv')} id={compId(c, 'cover-v')} component={ShortCover} defaultProps={{cutKey: c.key, aspect: 'v' as const}} durationInFrames={1} fps={FPS} width={1080} height={1920} />,
              <Composition key={compId(c, 'c34')} id={compId(c, 'cover-34')} component={ShortCover} defaultProps={{cutKey: c.key, aspect: '34' as const}} durationInFrames={1} fps={FPS} width={1080} height={1440} />,
            ]
          : []),
        ...(c.json.formats.includes('landscape')
          ? [
              <Composition key={compId(c, 'ch')} id={compId(c, 'cover-h')} component={ShortCover} defaultProps={{cutKey: c.key, aspect: 'h' as const}} durationInFrames={1} fps={FPS} width={1920} height={1080} />,
              <Composition key={compId(c, 'cb')} id={compId(c, 'cover-b')} component={ShortCover} defaultProps={{cutKey: c.key, aspect: 'b' as const}} durationInFrames={1} fps={FPS} width={1920} height={1200} />,
            ]
          : []),
      ])}
      {(['seal4', 'seal2', 'brush', 'brushBold'] as const).map((v) => (
        <Composition key={v} id={`Avatar-${v}`} component={Avatar} defaultProps={{variant: v}} durationInFrames={1} fps={FPS} width={1024} height={1024} />
      ))}
      <Composition id="MapTest" component={MapTest} durationInFrames={120} fps={30} width={1920} height={1080} />
    </>
  );
};
