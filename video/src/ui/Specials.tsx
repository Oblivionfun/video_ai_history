import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SpecialData} from '../data/cards';
import {clamp, easeInCubic, easeOutBack, easeOutCubic, inv} from '../lib/interp';
import {at, L} from '../lib/time';
import {COLOR, FONT, SHADOW} from '../theme';
import {cardMotion, PANEL, Tag} from './Cards';

const paper =
  'radial-gradient(ellipse at 30% 20%, rgba(255,250,235,0.6), rgba(255,250,235,0) 60%), ' +
  'radial-gradient(ellipse at 80% 90%, rgba(150,110,60,0.25), rgba(150,110,60,0) 55%), ' +
  'linear-gradient(180deg, #eadbb8, #e2cfa4 50%, #d9c393)';

const Seal: React.FC<{text: string; size: number; t: number; t0: number; rot?: number; style?: React.CSSProperties}> = ({
  text,
  size,
  t,
  t0,
  rot = 0,
  style,
}) => {
  const p = clamp((t - t0) / 0.28);
  if (p <= 0) return null;
  const s = 1 + 0.6 * (1 - easeOutCubic(p));
  const chars = Array.from(text);
  const cols = chars.length > 2 ? 2 : 1;
  const rows = Math.ceil(chars.length / cols);
  const colChars = Array.from({length: cols}, (_, c) => chars.slice(c * rows, c * rows + rows));
  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: `rotate(${rot}deg) scale(${s})`,
        opacity: Math.min(1, p * 1.6) * 0.92,
        border: `${Math.max(3, size * 0.05)}px solid ${COLOR.cinnabar}`,
        borderRadius: size * 0.06,
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        gap: size * 0.02,
        color: COLOR.cinnabar,
        fontFamily: FONT.brush,
        fontSize: (size * 0.78) / rows,
        lineHeight: 1,
        mixBlendMode: 'multiply',
        filter: `blur(${(1 - p) * 2}px)`,
        ...style,
      }}
    >
      {colChars.map((cc, i) => (
        <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {cc.map((ch, j) => (
            <span key={j}>{ch}</span>
          ))}
        </div>
      ))}
    </div>
  );
};

const SEALS = [
  {text: '高昌国印', x: 560, y: 40, rot: -6},
  {text: '屈支国印', x: 520, y: 270, rot: 5},
  {text: '素叶水城', x: 380, y: 70, rot: -3},
  {text: '飒秣建国', x: 340, y: 300, rot: 7},
  {text: '梵衍那国', x: 200, y: 40, rot: -8},
  {text: '迦湿弥罗', x: 150, y: 270, rot: 4},
];

export const WENDIE = {W: 1240, H: 560};

/** The unrolling 通关文牒 (1240×560) with kingdom seals stamping from `sealStart`; place and scale it from outside. */
export const WendieBody: React.FC<{t: number; t0: number; sealStart: number}> = ({t, t0, sealStart}) => {
  const open = easeOutCubic(clamp((t - t0) / 1.3));
  const {W, H} = WENDIE;
  const textA = easeOutCubic(clamp((t - t0 - 0.9) / 0.8));
  const cols = ['大唐国僧玄奘', '往西天拜佛求经', '路经诸国', '伏乞照验放行'];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
        <div
          style={{
            position: 'absolute',
            left: (W * (1 - open)) / 2,
            width: W * open,
            top: 0,
            height: H,
            background: paper,
            boxShadow: '0 30px 80px rgba(0,0,0,0.7), inset 0 0 60px rgba(120,80,30,0.35)',
            overflow: 'hidden',
          }}
        >
          <div style={{position: 'absolute', left: (W * open - W) / 2, top: 0, width: W, height: H}}>
            <div
              style={{
                position: 'absolute',
                right: 70,
                top: 50,
                writingMode: 'vertical-rl',
                fontFamily: FONT.brush,
                fontSize: 84,
                color: '#1d140a',
                letterSpacing: '0.1em',
                opacity: textA,
              }}
            >
              通关文牒
            </div>
            <div style={{position: 'absolute', right: 200, top: 60, display: 'flex', flexDirection: 'row-reverse', gap: 30, opacity: textA * 0.9}}>
              {cols.map((s) => (
                <div key={s} style={{writingMode: 'vertical-rl', fontFamily: FONT.brush, fontSize: 46, color: '#2a1d0e', letterSpacing: '0.12em'}}>
                  {s}
                </div>
              ))}
            </div>
            {SEALS.map((s, i) => (
              <Seal key={s.text} text={s.text} size={128} t={t} t0={sealStart + i * 0.42} rot={s.rot} style={{left: s.x - 30, top: s.y + 40}} />
            ))}
          </div>
        </div>
        {[0, 1].map((side) => (
          <div
            key={side}
            style={{
              position: 'absolute',
              top: -20,
              height: H + 40,
              width: 34,
              left: side ? W / 2 + (W * open) / 2 - 17 : W / 2 - (W * open) / 2 - 17,
              background: 'linear-gradient(90deg, #3b2412, #7a5230 45%, #2f1c0d)',
              borderRadius: 8,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            }}
          />
        ))}
    </div>
  );
};

