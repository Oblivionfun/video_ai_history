import {at, C, L} from '../lib/time';

export interface ChapterInfo {
  num: string;
  name: string;
  theme: string;
  en: string;
}

export const CHAPTER_INFO: Record<string, ChapterInfo> = {
  changan: {num: '壹', name: '长安', theme: '冒越宪章', en: "CHANG'AN · 629"},
  guazhou: {num: '贰', name: '瓜州', theme: '胡人与老马', en: 'GUAZHOU'},
  mohe: {num: '叁', name: '莫贺延碛', theme: '八百里沙河', en: 'THE MOHEYAN DESERT'},
  gaochang: {num: '肆', name: '高昌', theme: '御弟与火焰山', en: 'GAOCHANG'},
  lingshan: {num: '伍', name: '凌山', theme: '冰雪与国书', en: 'THE ICE MOUNTAINS'},
  bamiyan: {num: '陆', name: '梵衍那', theme: '金色大佛', en: 'BAMIYAN'},
  ganges: {num: '柒', name: '恒河', theme: '祭品', en: 'THE GANGES'},
  nalanda: {num: '捌', name: '那烂陀', theme: '灵山之名', en: 'NALANDA'},
  tour: {num: '玖', name: '五印度', theme: '遍访名师', en: 'THE FIVE INDIAS'},
  kannauj: {num: '拾', name: '曲女城', theme: '十八日论战', en: 'KANNAUJ · 642'},
  indus: {num: '拾壹', name: '信度河', theme: '失经', en: 'THE INDUS · 643'},
  pamir: {num: '拾贰', name: '葱岭', theme: '归途', en: 'THE PAMIRS'},
  return: {num: '拾叁', name: '长安', theme: '归来', en: "CHANG'AN · 645"},
};

export type Kind = 'history' | 'novel' | 'mural';

interface Base {
  id: string;
  t0: number;
  t1: number;
}

export interface ImageCardData extends Base {
  type: 'image';
  kind: Kind;
  src: string;
  tag: string;
  title: string;
  sub?: string;
  quote?: string;
  source?: string;
  bullets?: {text: string; t: number}[];
  pin?: string;
  loss?: {t: number; text: string};
}

export interface DuoCardData extends Base {
  type: 'duo';
  tag: string;
  items: {src: string; title: string; sub: string; fx?: number}[];
  pin?: string;
}

export interface QuoteCardData extends Base {
  type: 'quote';
  lines: string[];
  source: string;
  img?: string;
}

export interface FactsCardData extends Base {
  type: 'facts';
  tag: string;
  title: string;
  items?: string[];
  quote?: string;
  source?: string;
  legend?: boolean;
}

export interface PlateData extends Base {
  type: 'plate';
  src: string;
  tag: string;
  title: string;
  sub: string;
  note?: string;
}

export interface SpecialData extends Base {
  type: 'wendie' | 'counter' | 'stats' | 'lineage' | 'letter';
}

export type Card = ImageCardData | DuoCardData | QuoteCardData | FactsCardData | PlateData | SpecialData;

