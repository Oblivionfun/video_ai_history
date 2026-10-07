import brand from './config/brand.json';
import {CARDS, CHAPTER_INFO, COVER, CREDITS, STATIC_TEXT} from './data/cards';
import {JOURNEYS} from './episodes';
import {CUTS, EPISODES} from './shorts/registry';
import {TIMELINE} from './lib/time';

const parts: string[] = [];
for (const l of TIMELINE.lines) parts.push(l.text);
for (const c of Object.values(CHAPTER_INFO)) parts.push(c.num, c.name, c.theme, c.en);
for (const j of Object.values(JOURNEYS)) {
  for (const n of j.NAMED_NODES) parts.push(n.name ?? '', n.modern ?? '');
  for (const p of j.route.STORY_PINS) parts.push(p.novel, p.real);
  for (const a of j.route.AREA_LABELS) parts.push(a.text, a.sub ?? '');
}
for (const c of CARDS) parts.push(JSON.stringify(c));
for (const c of CREDITS) parts.push(...c);
parts.push(...STATIC_TEXT, ...Object.values(COVER), JSON.stringify(brand), '关注下期预告完整版看主页玄奘西行一张地图重走真实取经路');
for (const c of CUTS) parts.push(JSON.stringify(c.json));
for (const e of EPISODES) parts.push(JSON.stringify(e.identity), JSON.stringify(e.next));

export const ALL_TEXT = parts.join('');
