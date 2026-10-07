import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import rivers from '../data/rivers.json';
import {Cam, camAt, headS} from '../director';
import {clamp, env} from '../lib/interp';
import {J01, Journey} from '../lib/journey';
import {C, L} from '../lib/time';
import {registerTileProtocol} from './tiles';

export interface Projected {
  x: number;
  y: number;
  on: boolean;
}

export interface MapFrame {
  frame: number;
  t: number;
  zoom: number;
  pitch: number;
  pos: Record<string, Projected>;
  head: Projected;
}

const Ctx = createContext<MapFrame | null>(null);
export const useMapFrame = () => useContext(Ctx);

const STYLE: Record<'out' | 'return', {core: string; glow: string; tip: string}> = {
  out: {core: '#f6d58e', glow: '#e9a640', tip: '#fff6dc'},
  return: {core: '#ff8a62', glow: '#e2482c', tip: '#ffe2d4'},
};

const LAYERS = [
  {suffix: 'halo', width: 18, blur: 14, opacity: 0.32, color: 'glow' as const},
  {suffix: 'glow', width: 6.5, blur: 3.5, opacity: 0.75, color: 'glow' as const},
  {suffix: 'core', width: 2.4, blur: 0.3, opacity: 1, color: 'core' as const},
];

const transparent = 'rgba(0,0,0,0)';

function gradient(j: Journey, leg: string, p: number, color: string) {
  const len = j.LEG_RANGE[leg][1] - j.LEG_RANGE[leg][0];
  const tip = Math.min(0.5, 0.0024 / len);
  if (p >= 0.9999) return ['interpolate', ['linear'], ['line-progress'], 0, color, 1, color];
  const stops: (number | string)[] = [0, color];
  if (p - tip > 1e-4) stops.push(p - tip, color);
  stops.push(p, STYLE[j.legStyle(leg)].tip, Math.min(1, p + 1e-5), transparent);
  if (Math.min(1, p + 1e-5) < 1) stops.push(1, transparent);
  return ['interpolate', ['linear'], ['line-progress'], ...stops];
}

function buildStyle(j: Journey, mercator: boolean, lineScale: number): maplibregl.StyleSpecification {
  const legSources = Object.fromEntries(
    j.route.LEG_ORDER.map((leg) => [
      `leg_${leg}`,
      {
        type: 'geojson',
        lineMetrics: true,
        data: {type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: j.legCoords(leg)}},
      },
    ]),
  );
  const legLayers = j.route.LEG_ORDER.flatMap((leg) =>
    LAYERS.map((ly) => ({
      id: `${leg}_${ly.suffix}`,
      type: 'line',
      source: `leg_${leg}`,
      layout: {'line-cap': 'round', 'line-join': 'round', visibility: 'none'},
      paint: {
        'line-width': ly.width * lineScale,
        'line-blur': ly.blur * lineScale,
        'line-opacity': ly.opacity,
        'line-offset': j.legStyle(leg) === 'return' ? 3 : 0,
        'line-gradient': gradient(j, leg, 1, STYLE[j.legStyle(leg)][ly.color]),
      },
    })),
  );
  return {
    version: 8,
    projection: mercator ? {type: 'mercator'} : {type: ['interpolate', ['linear'], ['zoom'], 2.9, 'vertical-perspective', 4.3, 'mercator']},
    sources: {
      img: {type: 'raster', tiles: ['xz://img/{z}/{x}/{y}'], tileSize: 256, maxzoom: 8},
      dem: {type: 'raster-dem', tiles: ['xz://dem/{z}/{x}/{y}'], tileSize: 256, maxzoom: 8, encoding: 'terrarium'},
      rivers: {type: 'geojson', data: rivers as GeoJSON.FeatureCollection},
      preview: {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {type: 'MultiLineString', coordinates: j.route.LEG_ORDER.map((l) => j.legCoords(l))},
        },
      },
      ...legSources,
    } as maplibregl.StyleSpecification['sources'],
    layers: [
      {id: 'bg', type: 'background', paint: {'background-color': '#03060a'}},
      {
        id: 'img',
        type: 'raster',
        source: 'img',
        paint: {
          'raster-fade-duration': 0,
          'raster-saturation': -0.22,
          'raster-contrast': 0.1,
          'raster-brightness-min': 0.02,
          'raster-brightness-max': 0.93,
        },
      },
      {
        id: 'rivers',
        type: 'line',
        source: 'rivers',
        layout: {'line-cap': 'round', 'line-join': 'round'},
        paint: {
          'line-color': '#a9dcec',
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 3.5, 0, 4.5, 0.4, 8, 0.55],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.7, 8, 1.8],
          'line-blur': 0.4,
        },
      },
      {
        id: 'preview',
        type: 'line',
        source: 'preview',
        layout: {'line-cap': 'round', 'line-join': 'round'},
        paint: {'line-color': '#f3cf86', 'line-width': 1.8, 'line-opacity': 0, 'line-dasharray': [0.2, 2.2]},
      },
      ...(legLayers as maplibregl.LayerSpecification[]),
    ],
    terrain: {source: 'dem', exaggeration: 1.65},
    sky: {
      'sky-color': '#0a1220',
      'horizon-color': '#d8b27c',
      'fog-color': '#b99a72',
      'sky-horizon-blend': 0.55,
      'horizon-fog-blend': 0.55,
      'fog-ground-blend': 0.82,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 3, 0.9, 4.5, 0],
    },
  };
}

