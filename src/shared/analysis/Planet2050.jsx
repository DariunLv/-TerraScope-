/* Pestaña “Planeta 2050”: el lugar investigado sobre el planeta 3D y un termómetro que sube o baja
   según el año elegido (hoy → 2050). Usa la misma proyección validada de “Pronóstico y escenarios”. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Slider, SegmentedControl, Button, Alert } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconRefresh, IconInfoCircle } from '@tabler/icons-react';
import * as C from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { mesh } from 'topojson-client';
import world from '../../lib/geo/world110.json';
import { V, sourceOf } from '../../lib/nasa/data';
import { isTemp } from '../../lib/analysis/viz';
import * as I from '../../lib/analysis/intel';
import { COUNTRIES, cname, tier } from '../earth/EarthView';
import Interpret from '../Interpret';

const col = (c, a = 1) => C.Color.fromCssColorString(c).withAlpha(a);
const WARM = '#c2410c', COOL = '#1e40af';
const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

/* ---------- planeta ---------- */
function Globe({ pl, color, intensity, label, lang }) {
  const el = useRef(null), V_ = useRef(null), ds = useRef(null), [ready, setReady] = useState(false);
  useEffect(() => {
    let v;
    try {
      v = new C.Viewer(el.current, {
        animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
        scene3DOnly: true, skyBox: false, showRenderLoopErrors: false,
        baseLayer: C.ImageryLayer.fromProviderAsync(C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl('Assets/Textures/NaturalEarthII'))),
      });
    } catch (e) { console.warn('Cesium', e); return undefined; }
    V_.current = v; const sc = v.scene;
    sc.backgroundColor = col('#0b1630'); sc.globe.baseColor = col('#cfe5f5'); if (sc.sun) sc.sun.show = false; if (sc.moon) sc.moon.show = false;
    sc.globe.enableLighting = false; sc.fog.enabled = false; sc.globe.showGroundAtmosphere = false; sc.skyAtmosphere.show = true;
    sc.screenSpaceCameraController.minimumZoomDistance = 12000; sc.screenSpaceCameraController.maximumZoomDistance = 3.6e7;
    v.cesiumWidget.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    ds.current = new C.CustomDataSource('f50'); v.dataSources.add(ds.current);
    const b = new C.CustomDataSource('b'); v.dataSources.add(b);
    mesh(world, world.objects.countries).coordinates.forEach((line) => { if (line.length > 1) b.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(line.flat()), width: 1, material: col('#ffffff', 0.55) } }); });
    const lb = new C.CustomDataSource('l'); v.dataSources.add(lb);
    COUNTRIES.forEach((c) => { const T = tier(c.area); lb.entities.add({ position: C.Cartesian3.fromDegrees(c.c[0], c.c[1]), label: { text: cname(c, lang).toUpperCase(), font: `${T === 0 ? 700 : 600} 12px Inter, sans-serif`, fillColor: col('#14213d', 0.92), outlineColor: col('#ffffff', 0.9), outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, distanceDisplayCondition: new C.DistanceDisplayCondition(0, [2.4e7, 1.2e7, 5e6, 2.2e6][T]) } }); });
    v.camera.setView({ destination: C.Cartesian3.fromDegrees(pl.lon, pl.lat, 1.1e7) });
    v.camera.flyTo({ destination: C.Cartesian3.fromDegrees(pl.lon, pl.lat, 4.2e6), duration: 2.2 });
    setReady(true);
    return () => { V_.current = null; try { v.destroy(); } catch { /* ya destruido */ } };
  }, [pl.lat, pl.lon, lang]);
  /* halo de calor: círculos concéntricos cuyo tamaño crece con el cambio */
  useEffect(() => {
    const d = ds.current, v = V_.current; if (!ready || !d || !v) return; d.entities.removeAll();
    const p = C.Cartesian3.fromDegrees(pl.lon, pl.lat), k = Math.max(0.15, Math.min(1, intensity));
    [1, 0.72, 0.46].forEach((f, i) => d.entities.add({ position: p, ellipse: { semiMajorAxis: 90000 + 520000 * k * f, semiMinorAxis: 90000 + 520000 * k * f, material: col(color, 0.16 + i * 0.12), height: 0 } }));
    d.entities.add({ position: p, point: { pixelSize: 14, color: col(color), outlineColor: C.Color.WHITE, outlineWidth: 2.5, disableDepthTestDistance: Number.POSITIVE_INFINITY }, label: { text: label, font: '700 15px Inter, sans-serif', fillColor: C.Color.WHITE, outlineColor: col('#14213d'), outlineWidth: 5, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -30), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    v.scene.requestRender();
  }, [ready, color, intensity, label, pl.lat, pl.lon]);
  return <div ref={el} className="f50globe" />;
}

/* ---------- termómetro ---------- */
function Thermo({ lo, hi, val, q05, q95, base, color, unit, d }) {
  const H = 300, y = (x) => H - ((x - lo) / (hi - lo || 1)) * H, ticks = Array.from({ length: 6 }, (_, i) => lo + ((hi - lo) * i) / 5);
  return (
    <svg viewBox="0 0 150 372" className="thermo" role="img" aria-label="termómetro">
      <g transform="translate(60,16)">
        <rect x="0" y="0" width="28" height={H} rx="14" fill="#eef2f7" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="4" y={y(val)} width="20" height={H - y(val) + 10} rx="10" fill={color} style={{ transition: 'all .35s ease' }} />
        <circle cx="14" cy={H + 28} r="30" fill={color} stroke="#cbd5e1" strokeWidth="2" style={{ transition: 'fill .35s' }} />
        <rect x="4" y={H - 6} width="20" height="20" fill={color} />
        <rect x="-8" y={y(q95)} width="44" height={Math.max(3, y(q05) - y(q95))} rx="4" fill={color} opacity=".18" />
        {base != null && <g><line x1="-14" x2="42" y1={y(base)} y2={y(base)} stroke="#14213d" strokeDasharray="4 3" strokeWidth="1.6" /><text x="-18" y={y(base) + 4} textAnchor="end" fontSize="10" fill="#14213d" fontWeight="700">hoy</text></g>}
        {ticks.map((t, i) => <g key={i}><line x1="34" x2="42" y1={y(t)} y2={y(t)} stroke="#94a3b8" /><text x="46" y={y(t) + 4} fontSize="10.5" fill="#5b6b8c">{t.toFixed(d)}</text></g>)}
        <text x="14" y={H + 62} textAnchor="middle" fontSize="11" fill="#5b6b8c">{unit}</text>
      </g>
    </svg>
  );
}

export default function Planet2050({ cur, res, pname, L, lang }) {
  const k = cur.k, u = V[k].u, d = V[k].d, pts = useMemo(() => I.fillGaps(cur.raw).pts, [cur]);
  const lastYear = pts[pts.length - 1].year, yrs = Math.max(3, 2050 - lastYear);
  const [mult, setMult] = useState(1), [year, setYear] = useState(2050), [play, setPlay] = useState(false);
  const S = useMemo(() => ({ 0: I.simulate(pts, { years: yrs, mult: 0, B: 250 }), 1: I.simulate(pts, { years: yrs, mult: 1, B: 300 }), 2: I.simulate(pts, { years: yrs, mult: 2, B: 250 }) }), [pts, yrs]);
  const hist = useMemo(() => { const m = new Map(); pts.forEach((p) => { const a = m.get(p.year) || [0, 0]; a[0] += p.v; a[1]++; m.set(p.year, a); }); return [...m.entries()].filter(([, a]) => a[1] === 12).map(([y, a]) => ({ year: y, v: a[0] / a[1] })); }, [pts]);
  const base = mean(hist.slice(-5).map((h) => h.v)), ann = S[mult].ann, years = ann.map((a) => a.year), y0 = years[0], y1 = years[years.length - 1];
  const yr = Math.min(y1, Math.max(y0, year)), row = ann.find((a) => a.year === yr) || ann[0], delta = row.q50 - base;
  const all = [base, ...Object.values(S).flatMap((s) => s.ann.flatMap((a) => [a.q05, a.q95]))], lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.06;
  const spread = Math.max(...Object.values(S).map((s) => Math.abs(s.ann[s.ann.length - 1].q50 - base)), 1e-9);
  const worse = isTemp(k) ? delta > 0 : delta < 0, color = Math.abs(delta) < spread * 0.04 ? '#64748b' : isTemp(k) ? (delta > 0 ? WARM : COOL) : (delta > 0 ? COOL : WARM);
  const sg = (x) => `${x > 0 ? '+' : ''}${x.toFixed(d)}`;
  useEffect(() => { if (!play) return undefined; const t = setInterval(() => setYear((y) => { if (y >= y1) { setPlay(false); return y1; } return y + 1; }), 420); return () => clearInterval(t); }, [play, y1]);
  const start = () => { if (yr >= y1) setYear(y0); setPlay((p) => !p); };
  const mlab = { 0: L('Se detiene', 'Stops'), 1: L('Sigue igual', 'Continues'), 2: L('Se duplica', 'Doubles') };
  const hasGL = useMemo(() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }, []);
  return (<>
    <p className="sub">{L('Mira tu lugar sobre el planeta y mueve el año: el termómetro sube o baja según lo que proyecta la serie si la tendencia actual continúa, se detiene o se duplica.', 'See your place on the planet and move the year: the thermometer rises or falls with what the series projects if the current trend continues, stops or doubles.')}</p>
    <div className="f50">
      <div className="f50g">
        {hasGL ? <Globe pl={res.pl} color={color} intensity={Math.abs(delta) / spread} label={`${yr}: ${row.q50.toFixed(d)} ${u} (${sg(delta)})`} lang={lang} /> : <Alert radius="lg" color="gray">{L('Este equipo no tiene WebGL: el planeta 3D no está disponible, pero el termómetro sí.', 'This device has no WebGL: the 3D planet is unavailable, but the thermometer works.')}</Alert>}
        <div className="f50year"><span>{yr}</span><small>{pname}</small></div>
      </div>
      <div className="f50t">
        <b className="f50h">{V[k][lang][0]}</b>
        <Thermo lo={lo - pad} hi={hi + pad} val={row.q50} q05={row.q05} q95={row.q95} base={base} color={color} unit={u} d={d} />
        <div className="f50n" style={{ color }}>{row.q50.toFixed(d)} <small>{u}</small></div>
        <span className="mini">{L('Rango de 90 %', '90 % range')}: {row.q05.toFixed(d)} {L('a', 'to')} {row.q95.toFixed(d)}</span>
        <span className="f50c" style={{ background: color }}>{sg(delta)} {u} {L('frente a hoy', 'vs today')}</span>
      </div>
    </div>
    <div className="row ctrl" style={{ marginTop: 12 }}>
      <Button color="forest" radius="xl" leftSection={play ? <IconPlayerPause size={16} /> : yr >= y1 ? <IconRefresh size={16} /> : <IconPlayerPlay size={16} />} onClick={start}>{play ? L('Pausar', 'Pause') : yr >= y1 ? L('Repetir viaje', 'Replay') : L('Viajar al futuro', 'Travel to the future')}</Button>
      <div style={{ flex: 1, minWidth: 220 }}><span className="mini">{L('Año', 'Year')}: <b>{yr}</b></span><Slider color="forest" min={y0} max={y1} value={yr} onChange={(x) => { setPlay(false); setYear(x); }} label={null} marks={[y0, 2030, 2040, y1].filter((x, i, a) => a.indexOf(x) === i && x >= y0 && x <= y1).map((value) => ({ value, label: String(value) }))} /></div>
      <div><span className="mini">{L('¿Y si la tendencia…?', 'What if the trend…?')}</span><br /><SegmentedControl size="xs" color="navy" value={String(mult)} onChange={(x) => setMult(+x)} data={[0, 1, 2].map((m) => ({ value: String(m), label: mlab[m] }))} /></div>
    </div>
    <Interpret title={`${V[k][lang][0]} · ${yr}`} facts={`${V[k][lang][0]} en ${pname}: promedio de los últimos 5 años completos ${base.toFixed(d)} ${u}; proyección para ${yr} (tendencia ${mlab[mult].toLowerCase()}): valor central ${row.q50.toFixed(d)} ${u}, rango de 90 % de ${row.q05.toFixed(d)} a ${row.q95.toFixed(d)}; cambio ${sg(delta)} ${u}; fuente ${sourceOf(k)}; serie hasta ${lastYear}`} how={L('Cómo se lee: el termómetro marca el valor anual central proyectado; la franja suave es el rango de 90 % y la línea punteada es el promedio actual. El halo del planeta crece con el cambio.', 'How to read it: the thermometer marks the projected central annual value; the soft band is the 90 % range and the dashed line is today’s average. The halo on the planet grows with the change.')} plain={worse ? L('Qué dice aquí: bajo este supuesto la variable se mueve en sentido desfavorable respecto de hoy.', 'What it says here: under this assumption the variable moves in an unfavourable direction from today.') : L('Qué dice aquí: bajo este supuesto el cambio frente a hoy es pequeño o va en sentido favorable.', 'What it says here: under this assumption the change from today is small or favourable.')} next={L('Siguiente paso: compara “se detiene” con “se duplica” para ver cuánto depende el 2050 de que la tendencia continúe.', 'Next step: compare “stops” with “doubles” to see how much 2050 depends on the trend continuing.')} />
    <p className="mini"><IconInfoCircle size={13} style={{ verticalAlign: '-2px' }} /> {L('Es una proyección condicionada, no una predicción: supone que la tendencia y la variabilidad pasadas continúan. Solo representa este punto (una celda de unos 50 km), no todo el planeta ni el clima global. Modelo: tendencia lineal + ciclo estacional + memoria de un mes, con simulaciones.', 'It is a conditional projection, not a prediction: it assumes past trend and variability continue. It represents only this point (a cell of about 50 km), not the whole planet or the global climate. Model: linear trend + seasonal cycle + one-month memory, with simulations.')}</p>
  </>);
}
