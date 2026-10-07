import React from 'react';
import {clamp} from '../lib/interp';
import {TIMELINE} from '../lib/time';
import {COLOR, FONT} from '../theme';

export const Subtitles: React.FC<{t: number}> = ({t}) => {
  const s = TIMELINE.subs.find((x) => t >= x.start - 0.05 && t < x.end + 0.12);
  if (!s) return null;
  const a = Math.min(clamp((t - s.start + 0.05) / 0.14), clamp((s.end + 0.12 - t) / 0.14));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 62, textAlign: 'center', opacity: a}}>
      <span
        style={{
          fontFamily: FONT.serif,
          fontWeight: 600,
          fontSize: 42,
          letterSpacing: '0.07em',
          color: '#f6eedc',
          whiteSpace: 'pre',
          textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,1)',
        }}
      >
        {s.segs.map((g, i) => (
          <span key={i} style={g.q ? {color: COLOR.goldBright} : undefined}>
            {g.text}
          </span>
        ))}
      </span>
    </div>
  );
};