/** Preview of the whole route shown in the prologue. */
const previewOpacity = (t: number) => 0.85 * env(t, L('pro2').start - 0.3, C('pro').end - 1.2, 1.4, 1.8);

export const MapScene: React.FC<{
  children?: React.ReactNode;
  cam?: (t: number) => Cam;
  mercator?: boolean;
  /** film time to show instead of the current frame (stills such as the cover) */
  time?: number;
  lineScale?: number;
  /** CSS filter on the map canvas only (overlays are unaffected) */
  filter?: string;
  /** route progress (arc length along the journey) at film time t */
  head?: (t: number) => number;
  /** opacity of the dashed whole-route preview at film time t */
  preview?: (t: number) => number;
  /** which episode's route to draw (default: ep01) */
  journey?: Journey;
}> = ({children, cam: camFn = camAt, mercator = false, time, lineScale = 1, filter, head: headFn = headS, preview: previewFn = previewOpacity, journey: j = J01}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = time ?? frame / fps;
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const last = useRef<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<MapFrame | null>(null);
  const [initHandle] = useState(() => delayRender('map init', {timeoutInMilliseconds: 240000}));

  useEffect(() => {
    registerTileProtocol();
    const cam = camFn(t);
    const map = new maplibregl.Map({
      container: ref.current!,
      style: buildStyle(j, mercator, lineScale),
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      pixelRatio: 1,
      maxPitch: 85,
      renderWorldCopies: false,
      canvasContextAttributes: {preserveDrawingBuffer: true, antialias: true},
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
    });
    map.once('load', () => {
      map.resize();
      mapRef.current = map;
      setReady(true);
    });
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const handle = delayRender(`map frame ${frame}`, {timeoutInMilliseconds: 240000});
    const cam = camFn(t);
    map.jumpTo({
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
      padding: {left: cam.padL ?? 0, right: cam.padR, top: cam.padT ?? 0, bottom: cam.padB ?? 0},
    });

    const s = headFn(t);
    for (const leg of j.route.LEG_ORDER) {
      const [a, b] = j.LEG_RANGE[leg];
      const p = clamp((s - a) / (b - a));
      const key = `leg_${leg}`;
      const prev = last.current[key];
      if (prev !== undefined && Math.abs(prev - p) < 1e-6) continue;
      last.current[key] = p;
      for (const ly of LAYERS) {
        const id = `${leg}_${ly.suffix}`;
        if (p <= 1e-4) {
          map.setLayoutProperty(id, 'visibility', 'none');
        } else {
          map.setLayoutProperty(id, 'visibility', 'visible');
          map.setPaintProperty(id, 'line-gradient', gradient(j, leg, p, STYLE[j.legStyle(leg)][ly.color]));
        }
      }
    }
    const po = previewFn(t);
    if (last.current.preview !== po) {
      last.current.preview = po;
      map.setPaintProperty('preview', 'line-opacity', po);
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(poll);
      const tr = (map as unknown as {transform: {isPointOnMapSurface: (p: maplibregl.Point) => boolean; isLocationOccluded?: (l: maplibregl.LngLat) => boolean}}).transform;
      const project = (ll: [number, number]): Projected => {
        const p = map.project(ll);
        let on = p.x > -400 && p.x < width + 400 && p.y > -300 && p.y < height + 300;
        if (on) on = tr.isPointOnMapSurface(new maplibregl.Point(p.x, p.y));
        if (on && tr.isLocationOccluded) on = !tr.isLocationOccluded(new maplibregl.LngLat(ll[0], ll[1]));
        return {x: p.x, y: p.y, on};
      };
      const pos: Record<string, Projected> = {};
      for (const [k, ll] of Object.entries(j.ANCHORS)) pos[k] = project(ll);
      flushSync(() =>
        setState({frame, t, zoom: cam.zoom, pitch: cam.pitch, pos, head: project(j.lngLatAt(s))}),
      );
      continueRender(handle);
    };
    map.once('idle', finish);
    let stable = 0;
    const poll = setInterval(() => {
      if (map.loaded() && map.areTilesLoaded() && !map.isMoving()) {
        stable += 1;
        if (stable >= 4) finish();
      } else stable = 0;
    }, 40);
    map.triggerRepaint();
  }, [frame, t, ready, width, height]);

  useEffect(() => {
    if (ready) continueRender(initHandle);
  }, [ready, initHandle]);

  return (
    <>
      <div ref={ref} style={{position: 'absolute', left: 0, top: 0, width, height, filter}} />
      <Ctx.Provider value={state}>{children}</Ctx.Provider>
    </>
  );
};