export const Wendie: React.FC<{c: SpecialData; t: number}> = ({c, t}) => {
  if (t < c.t0 || t > c.t1) return null;
  const open = easeOutCubic(clamp((t - c.t0) / 1.3));
  const out = easeInCubic(clamp((t - (c.t1 - 0.6)) / 0.6));
  const titleA = easeOutCubic(clamp((t - at('c5c', '通关文牒', -0.6)) / 0.8));
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <AbsoluteFill style={{background: 'rgba(4,4,6,0.6)', opacity: open}} />
      <div style={{position: 'absolute', left: (1920 - WENDIE.W) / 2, top: 170}}>
        <WendieBody t={t} t0={c.t0} sealStart={at('c5c', '到了小说里', -0.4)} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 770,
          textAlign: 'center',
          opacity: titleA,
          transform: `translateY(${(1 - titleA) * 14}px)`,
        }}
      >
        <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 21, letterSpacing: '0.4em', color: '#f0a58e'}}>西游记 · 小说</div>
        <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 46, letterSpacing: '0.3em', color: COLOR.paper, marginTop: 6, textShadow: SHADOW.text}}>
          国书 → 通关文牒
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Counter: React.FC<{c: SpecialData; t: number}> = ({c, t}) => {
  const m = cardMotion(t, c.t0, c.t1);
  if (!m.visible) return null;
  const n = Math.max(1, Math.min(18, Math.floor(1 + 17 * easeOutCubic(inv(c.t0 + 0.2, c.t0 + 2.6, t)))));
  const sealT = at('c10c', '大乘天', -0.3);
  return (
    <div style={{position: 'absolute', right: PANEL.right, top: 230, width: PANEL.width, ...m.style}}>
      <Tag text="史 · 曲女城" e={m.e} />
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
        <div style={{fontFamily: FONT.latin, fontWeight: 500, fontSize: 250, lineHeight: 1, color: COLOR.goldBright, textShadow: '0 0 40px rgba(240,190,90,0.35)', width: 290, textAlign: 'right', fontVariantNumeric: 'lining-nums'}}>
          {n}
        </div>
        <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 80, color: COLOR.paper}}>日</div>
      </div>
      <div style={{fontFamily: FONT.serif, fontWeight: 700, fontSize: 40, letterSpacing: '0.4em', color: '#e8dcc2', marginTop: 10}}>无人能难</div>
      <div style={{position: 'relative', height: 200, marginTop: 20}}>
        <Seal text="大乘天" size={170} t={t} t0={sealT} rot={-4} style={{left: 360, top: -250, mixBlendMode: 'normal', background: 'rgba(198,64,43,0.92)', color: '#fff0e4', borderColor: '#f3c9b8'}} />
      </div>
    </div>
  );
};

const Stat: React.FC<{value: number; unit: string; label: string; t: number; t0: number}> = ({value, unit, label, t, t0}) => {
  const a = easeOutCubic(clamp((t - t0) / 0.6));
  const v = Math.round(value * easeOutCubic(clamp((t - t0) / 1.6)));
  return (
    <div style={{opacity: a, transform: `translateY(${(1 - a) * 20}px)`, textAlign: 'left'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
        <div style={{fontFamily: FONT.latin, fontWeight: 500, fontSize: 132, lineHeight: 1, color: COLOR.goldBright, fontVariantNumeric: 'lining-nums'}}>{v}</div>
        <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 44, color: COLOR.paper}}>{unit}</div>
      </div>
      <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 25, letterSpacing: '0.3em', color: '#d9cfb9', marginTop: 4}}>{label}</div>
    </div>
  );
};

export const Stats: React.FC<{c: SpecialData; t: number}> = ({c, t}) => {
  const m = cardMotion(t, c.t0, c.t1);
  if (!m.visible) return null;
  const tw = at('c13b', '《大唐西域记》', -0.2);
  const a3 = easeOutCubic(clamp((t - tw) / 0.7));
  return (
    <div style={{position: 'absolute', right: PANEL.right, top: 220, width: PANEL.width, ...m.style}}>
      <Tag text="史 · 归国之后" e={m.e} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 34}}>
        <Stat value={657} unit="部" label="带回佛经" t={t} t0={at('c13b', '六百五十七部', -0.6)} />
        <Stat value={1335} unit="卷" label="十九年间译出经论" t={t} t0={at('c13b', '一千三百三十五卷', -0.6)} />
        <div style={{opacity: a3, transform: `translateY(${(1 - a3) * 20}px)`, fontFamily: FONT.serif, fontWeight: 900, fontSize: 52, letterSpacing: '0.16em', color: COLOR.paper}}>
          《大唐西域记》
          <span style={{fontSize: 24, fontWeight: 500, color: '#d9cfb9', letterSpacing: '0.2em', marginLeft: 12}}>口述成书</span>
        </div>
      </div>
    </div>
  );
};