export const CARDS: Card[] = [
  // 壹 长安
  {type: 'image', id: 'sendoff', kind: 'novel', src: 'xy_sendoff', t0: L('c1a').start - 0.2, t1: L('c1b').start + 0.5,
    tag: '西游记 · 小说', title: '唐王送别', sub: '太宗与唐僧结拜，称其“御弟”', pin: 'p_changan'},
  {type: 'quote', id: 'maoyue', t0: L('c1b').start + 0.7, t1: C('changan').end + 0.1,
    lines: ['冒越宪章', '私往天竺'], source: '玄奘《还至于阗国进表》', img: 'hs_xuanzang'},
  // 贰 瓜州
  {type: 'facts', id: 'lichang', t0: at('c2a', '追捕', -0.3), t1: L('c2a').end + 0.3,
    tag: '瓜州', title: '李昌毁牒', items: ['凉州追捕的牒文，被当面撕毁']},
  {type: 'facts', id: 'guide', t0: L('c2b').start - 0.1, t1: L('c2b').end + 0.3,
    tag: '瓜州', title: '胡人与老马', items: ['石槃陀 · 夜渡葫芦河', '瘦老赤马 · 往返伊吾十五度']},
  {type: 'duo', id: 'wukong', t0: L('c2c').start - 0.1, t1: L('c2c').end + 0.3, tag: '西游记 · 原型之说', pin: 'p_guazhou',
    items: [{src: 'xy_wukong', title: '孙悟空', sub: '胡人弟子石槃陀', fx: 0.38}, {src: 'xy_dragonhorse', title: '白龙马', sub: '识途的瘦老赤马', fx: 0.36}]},
  {type: 'image', id: 'yulin', kind: 'mural', src: 'hs_yulin', t0: L('c2d').start - 0.1, t1: C('guazhou').end,
    tag: '瓜州 · 榆林窟', title: '唐僧取经图', sub: '西夏壁画（示意）· 早于小说成书三百余年'},
  // 叁 莫贺延碛
  {type: 'quote', id: 'shahe', t0: L('c3a').start + 0.2, t1: L('c3a').end + 0.4,
    lines: ['长八百余里', '古曰沙河', '上无飞鸟', '下无走兽'], source: '《大唐大慈恩寺三藏法师传》'},
  {type: 'image', id: 'desert', kind: 'history', src: 'hs_desert', t0: L('c3b').start - 0.1, t1: L('c3c').end + 0.3,
    tag: '莫贺延碛', title: '四夜五日 滴水未进', quote: '宁可就西而死，岂归东而生', source: '《慈恩传》'},
  {type: 'image', id: 'shaseng', kind: 'novel', src: 'xy_shaseng', t0: L('c3d').start - 0.1, t1: C('mohe').end - 0.2,
    tag: '西游记 · 第二十二回', title: '流沙河 · 沙和尚', quote: '八百流沙界，三千弱水深', pin: 'p_mohe'},
  // 肆 高昌
  {type: 'image', id: 'gaochang', kind: 'history', src: 'hs_gaochang', t0: at('c4a', '国王', -0.3), t1: L('c4b').end + 0.3,
    tag: '高昌', title: '高昌王麴文泰',
    bullets: [
      {text: '绝食三日', t: at('c4a', '玄奘绝食')},
      {text: '结为兄弟', t: at('c4b', '结为兄弟')},
      {text: '二十四封国书', t: at('c4b', '二十四封')},
    ]},
  {type: 'image', id: 'nverguo', kind: 'novel', src: 'xy_nverguo', t0: L('c4c').start - 0.1, t1: L('c4c').end + 0.4,
    tag: '西游记 · 第五十四回', title: '女儿国', quote: '御弟哥哥', pin: 'p_gaochang'},
  {type: 'plate', id: 'huoyan', src: 'xy_huoyanshan', t0: at('c4d', '夏季', 0.3), t1: C('gaochang').end - 0.3,
    tag: '西游记 · 第五十九至六十一回', title: '火焰山', sub: '原型 · 吐鲁番火焰山', note: '夏季地表温度可达 70℃'},
  // 伍 凌山
  {type: 'image', id: 'lingshan', kind: 'history', src: 'hs_lingshan', t0: L('c5a').start - 0.1, t1: L('c5a').end + 0.3,
    tag: '凌山', title: '冰雪之山', quote: '冰雪所聚，积而为凌，春夏不解', source: '《慈恩传》'},
  {type: 'facts', id: 'khan', t0: L('c5b').start - 0.1, t1: L('c5b').end + 0.3,
    tag: '素叶城', title: '西突厥可汗', items: ['设宴款待', '遣使护送', '修书诸国']},
  {type: 'wendie', id: 'wendie', t0: L('c5c').start - 0.2, t1: C('lingshan').end + 0.1},
  // 陆 梵衍那
  {type: 'image', id: 'bamiyan', kind: 'history', src: 'hs_bamiyan', t0: L('c6b').start - 0.1, t1: C('bamiyan').end,
    tag: '梵衍那', title: '巴米扬大佛', quote: '金色晃曜，宝饰焕烂', source: '《大唐西域记》',
    loss: {t: at('c6c', '大佛被炸毁', -0.2), text: '公元 2001 年 · 大佛被毁'}},
  // 柒 恒河
  {type: 'facts', id: 'durga', t0: at('c7a', '他遭遇', -0.4), t1: L('c7a').end + 0.2,
    tag: '恒河', title: '突伽天神', quote: '觅一人质状端美，杀取肉血用以祠之', source: '《慈恩传》'},
  {type: 'image', id: 'ganges', kind: 'history', src: 'hs_ganges', t0: L('c7c').start - 0.1, t1: L('c7c').end + 0.3,
    tag: '恒河', title: '黑风四起', quote: '折树飞沙，河流涌浪', source: '《慈恩传》'},
  {type: 'image', id: 'captured', kind: 'novel', src: 'xy_captured', t0: L('c7d').start - 0.1, t1: C('ganges').end - 0.2,
    tag: '西游记 · 小说', title: '吃唐僧肉', sub: '妖魔口中的“长生不老”', pin: 'p_ganges'},
  // 捌 那烂陀
  {type: 'image', id: 'nalanda', kind: 'history', src: 'hs_nalanda', t0: at('c8a', '那烂陀寺', -0.4), t1: L('c8a').end + 0.3,
    tag: '那烂陀寺', title: '天竺最高学府', quote: '僧徒主客，常有万人', source: '《慈恩传》'},
  {type: 'facts', id: 'jiexian', t0: L('c8b').start - 0.1, t1: L('c8b').end + 0.3,
    tag: '那烂陀寺', title: '戒贤法师', items: ['亲授《瑜伽师地论》', '留学五年']},
  {type: 'plate', id: 'lingshanPlate', src: 'xy_lingshan', t0: at('c8c', '小说里', -0.3), t1: C('nalanda').end - 0.3,
    tag: '西游记 · 第九十八回', title: '灵山 · 雷音寺', sub: '原型 · 王舍城外灵鹫山'},
  // 拾 曲女城
  {type: 'image', id: 'kannauj', kind: 'history', src: 'hs_kannauj', t0: L('c10a').start - 0.1, t1: L('c10a').end + 0.3,
    tag: '公元642年', title: '曲女城大会',
    bullets: [
      {text: '十八国国王', t: at('c10a', '十八国')},
      {text: '大小乘僧三千余人', t: at('c10a', '数千名')},
      {text: '婆罗门及外道二千余人', t: at('c10a', '婆罗门')},
    ]},
  {type: 'quote', id: 'zhanshou', t0: L('c10b').start + 0.2, t1: L('c10b').end + 0.4,
    lines: ['若其间有一字无理', '能难破者', '请斩首相谢'], source: '《慈恩传》'},
  {type: 'counter', id: 'days18', t0: L('c10c').start - 0.1, t1: L('c10c').end + 0.5},
  {type: 'image', id: 'chechi', kind: 'novel', src: 'xy_chechi', t0: L('c10d').start - 0.1, t1: C('kannauj').end - 0.2,
    tag: '西游记 · 第四十四至四十六回', title: '车迟国斗法', sub: '求雨 · 坐禅 · 砍头 · 下油锅', pin: 'p_kannauj'},
  // 拾壹 信度河
  {type: 'facts', id: 'return643', t0: L('c11a').start - 0.1, t1: L('c11a').end + 0.3,
    tag: '公元643年', title: '踏上归途', items: ['谢绝戒日王挽留'], legend: true},
  {type: 'facts', id: 'lost', t0: at('c11b', '五十夹', -0.6), t1: L('c11b').end + 0.3,
    tag: '信度河', title: '失经五十夹', items: ['连同带回的印度花种']},
  {type: 'plate', id: 'shaijing', src: 'xy_shaijing', t0: L('c11c').start - 0.1, t1: C('indus').end - 0.2,
    tag: '西游记 · 第九十九回', title: '通天河 · 晒经', sub: '八十一难的最后一难'},
  // 拾贰 葱岭
  {type: 'quote', id: 'pamirq', t0: L('c12a').start + 0.2, t1: L('c12a').end + 0.4,
    lines: ['寒风凄劲', '春夏飞雪'], source: '《大唐西域记》'},
  {type: 'letter', id: 'letter', t0: at('c12b', '太宗回信', -0.4), t1: L('c12b').end + 0.5},
  {type: 'facts', id: 'liusha', t0: at('c12c', '穿过', -0.3), t1: L('c12c').end + 0.3,
    tag: '归途', title: '大流沙', quote: '聚散随风，人行无迹', source: '《大唐西域记》'},
  // 拾叁 长安
  {type: 'image', id: 'return', kind: 'history', src: 'hs_return', t0: at('c13a', '玄奘回到长安', -0.6), t1: L('c13a').end + 0.3,
    tag: '贞观十九年', title: '归来长安', sub: '公元645年正月'},
  {type: 'stats', id: 'stats', t0: L('c13b').start - 0.1, t1: L('c13b').end + 0.3},
  {type: 'lineage', id: 'lineage', t0: L('c13c').start - 0.1, t1: C('return').end + 0.2},
];

