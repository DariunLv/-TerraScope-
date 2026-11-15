/* Simulaciones interactivas de las lecciones de Aprender. Todo se calcula en el navegador con los mismos métodos que usa la app. */
import { useMemo, useState } from 'react';
import { Slider, Switch, Button, SegmentedControl } from '@mantine/core';
import { mannKendall, ols } from '../../lib/analysis/stats';
const gauss = () => Math.sqrt(-2 * Math.log(Math.max(Math.random(), 1e-9))) * Math.cos(2 * Math.PI * Math.random());
const normals = (n) => Array.from({ length: n }, gauss);
const fp = (p, es) => (p < 0.001 ? 'p < 0' + (es ? ',' : '.') + '001' : 'p = ' + p.toFixed(3).replace('.', es ? ',' : '.'));
const line = (arr, X, Y) => arr.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
const ext = (a) => [Math.min(...a), Math.max(...a)];
const corr = (a, b) => { const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n; let sa = 0, sb = 0, sab = 0; for (let i = 0; i < n; i++) { sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; sab += (a[i] - ma) * (b[i] - mb); } return sab / Math.sqrt(sa * sb); };
const Row = ({ label, children }) => <div className="lw-row"><span>{label}</span><div>{children}</div></div>;

/* 1. Tendencia frente a ruido */
export function TrendWidget({ L, es }) {
  const [seed, setSeed] = useState(0), z = useMemo(() => normals(40), [seed]); // eslint-disable-line
  const [sl, setSl] = useState(0.04), [nz, setNz] = useState(1);
  const y = z.map((e, i) => sl * i + nz * e), x = y.map((_, i) => i), o = ols(x, y), mk = mannKendall(y), [lo, hi] = ext(y), W = 360, H = 140;
  const X = (i) => 12 + (i / 39) * (W - 24), Y = (v) => H - 10 - ((v - lo) / (hi - lo || 1)) * (H - 20), sig = mk.p < 0.05;
  return (<div className="lw">
    <svg viewBox={`0 0 ${W} ${H}`} className="lw-svg"><polyline points={line(y, X, Y)} fill="none" stroke="#1e3a8a" strokeWidth="2" />{y.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r="2.6" fill="#1e3a8a" />)}
      <line x1={X(0)} y1={Y(o.intercept ?? y[0])} x2={X(39)} y2={Y((o.intercept ?? y[0]) + o.slope * 39)} stroke="#c2410c" strokeWidth="2.5" strokeDasharray="6 4" /></svg>
    <Row label={L('Tendencia real que sembramos', 'Real trend we planted')}><Slider color="forest" min={0} max={0.1} step={0.005} value={sl} onChange={setSl} label={(v) => v.toFixed(3)} /></Row>
    <Row label={L('Cantidad de ruido (variación natural)', 'Amount of noise (natural variation)')}><Slider color="navy" min={0.2} max={3} step={0.1} value={nz} onChange={setNz} label={(v) => v.toFixed(1)} /></Row>
    <p className={'lw-res ' + (sig ? 'ok' : 'no')}><b>{sig ? L('La prueba detecta una tendencia', 'The test detects a trend') : L('No se distingue del ruido', 'Cannot be told from noise')}</b> · {L('pendiente estimada', 'estimated slope')} {o.slope.toFixed(3)} · Mann-Kendall {fp(mk.p, es)}</p>
    <button className="textlink" onClick={() => setSeed(seed + 1)}>{L('Otro ruido', 'Another noise')}</button>
  </div>);
}

/* 2. Estacionalidad */
export function SeasonWidget({ L }) {
  const [seed, setSeed] = useState(0), z = useMemo(() => normals(120), [seed]); // eslint-disable-line
  const [amp, setAmp] = useState(2), [tr, setTr] = useState(0.4), [off, setOff] = useState(false);
  const raw = z.map((e, i) => tr * (i / 12) + amp * Math.sin((2 * Math.PI * i) / 12) + 0.4 * e);
  const mm = Array.from({ length: 12 }, (_, m) => { const v = raw.filter((_, i) => i % 12 === m); return v.reduce((s, x) => s + x, 0) / v.length; }), mean = raw.reduce((s, x) => s + x, 0) / raw.length;
  const y = off ? raw.map((v, i) => v - mm[i % 12] + mean) : raw, [lo, hi] = ext(raw), W = 360, H = 130, X = (i) => 12 + (i / 119) * (W - 24), Y = (v) => H - 10 - ((v - lo) / (hi - lo || 1)) * (H - 20), o = ols(y.map((_, i) => i / 12), y);
  return (<div className="lw">
    <svg viewBox={`0 0 ${W} ${H}`} className="lw-svg"><polyline points={line(y, X, Y)} fill="none" stroke={off ? '#0c5a43' : '#1e3a8a'} strokeWidth="1.8" /></svg>
    <Row label={L('Fuerza del ciclo anual', 'Strength of the yearly cycle')}><Slider color="navy" min={0} max={4} step={0.1} value={amp} onChange={setAmp} /></Row>
    <Row label={L('Tendencia real por año', 'Real trend per year')}><Slider color="forest" min={0} max={1} step={0.05} value={tr} onChange={setTr} label={(v) => v.toFixed(2)} /></Row>
    <Switch color="forest" checked={off} onChange={(e) => setOff(e.currentTarget.checked)} label={L('Quitar la estación (restar el promedio de cada mes)', 'Remove the season (subtract each month’s average)')} mt={8} />
    <p className="lw-res ok">{L('Pendiente que se ve', 'Slope you see')}: <b>{o.slope.toFixed(2)} {L('por año', 'per year')}</b> · {L('la real es', 'the real one is')} {tr.toFixed(2)}</p>
    <button className="textlink" onClick={() => setSeed(seed + 1)}>{L('Otro ruido', 'Another noise')}</button>
  </div>);
}

