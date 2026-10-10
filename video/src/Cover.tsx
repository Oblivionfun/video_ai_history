import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COVER} from './data/cards';
import {STORY_PINS} from './data/route';
import {Cam} from './director';
import {useFonts} from './fonts';
import {StoryPin} from './map/MapOverlay';
import {MapScene, useMapFrame} from './map/MapScene';
import {COLOR, FONT} from './theme';
import {Grain, Vignette} from './ui/Effects';
import {SealBox} from './ui/Titles';

/** Film time whose route state the cover shows: journey complete, every story pin out. */
const COVER_T = 437.5;
const coverCam = (): Cam => ({center: [86.6, 29.4], zoom: 4.1, pitch: 22, bearing: 0, padR: 660});
const biliCam = (): Cam => ({center: [86.6, 29.4], zoom: 3.92, pitch: 22, bearing: 0, padR: 800, padL: 170});
const PIN_SIDE: Record<string, 'l' | 'r'> = {p_changan: 'l'};
/** The northern pins crowd at this zoom: spread them vertically (px). */
const PIN_DY: Record<string, number> = {p_huoyan: -12, p_gaochang: -12, p_mohe: 6, p_guazhou: 24};

const Pins: React.FC = () => {
  const mf = useMapFrame();
  if (!mf) return null;
  return (
    <AbsoluteFill>
      {STORY_PINS.map((sp) => {
        const p = mf.pos[`p:${sp.id}`];
        if (!p?.on) return null;
        const side = PIN_SIDE[sp.id] ?? sp.epiSide ?? sp.side;
        return <StoryPin key={sp.id} p={p} novel={sp.novel} real={sp.real} a={1} side={side} showReal dy={PIN_DY[sp.id] ?? sp.dy} />;
      })}
    </AbsoluteFill>
  );
};

interface Layout {
  cam: () => Cam;
  /** title block left edge and top, divider x and vertical span */
  left: number;
  top: number;
  rule: number;
  ruleTop: number;
  ruleH: number;
}

const COVER_16x9: Layout = {cam: coverCam, left: 1268, top: 132, rule: 1222, ruleTop: 150, ruleH: 760};
/** B站's cover slot is 16:10 and some app feeds crop it to 4:3 (x 160–1760); the duration badge sits bottom right. */
const COVER_BILI: Layout = {cam: biliCam, left: 1140, top: 196, rule: 1094, ruleTop: 214, ruleH: 780};

const MainCover: React.FC<{l: Layout}> = ({l}) => {
  useFonts();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <MapScene cam={l.cam} mercator time={COVER_T} lineScale={1.5}>
        <AbsoluteFill style={{background: 'rgba(255,186,110,0.16)', mixBlendMode: 'soft-light'}} />
        <AbsoluteFill
          style={{background: 'linear-gradient(90deg, rgba(4,6,9,0) 50%, rgba(4,6,9,0.7) 66%, rgba(4,6,9,0.9) 100%)'}}
        />
        <Pins />
      </MapScene>
      <Vignette strength={0.5} />
      <div style={{position: 'absolute', left: l.rule, top: l.ruleTop, width: 1, height: l.ruleH, background: 'linear-gradient(180deg, transparent, rgba(230,196,126,0.55) 18%, rgba(230,196,126,0.55) 82%, transparent)'}} />
      <div style={{position: 'absolute', left: l.left, top: l.top, width: 600}}>
        <div style={{fontFamily: FONT.latin, fontWeight: 600, fontSize: 21, letterSpacing: '0.36em', color: COLOR.gold, whiteSpace: 'nowrap'}}>
          {COVER.kicker}
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 18}}>
          <div
            style={{
              fontFamily: FONT.brush,
              fontSize: 240,
              lineHeight: 0.98,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              color: COLOR.paper,
              textShadow: '0 0 48px rgba(240,200,120,0.28), 0 8px 44px rgba(0,0,0,0.9)',
            }}
          >
            <div>玄奘</div>
            <div>西行</div>
          </div>
          <div style={{marginBottom: 34}}>
            <SealBox text="西游" size={86} />
          </div>
        </div>
        <div style={{width: 540, height: 1, marginTop: 30, background: 'linear-gradient(90deg, rgba(230,196,126,0.95), rgba(230,196,126,0))'}} />
        <div
          style={{
            fontFamily: FONT.serif,
            fontWeight: 900,
            fontSize: 46,
            letterSpacing: '0.08em',
            color: '#f6eedc',
            marginTop: 28,
            whiteSpace: 'pre',
            textShadow: '0 3px 18px rgba(0,0,0,0.9)',
          }}
        >
          {COVER.hook}
        </div>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 29, letterSpacing: '0.12em', color: COLOR.goldBright, marginTop: 18, textShadow: '0 2px 12px rgba(0,0,0,0.9)'}}>
          {COVER.stats}
        </div>
        <div style={{fontFamily: FONT.latin, fontWeight: 600, fontSize: 30, letterSpacing: '0.3em', color: COLOR.gold, marginTop: 20}}>
          {COVER.years}
        </div>
      </div>
      <Grain frame={3} opacity={0.06} />
    </AbsoluteFill>
  );
};

