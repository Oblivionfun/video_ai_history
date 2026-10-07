import '@fontsource/noto-serif-sc/300.css';
import '@fontsource/noto-serif-sc/400.css';
import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/ma-shan-zheng/400.css';
import '@fontsource/zhi-mang-xing/400.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {ALL_TEXT} from './text';

const FACES = [
  ['300', 'Noto Serif SC'],
  ['400', 'Noto Serif SC'],
  ['500', 'Noto Serif SC'],
  ['600', 'Noto Serif SC'],
  ['700', 'Noto Serif SC'],
  ['900', 'Noto Serif SC'],
  ['400', 'Ma Shan Zheng'],
  ['400', 'Zhi Mang Xing'],
  ['400', 'Cormorant Garamond'],
  ['500', 'Cormorant Garamond'],
  ['600', 'Cormorant Garamond'],
  ['italic 400', 'Cormorant Garamond'],
];

let loaded: Promise<void> | null = null;

function loadAll() {
  if (!loaded) {
    const chars = Array.from(new Set(Array.from(ALL_TEXT))).join('');
    loaded = Promise.all(FACES.map(([w, f]) => document.fonts.load(`${w} 40px "${f}"`, chars))).then(() => undefined);
  }
  return loaded;
}

export function useFonts() {
  const [handle] = useState(() => delayRender('fonts', {timeoutInMilliseconds: 120000}));
  useEffect(() => {
    loadAll()
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
}