/** Whether a right-hand card occupies the screen at time t (0..1). */
export function rightBusy(t: number): number {
  let v = 0;
  for (const c of CARDS) {
    if (c.type === 'plate') continue;
    if (t >= c.t0 - 0.2 && t <= c.t1 + 0.2) v = Math.max(v, Math.min(1, (t - c.t0 + 0.2) / 0.6, (c.t1 + 0.2 - t) / 0.6));
  }
  return Math.max(0, v);
}

export function plateCover(t: number): number {
  let v = 0;
  for (const c of CARDS) {
    if (c.type !== 'plate') continue;
    if (t >= c.t0 && t <= c.t1) v = Math.max(v, Math.min(1, (t - c.t0) / 1.4, (c.t1 - t) / 0.8));
  }
  return Math.max(0, v);
}

export const CREDITS = [
  ['史料', '《大唐大慈恩寺三藏法师传》 · 《大唐西域记》 · 吴承恩《西游记》'],
  ['地图', 'MapLibre GL JS · NASA Blue Marble · Tilezen Terrain Tiles · Natural Earth'],
  ['画面', '历史与小说场景均为 AI 绘制示意图'],
  ['配音 · 配乐', 'AI 语音合成 · 原创程序化配乐'],
];

export const COVER = {
  kicker: 'THE REAL JOURNEY TO THE WEST',
  hook: '一张地图 重走真实取经路',
  stats: '五万里 · 十七年 · 一百三十八国',
  years: '629 — 645',
};