export const Cover: React.FC = () => <MainCover l={COVER_16x9} />;
export const CoverBili: React.FC = () => <MainCover l={COVER_BILI} />;

const PORTRAIT_PINS = ['p_changan', 'p_huoyan', 'p_suye', 'p_indus', 'p_lingjiu', 'p_mohe'];
const cover34Cam = (): Cam => ({center: [87.6, 29.2], zoom: 3.62, pitch: 18, bearing: 0, padR: 0, padT: 560, padB: 60});

const PortraitPins: React.FC = () => {
  const mf = useMapFrame();
  if (!mf) return null;
  return (
    <AbsoluteFill>
      {STORY_PINS.filter((sp) => PORTRAIT_PINS.includes(sp.id)).map((sp) => {
        const p = mf.pos[`p:${sp.id}`];
        if (!p?.on) return null;
        return (
          <div key={sp.id} style={{position: 'absolute', left: p.x, top: p.y, transform: 'scale(1.3)', transformOrigin: '0 0'}}>
            <StoryPin p={{x: 0, y: 0, on: true}} novel={sp.novel} real={sp.real} a={1} side={sp.id === 'p_changan' ? 'l' : sp.side} showReal={false} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** 3:4 cover (小红书 / 视频号 feeds): title on top, the whole route below. */
export const MainCover34: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <MapScene cam={cover34Cam} mercator time={COVER_T} lineScale={1.6} filter="contrast(1.08) saturate(1.12)">
        <AbsoluteFill style={{background: 'rgba(255,186,110,0.16)', mixBlendMode: 'soft-light'}} />
        <PortraitPins />
      </MapScene>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,9,0.94) 0%, rgba(4,6,9,0.78) 30%, rgba(4,6,9,0) 46%)'}} />
      <Vignette strength={0.4} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 96, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.latin, fontWeight: 600, fontSize: 22, letterSpacing: '0.36em', color: COLOR.gold}}>{COVER.kicker}</div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 14, marginTop: 10}}>
          <div style={{fontFamily: FONT.brush, fontSize: 196, lineHeight: 1, color: COLOR.paper, textShadow: '0 6px 40px rgba(0,0,0,0.9)'}}>玄奘西行</div>
          <div style={{marginBottom: 22}}>
            <SealBox text="西游" size={70} />
          </div>
        </div>
        <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 46, letterSpacing: '0.08em', color: '#f6eedc', marginTop: 18, whiteSpace: 'pre'}}>{COVER.hook}</div>
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 30, letterSpacing: '0.12em', color: COLOR.goldBright, marginTop: 14}}>{COVER.stats}</div>
      </div>
      <Grain frame={3} opacity={0.05} />
    </AbsoluteFill>
  );
};
