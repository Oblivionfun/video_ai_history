import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, {useEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const props = getInputProps() as {terrain?: boolean; pitch?: number};

const tileUrl = (layer: string, ext: string) =>
  `${window.location.origin}${staticFile(`tiles/${layer}`)}/{z}/{x}/{y}.${ext}`;

export const MapTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [dbg, setDbg] = useState('init');
  const [initHandle] = useState(() => delayRender('init map'));

  useEffect(() => {
    const t0 = performance.now();
    const map = new maplibregl.Map({
      container: ref.current!,
      style: {
        version: 8,
        sources: {
          img: {type: 'raster', tiles: [tileUrl('img', 'jpg')], tileSize: 256, maxzoom: 8},
          dem: {type: 'raster-dem', tiles: [tileUrl('dem', 'png')], tileSize: 256, maxzoom: 8, encoding: 'terrarium'},
        },
        layers: [
          {id: 'bg', type: 'background', paint: {'background-color': '#05080c'}},
          {id: 'img', type: 'raster', source: 'img', paint: {'raster-fade-duration': 0}},
        ],
        ...(props.terrain === false ? {} : {terrain: {source: 'dem', exaggeration: 1.6}}),
        sky: {
          'sky-color': '#0b1320',
          'horizon-color': '#d9b47a',
          'fog-color': '#c9a77a',
          'sky-horizon-blend': 0.6,
          'horizon-fog-blend': 0.6,
          'fog-ground-blend': 0.75,
        },
      },
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      pixelRatio: 1,
      maxPitch: 85,
      canvasContextAttributes: {preserveDrawingBuffer: true, antialias: true},
      center: [89, 42],
      zoom: 6.5,
      pitch: 60,
    });
    map.once('load', () => {
      console.log('XZDBG map load ms', Math.round(performance.now() - t0));
      map.resize();
      mapRef.current = map;
      setReady(true);
    });
    return () => map.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const h = delayRender(`frame ${frame}`);
    const t = frame / durationInFrames;
    const t0 = performance.now();
    map.jumpTo({center: [86 + t * 6, 41.5 + t * 1.2], zoom: 6.6 + t * 1.2, pitch: props.pitch ?? 62, bearing: -30 + t * 40});
    map.once('idle', () => {
      const c = map.getCanvas();
      const msg = `frame ${frame} idle ${Math.round(performance.now() - t0)}ms canvas ${c.width}x${c.height} css ${c.style.width}/${c.style.height} container ${ref.current?.clientWidth}x${ref.current?.clientHeight} dpr ${window.devicePixelRatio} inner ${window.innerWidth}x${window.innerHeight}`;
      setDbg(msg);
      setTimeout(() => continueRender(h), 50);
    });
    map.triggerRepaint();
  }, [frame, ready, durationInFrames]);

  useEffect(() => {
    if (ready) continueRender(initHandle);
  }, [ready, initHandle]);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <div ref={ref} style={{position: 'absolute', left: 0, top: 0, width, height}} />
      <div style={{position: 'absolute', left: 40, top: 500, color: '#0f0', fontSize: 36, fontFamily: 'monospace', background: 'rgba(0,0,0,.6)'}}>{dbg}</div>
    </AbsoluteFill>
  );
};