export const STATIC_TEXT = [
  '玄奘西行', '一条真实的取经路', '与《西游记》的诞生', 'THE REAL JOURNEY TO THE WEST', '629 — 645',
  '遍游五印', '东 南 西 北 中', '十万八千里', '五万里', '十七年', '一百三十八国', '筋斗云', '一步一步',
  '去程', '归程', '原型', '史', '戏', '西游记', '示意', '通关文牒', '大唐国僧玄奘', '往西天拜佛求经',
  '路经诸国', '伏乞照验放行', '高昌', '屈支', '素叶', '飒秣建', '梵衍那', '迦湿弥罗', '国', '印',
  '十八日', '无人能难', '大乘天', '解脱天', '日', '第', '部', '卷', '六百五十七', '一千三百三十五',
  '佛经', '译经', '大唐西域记', '玄奘归国', '大唐三藏取经诗话', '南宋', '明', '世德堂本', '电视剧',
  '太宗敕书', '闻师访道殊域', '今得归还', '欢喜无量', '贞观十九年', '公元', '年', '亲践者一百一十国',
  '传闻者二十八国', '0123456789', '《》“”·—…、，。：', '从玄奘到唐僧', '敕', '御笔', '唐', '史料', '地图',
  '画面', '配音', '配乐', '谢谢观看', '可汗', '国书', '原型地', '小说情节', '关联', '吐鲁番', '王舍城',
  '公元645年', '公元642年', '公元643年', '公元629年',
];