/* 3. Valor p y falsas alarmas */
export function AlarmWidget({ L, es }) {
  const [r, setR] = useState(null), [places, setPlaces] = useState(30);
  const run = () => { let c = 0; const N = 200; for (let k = 0; k < N; k++) if (mannKendall(normals(40)).p < 0.05) c++; setR({ c, N }); };
  return (<div className="lw">
    <Button color="forest" onClick={run}>{L('Generar 200 series de puro ruido y probarlas', 'Generate 200 pure-noise series and test them')}</Button>
    {r && <><div className="lw-bar"><i style={{ width: `${(r.c / r.N) * 100}%` }} /></div>
      <p className="lw-res no"><b>{r.c} {L('de', 'of')} {r.N}</b> {L(`series SIN tendencia dieron alarma (${((r.c / r.N) * 100).toFixed(1).replace('.', es ? ',' : '.')} %). Con p < 0,05 se espera cerca de 5 %.`, `series with NO trend raised an alarm (${((r.c / r.N) * 100).toFixed(1)} %). With p < 0.05 about 5 % is expected.`)}</p></>}
    <Row label={L('Si miras muchos lugares a la vez…', 'If you look at many places at once…')}><Slider color="navy" min={1} max={60} step={1} value={places} onChange={setPlaces} /></Row>
    <p className="lw-res ok">{L(`En ${places} lugares sin cambio real esperas unas ${(places * 0.05).toFixed(1).replace('.', ',')} falsas alarmas. Por eso Explorar usa un control de falsos descubrimientos (FDR).`, `In ${places} places with no real change you expect about ${(places * 0.05).toFixed(1)} false alarms. That is why Explore uses false-discovery-rate (FDR) control.`)}</p>
  </div>);
}

/* 4. Intervalos y cobertura */
const ZS = { 80: 1.2816, 90: 1.6449, 95: 1.96 };
export function CoverWidget({ L }) {
  const [lvl, setLvl] = useState('90'), [seed, setSeed] = useState(0);
  const iv = useMemo(() => Array.from({ length: 30 }, () => { const m = normals(10).reduce((s, x) => s + x, 0) / 10; return m; }), [seed]); // eslint-disable-line
  const h = ZS[lvl] / Math.sqrt(10), cov = iv.filter((m) => Math.abs(m) <= h).length, W = 360, S = 90, X = (v) => W / 2 + v * S;
  return (<div className="lw">
    <SegmentedControl size="xs" value={lvl} onChange={setLvl} data={[{ value: '80', label: '80 %' }, { value: '90', label: '90 %' }, { value: '95', label: '95 %' }]} />
    <svg viewBox={`0 0 ${W} 190`} className="lw-svg"><line x1={X(0)} x2={X(0)} y1="4" y2="186" stroke="#14213d" strokeDasharray="4 4" />
      {iv.map((m, i) => { const ok = Math.abs(m) <= h; return <line key={i} x1={X(m - h)} x2={X(m + h)} y1={10 + i * 6} y2={10 + i * 6} stroke={ok ? '#0c7a5b' : '#b91c1c'} strokeWidth="3" strokeLinecap="round" />; })}</svg>
    <p className="lw-res ok"><b>{cov} {L('de 30', 'of 30')}</b> {L(`intervalos de ${lvl} % contienen el valor verdadero (línea punteada): ${Math.round((cov / 30) * 100)} %. En rojo, los que fallan.`, `${lvl} % intervals contain the true value (dashed line): ${Math.round((cov / 30) * 100)} %. Failures in red.`)}</p>
    <p className="mini">{L('La app hace esta misma prueba con el pasaporte: compara el intervalo nominal del 90 % con la cobertura real de los últimos 5 años.', 'The app does this same test in the passport: it compares the nominal 90 % interval with the real coverage over the last 5 years.')}</p>
    <button className="textlink" onClick={() => setSeed(seed + 1)}>{L('Repetir el experimento', 'Repeat the experiment')}</button>
  </div>);
}