const LINEAGE = [
  {year: '645', title: '玄奘归国', sub: '取经十七年'},
  {year: '646', title: '《大唐西域记》', sub: '玄奘口述 · 辩机笔受'},
  {year: '南宋', title: '《大唐三藏取经诗话》', sub: '猴行者登场'},
  {year: '明', title: '《西游记》', sub: '吴承恩 · 百回本'},
  {year: '1986', title: '电视剧《西游记》', sub: '家喻户晓'},
];

export const Lineage: React.FC<{c: SpecialData; t: number}> = ({c, t}) => {
  const m = cardMotion(t, c.t0, c.t1);
  if (!m.visible) return null;
  const times = [c.t0 + 0.2, c.t0 + 0.9, at('c13c', '南宋', -0.3), at('c13c', '到了明代', -0.2), L('c13c').end - 0.6];
  const grow = clamp(inv(c.t0, L('c13c').end, t));
  return (
    <div style={{position: 'absolute', right: PANEL.right, top: 200, width: PANEL.width, ...m.style}}>
      <Tag text="从玄奘到唐僧" e={m.e} />
      <div style={{position: 'relative', paddingLeft: 46}}>
        <div style={{position: 'absolute', left: 13, top: 10, width: 2, height: 560 * grow, background: `linear-gradient(${COLOR.gold}, ${COLOR.cinnabarBright})`}} />
        {LINEAGE.map((it, i) => {
          const a = easeOutCubic(clamp((t - times[i]) / 0.6));
          const novel = i >= 2;
          return (
            <div key={it.year} style={{position: 'relative', height: 116, opacity: a, transform: `translateX(${(1 - a) * 20}px)`}}>
              <div
                style={{
                  position: 'absolute',
                  left: -41,
                  top: 14,
                  width: 14,
                  height: 14,
                  transform: 'rotate(45deg)',
                  background: novel ? COLOR.cinnabar : COLOR.gold,
                  boxShadow: `0 0 12px ${novel ? 'rgba(232,90,60,0.8)' : 'rgba(240,200,120,0.8)'}`,
                }}
              />
              <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
                <div style={{fontFamily: FONT.latin, fontWeight: 600, fontSize: 34, color: novel ? '#f0a58e' : COLOR.gold, width: 92}}>{it.year}</div>
                <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 36, color: COLOR.paper, letterSpacing: '0.06em'}}>{it.title}</div>
              </div>
              <div style={{fontFamily: FONT.serif, fontWeight: 500, fontSize: 21, color: '#cbbfa6', marginLeft: 112, marginTop: 6, letterSpacing: '0.14em'}}>{it.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Letter: React.FC<{c: SpecialData; t: number}> = ({c, t}) => {
  const m = cardMotion(t, c.t0, c.t1);
  if (!m.visible) return null;
  const cols = ['闻师访道殊域', '今得归还', '欢喜无量'];
  const span = 2.6;
  return (
    <div style={{position: 'absolute', right: PANEL.right + 60, top: 150, width: 560, height: 700, ...m.style}}>
      <div style={{position: 'absolute', inset: 0, background: paper, boxShadow: '0 30px 80px rgba(0,0,0,0.7), inset 0 0 50px rgba(120,80,30,0.35)'}} />
      <div style={{position: 'absolute', right: 54, top: 60, writingMode: 'vertical-rl', fontFamily: FONT.serif, fontWeight: 900, fontSize: 30, letterSpacing: '0.5em', color: '#6b1f12'}}>
        太宗敕书
      </div>
      <div style={{position: 'absolute', right: 130, top: 70, display: 'flex', flexDirection: 'row-reverse', gap: 36}}>
        {cols.map((s, i) => {
          const p = inv(c.t0 + 0.6 + (i * span) / 3, c.t0 + 0.6 + ((i + 1) * span) / 3, t);
          return (
            <div
              key={s}
              style={{
                writingMode: 'vertical-rl',
                fontFamily: FONT.brush,
                fontSize: 68,
                lineHeight: 1,
                color: '#1d140a',
                letterSpacing: '0.1em',
                WebkitMaskImage: `linear-gradient(to bottom, #000 ${p * 110 - 12}%, transparent ${p * 110}%)`,
                maskImage: `linear-gradient(to bottom, #000 ${p * 110 - 12}%, transparent ${p * 110}%)`,
              }}
            >
              {s}
            </div>
          );
        })}
      </div>
      <Seal text="敕" size={92} t={t} t0={c.t0 + span + 0.9} rot={-3} style={{left: 60, top: 540, background: 'rgba(198,64,43,0.9)', color: '#fff0e4', mixBlendMode: 'normal'}} />
    </div>
  );
};

export {easeOutBack};