/* 5. Balance climático */
export function BalanceWidget({ L }) {
  const [p, setP] = useState(650), [e, setE] = useState(1400), wb = p - e, mx = 2000, W = 360;
  return (<div className="lw">
    <svg viewBox={`0 0 ${W} 110`} className="lw-svg">
      <rect x="70" y="10" width={(p / mx) * 270} height="22" rx="6" fill="#3b66d1" /><text x="64" y="26" textAnchor="end" fontSize="11" fill="#14213d">{L('Lluvia', 'Rain')}</text><text x={74 + (p / mx) * 270} y="26" fontSize="11" fill="#14213d">{p}</text>
      <rect x="70" y="42" width={(e / mx) * 270} height="22" rx="6" fill="#ea580c" /><text x="64" y="58" textAnchor="end" fontSize="11" fill="#14213d">{L('Evaporación', 'Evaporation')}</text><text x={74 + (e / mx) * 270} y="58" fontSize="11" fill="#14213d">{e}</text>
      <rect x="70" y="74" width={Math.min(270, (Math.abs(wb) / mx) * 270)} height="22" rx="6" fill={wb >= 0 ? '#0c7a5b' : '#b91c1c'} /><text x="64" y="90" textAnchor="end" fontSize="11" fill="#14213d">{L('Balance', 'Balance')}</text><text x={74 + Math.min(270, (Math.abs(wb) / mx) * 270)} y="90" fontSize="11" fill="#14213d">{wb > 0 ? '+' : ''}{wb}</text></svg>
    <Row label={L('Lluvia al año (mm)', 'Rain per year (mm)')}><Slider color="navy" min={0} max={mx} step={25} value={p} onChange={setP} /></Row>
    <Row label={L('Evaporación al año (mm)', 'Evaporation per year (mm)')}><Slider color="orange" min={0} max={mx} step={25} value={e} onChange={setE} /></Row>
    <p className={'lw-res ' + (wb >= 0 ? 'ok' : 'no')}>{wb >= 0 ? L('El clima de la zona aporta más agua de la que evapora.', 'The area’s climate adds more water than it evaporates.') : L(`El clima de la zona pierde unos ${-wb} mm al año.`, `The area’s climate loses about ${-wb} mm per year.`)} <b>{L('Pero esto no es el nivel del lago:', 'But this is not the lake level:')}</b> {L('el nivel también depende de ríos, agua subterránea, glaciares y de cuánta agua se extrae. Por eso la app lo llama “balance climático”.', 'the level also depends on rivers, groundwater, glaciers and how much water is withdrawn. That is why the app calls it “climate balance”.')}</p>
  </div>);
}

/* 6. Correlación no es causa */
export function SpuriousWidget({ L }) {
  const [seed, setSeed] = useState(0), [off, setOff] = useState(false), d = useMemo(() => ({ a: normals(40), b: normals(40), ta: 0.05 + Math.random() * 0.05, tb: 0.05 + Math.random() * 0.05 }), [seed]); // eslint-disable-line
  const ya = d.a.map((e, i) => d.ta * i + 0.5 * e), yb = d.b.map((e, i) => d.tb * i + 0.5 * e), x = ya.map((_, i) => i), oa = ols(x, ya), ob = ols(x, yb);
  const a = off ? ya.map((v, i) => v - oa.slope * i) : ya, b = off ? yb.map((v, i) => v - ob.slope * i) : yb, r = corr(a, b), all = [...a, ...b], [lo, hi] = ext(all), W = 360, H = 130, X = (i) => 12 + (i / 39) * (W - 24), Y = (v) => H - 10 - ((v - lo) / (hi - lo || 1)) * (H - 20);
  return (<div className="lw">
    <svg viewBox={`0 0 ${W} ${H}`} className="lw-svg"><polyline points={line(a, X, Y)} fill="none" stroke="#1e3a8a" strokeWidth="2" /><polyline points={line(b, X, Y)} fill="none" stroke="#ea580c" strokeWidth="2" /></svg>
    <Switch color="forest" checked={off} onChange={(e) => setOff(e.currentTarget.checked)} label={L('Quitar la tendencia de cada serie', 'Remove each series’ trend')} />
    <p className={'lw-res ' + (Math.abs(r) > 0.5 ? 'no' : 'ok')}>{L('Correlación', 'Correlation')} r = <b>{r.toFixed(2).replace('.', L(',', '.'))}</b>. {Math.abs(r) > 0.5 ? L('Parecen relacionadas, pero son dos series independientes: solo comparten que ambas suben.', 'They look related, but they are two independent series: they only share that both go up.') : L('Sin la tendencia, desaparece la “relación”: era un espejismo.', 'Without the trend the “relationship” disappears: it was a mirage.')}</p>
    <button className="textlink" onClick={() => setSeed(seed + 1)}>{L('Otro par de series', 'Another pair of series')}</button>
  </div>);
}
