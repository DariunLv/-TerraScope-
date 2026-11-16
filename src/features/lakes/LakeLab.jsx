/* “Laboratorio del lago”: herramientas nuevas solo para lagos.
   - Código de barras del agua: un año = una franja de color (seco → húmedo), toca un año para ver su historia.
   - Pulso vital: cuatro signos vitales de los últimos 12 meses frente a lo normal del propio lago.
   - Estaciones antes y ahora: cómo cambió el ciclo de lluvia, evaporación y balance entre 1981-90 y los últimos 10 años.
   - Lagos gemelos: los lagos más parecidos (altitud, tamaño, clima) y qué les pasó. */
import { useEffect, useMemo, useState } from 'react';
import { Loader, Alert, Button } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconDroplet, IconThermometer, IconSun, IconScale, IconArrowRight } from '@tabler/icons-react';
import * as S from '../../lib/analysis/stats';
import { lakeClimate, last12 } from './lakeclim';
import { km, TYPES } from './lakesData';
import { useStore } from '../../core/store';
import Interpret from '../../shared/Interpret';
import { KillaNote } from '../../killa/Killa';
import { EChart } from '../../shared/charts/hooks';
import { MES } from '../../shared/analysis/Intel';
const Wait = () => <div style={{ padding: 30, textAlign: 'center' }}><Loader size="sm" color="forest" /></div>;
const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)) || 1e-9; };
const ramp = (t) => { /* 0 = muy seco (rojo ladrillo), 1 = muy húmedo (azul) */ const c = [[165, 42, 28], [225, 140, 70], [245, 235, 215], [120, 175, 215], [25, 80, 160]], x = Math.max(0, Math.min(0.9999, t)) * 4, i = Math.floor(x), f = x - i; return `rgb(${[0, 1, 2].map((k) => Math.round(c[i][k] + (c[i + 1][k] - c[i][k]) * f)).join(',')})`; };

function Stripes({ lake, clim, L, lang }) {
  const ann = clim.ann, wb = ann.map((a) => a.wb), m = mean(wb), s = sd(wb), z = wb.map((v) => (v - m) / s);
  const [sel, setSel] = useState(ann.length - 1);
  const a = ann[Math.min(sel, ann.length - 1)], zz = z[Math.min(sel, ann.length - 1)];
  const rank = [...wb].sort((x, y) => x - y).indexOf(a.wb) + 1, dry = ann.reduce((p, q) => (q.wb < p.wb ? q : p)), wet = ann.reduce((p, q) => (q.wb > p.wb ? q : p));
  const recentDry = ann.slice(-10).filter((q) => q.wb < m - 0.5 * s).length, firstDry = ann.slice(0, 10).filter((q) => q.wb < m - 0.5 * s).length;
  const word = zz < -1.2 ? L('muy seco', 'very dry') : zz < -0.4 ? L('algo seco', 'somewhat dry') : zz > 1.2 ? L('muy húmedo', 'very wet') : zz > 0.4 ? L('algo húmedo', 'somewhat wet') : L('normal', 'normal');
  const reading = L(`Cada franja es un año de ${lake.name}: rojo si hubo más evaporación que lluvia de lo normal, azul si sobró agua. Elegiste ${a.year}: balance de ${Math.round(a.wb)} mm, un año ${word} (puesto ${rank} de ${ann.length} del más seco al más húmedo). El año más seco fue ${dry.year} (${Math.round(dry.wb)} mm) y el más húmedo ${wet.year} (${Math.round(wet.wb)} mm). En los primeros 10 años hubo ${firstDry} años secos y en los últimos 10, ${recentDry}.`,
    `Each stripe is one year of ${lake.name}: red when evaporation beat rain more than usual, blue when water was left over. You picked ${a.year}: a balance of ${Math.round(a.wb)} mm, a ${word} year (rank ${rank} of ${ann.length} from driest to wettest). The driest year was ${dry.year} (${Math.round(dry.wb)} mm) and the wettest ${wet.year} (${Math.round(wet.wb)} mm). In the first 10 years there were ${firstDry} dry years and in the last 10, ${recentDry}.`);
  return (<>
    <p className="sub">{L('El “código de barras” del agua: cada franja es un año. Toca una para ver su historia.', 'The water “barcode”: each stripe is one year. Tap one to see its story.')}</p>
    <div className="stripes" role="list">{ann.map((q, i) => <button key={q.year} role="listitem" className={i === sel ? 'on' : ''} style={{ background: ramp(0.5 + z[i] / 4) }} onClick={() => setSel(i)} title={`${q.year}: ${Math.round(q.wb)} mm`} aria-label={`${q.year}`} />)}</div>
    <div className="stripes-ax"><span>{ann[0].year}</span><span>{L('seco', 'dry')} <i style={{ background: 'linear-gradient(90deg,#a52a1c,#f5ebd7,#1950a0)' }} /> {L('húmedo', 'wet')}</span><span>{ann[ann.length - 1].year}</span></div>
    <div className="kpis" style={{ marginTop: 12 }}>
      <div className="kpi"><span>{L('Año elegido', 'Chosen year')}</span><b>{a.year}</b></div><div className="kpi"><span>{L('Lluvia', 'Rain')}</span><b>{Math.round(a.p)} mm</b></div>
      <div className="kpi"><span>{L('Evaporación', 'Evaporation')}</span><b>{Math.round(a.e)} mm</b></div><div className="kpi"><span>{L('Balance', 'Balance')}</span><b style={{ color: a.wb < m ? '#c2410c' : '#1e40af' }}>{Math.round(a.wb)} mm</b></div>
    </div>
    <KillaNote estado={zz < -0.4 ? 'alerta' : 'ensenando'} size={96} title={L('Killa lo cuenta así', 'Killa tells it like this')}>{reading}</KillaNote>
    <Interpret title={L('Código de barras del agua de ', 'Water barcode of ') + lake.name} facts={`${lake.name}; yearly water balance (rain minus evaporation, mm) ${ann[0].year}-${ann[ann.length - 1].year}; mean ${Math.round(m)}; driest ${dry.year} ${Math.round(dry.wb)}; wettest ${wet.year} ${Math.round(wet.wb)}; chosen ${a.year} ${Math.round(a.wb)}; dry years in first 10: ${firstDry}; in last 10: ${recentDry}`} plain={reading} how={L('Rojo = año más seco que lo normal; azul = más húmedo.', 'Red = drier than normal; blue = wetter.')} />
  </>);
}

function Pulse({ lake, clim, L, lang }) {
  const P = last12(clim.d.PRECTOTCORR.map((p) => ({ ...p, v: p.v })), 'mean'), T = last12(clim.d.T2M, 'mean'), E = last12(clim.d.EVLAND, 'mean'), W = last12(clim.wb, 'sum');
  if (!P || !T || !E || !W) return <Alert radius="lg" color="gray">{L('Hacen falta más años de datos.', 'More years of data are needed.')}</Alert>;
  const items = [[L('Lluvia', 'Rain'), P.z, IconDroplet, '#2563eb'], [L('Temperatura', 'Temperature'), T.z, IconThermometer, '#c2410c'], [L('Evaporación', 'Evaporation'), E.z, IconSun, '#d97706'], [L('Balance de agua', 'Water balance'), W.z, IconScale, '#0c5a43']];
  const stress = Math.max(0, -W.z) + Math.max(0, T.z) * 0.5 + Math.max(0, E.z) * 0.5, score = Math.round(Math.max(0, Math.min(100, 100 - stress * 22)));
  const lvl = score >= 70 ? L('estable', 'stable') : score >= 45 ? L('a vigilar', 'to watch') : L('bajo presión', 'under pressure');
  const o = { textStyle: { color: '#5b6b8c' }, radar: { radius: '68%', indicator: items.map(([n]) => ({ name: n, min: -3, max: 3 })), axisName: { color: '#33415c', fontWeight: 700 }, splitArea: { areaStyle: { color: ['rgba(37,99,235,.04)', 'rgba(37,99,235,.09)'] } } }, tooltip: {},
    series: [{ type: 'radar', data: [{ value: items.map((x) => Math.max(-3, Math.min(3, +x[1].toFixed(2)))), name: L('Últimos 12 meses', 'Last 12 months'), areaStyle: { color: 'rgba(232,89,12,.28)' }, lineStyle: { color: '#e8590c', width: 3 }, itemStyle: { color: '#e8590c' } }, { value: [0, 0, 0, 0], name: L('Lo normal', 'Normal'), lineStyle: { color: '#64748b', type: 'dashed' }, itemStyle: { color: '#64748b' }, symbol: 'none' }] }], legend: { bottom: 0, textStyle: { color: '#5b6b8c' } } };
  const txt = (z) => (Math.abs(z) < 0.5 ? L('normal', 'normal') : `${z > 0 ? L('por encima', 'above') : L('por debajo', 'below')} (${z > 0 ? '+' : ''}${z.toFixed(1)})`);
  const reading = L(`El pulso de ${lake.name} es ${score} de 100 (${lvl}). En los últimos 12 meses la lluvia está ${txt(P.z)}, la temperatura ${txt(T.z)}, la evaporación ${txt(E.z)} y el balance de agua ${txt(W.z)} respecto de lo normal de este lago. Las cifras entre paréntesis son desviaciones: 0 es normal, más de 2 o menos de −2 es raro.`,
    `The pulse of ${lake.name} is ${score} out of 100 (${lvl}). Over the last 12 months rain is ${txt(P.z)}, temperature ${txt(T.z)}, evaporation ${txt(E.z)} and water balance ${txt(W.z)} compared with what is normal for this lake. The numbers in brackets are deviations: 0 is normal, beyond 2 or below −2 is unusual.`);
  return (<>
    <p className="sub">{L('Cuatro signos vitales del lago, como el pulso y la fiebre de una persona: cuánto se alejan de lo normal en los últimos 12 meses.', 'Four vital signs of the lake, like a person’s pulse and fever: how far they are from normal over the last 12 months.')}</p>
    <div className="two">
      <div><EChart option={o} deps={[lake.id, lang]} h={320} /></div>
      <div className="pulse"><motion.div className="pulse-ring" style={{ '--p': score }} initial={{ scale: 0.9 }} animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}><b>{score}</b><span>/100</span></motion.div><h4>{lvl}</h4>
        {items.map(([n, z, I, c]) => <div key={n} className="pulse-row"><I size={16} color={c} /><span>{n}</span><i><u style={{ left: `${50 + Math.max(-3, Math.min(3, z)) * 16.6}%`, background: c }} /></i><b>{z > 0 ? '+' : ''}{z.toFixed(1)}</b></div>)}</div>
    </div>
    <KillaNote estado={score < 45 ? 'alerta' : 'ensenando'} size={96} title={L('Lectura de Killa', 'Killa’s reading')}>{reading}</KillaNote>
    <Interpret title={L('Pulso vital de ', 'Vital signs of ') + lake.name} facts={`${lake.name}; vitality ${score}/100 (${lvl}); z last 12 months vs own normal: rain ${P.z.toFixed(2)}, temperature ${T.z.toFixed(2)}, evaporation ${E.z.toFixed(2)}, water balance ${W.z.toFixed(2)}`} plain={reading} />
  </>);
}

function Seasons({ lake, clim, L, lang }) {
  const by = (pts, a, b) => Array.from({ length: 12 }, (_, m) => { const v = pts.filter((p) => p.month === m && p.year >= a && p.year <= b).map((p) => p.v); return mean(v); });
  const y1 = clim.wb[clim.wb.length - 1].year, e0 = clim.wb[0].year, d = (key) => ({ old: by(clim.wb.map((p) => ({ ...p, v: p[key] })), e0, e0 + 9), now: by(clim.wb.map((p) => ({ ...p, v: p[key] })), y1 - 9, y1) });
  const R = d('p'), E = d('e'), B = d('v'), diff = B.now.map((v, i) => v - B.old[i]), worst = diff.indexOf(Math.min(...diff)), best = diff.indexOf(Math.max(...diff));
  const [k, setK] = useState('v'); const D = { p: R, e: E, v: B }[k], N = { p: L('Lluvia', 'Rain'), e: L('Evaporación', 'Evaporation'), v: L('Balance', 'Balance') }[k];
  const o = { animationDuration: 600, textStyle: { color: '#5b6b8c' }, legend: { top: 0, textStyle: { color: '#5b6b8c' } }, grid: { left: 50, right: 14, top: 34, bottom: 28 }, tooltip: { trigger: 'axis', valueFormatter: (v) => `${Math.round(v)} mm` }, xAxis: { type: 'category', data: MES[lang] }, yAxis: { type: 'value', name: 'mm / ' + L('mes', 'month'), splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [{ name: `${e0}–${e0 + 9}`, type: 'line', smooth: true, data: D.old.map(Math.round), lineStyle: { color: '#94a3b8', width: 3 }, itemStyle: { color: '#94a3b8' }, areaStyle: { color: 'rgba(148,163,184,.12)' } }, { name: `${y1 - 9}–${y1}`, type: 'line', smooth: true, data: D.now.map(Math.round), lineStyle: { color: '#e8590c', width: 3 }, itemStyle: { color: '#e8590c' }, areaStyle: { color: 'rgba(232,89,12,.14)' } }] };
  const yr = (key) => mean(Object.values({ p: R, e: E, v: B }[key].now)) * 12 - mean(Object.values({ p: R, e: E, v: B }[key].old)) * 12;
  const reading = L(`Comparé los primeros 10 años (${e0}–${e0 + 9}) con los últimos 10 (${y1 - 9}–${y1}) de ${lake.name}. Por año, la lluvia cambió ${Math.round(yr('p'))} mm, la evaporación ${Math.round(yr('e'))} mm y el balance ${Math.round(yr('v'))} mm. El mes que más empeoró fue ${MES.es[worst]} (${Math.round(diff[worst])} mm al mes) y el que más mejoró ${MES.es[best]} (${Math.round(diff[best])} mm al mes).`,
    `I compared the first 10 years (${e0}–${e0 + 9}) with the last 10 (${y1 - 9}–${y1}) of ${lake.name}. Per year, rain changed ${Math.round(yr('p'))} mm, evaporation ${Math.round(yr('e'))} mm and balance ${Math.round(yr('v'))} mm. The month that worsened most was ${MES.en[worst]} (${Math.round(diff[worst])} mm per month) and the one that improved most ${MES.en[best]} (${Math.round(diff[best])} mm per month).`);
  return (<>
    <p className="sub">{L('¿Cambiaron las estaciones del lago? Compara cómo se reparte el agua en el año al inicio del registro y ahora.', 'Did the lake’s seasons change? Compares how water is spread through the year at the start of the record and now.')}</p>
    <div className="subtabs">{[['v', L('Balance', 'Balance')], ['p', L('Lluvia', 'Rain')], ['e', L('Evaporación', 'Evaporation')]].map(([v, l]) => <button key={v} className={k === v ? 'on' : ''} onClick={() => setK(v)}>{l}</button>)}</div>
    <EChart option={o} deps={[lake.id, k, lang]} h={300} />
    <KillaNote estado="ensenando" size={96} title={L('Lectura de Killa', 'Killa’s reading')}>{reading}</KillaNote>
    <Interpret title={`${N}: ${L('antes y ahora en', 'then and now at')} ${lake.name}`} facts={`${lake.name}; monthly ${N} mm, ${e0}-${e0 + 9} vs ${y1 - 9}-${y1}; yearly change rain ${Math.round(yr('p'))}, evaporation ${Math.round(yr('e'))}, balance ${Math.round(yr('v'))}; worst month ${MES.en[worst]} ${Math.round(diff[worst])}; best month ${MES.en[best]} ${Math.round(diff[best])}`} plain={reading} />
  </>);
}

function Twins({ lake, L, lang }) {
  const { lakes: LAKES, setLake } = useStore(), practice = useStore((s) => s.practice);
  const tw = useMemo(() => { const s = { alt: sd(LAKES.map((l) => l.alt)), ar: sd(LAKES.map((l) => Math.log10(l.area + 1))) }; return LAKES.filter((l) => l.id !== lake.id).map((l) => ({ l, dist: Math.hypot((l.alt - lake.alt) / s.alt, (Math.log10(l.area + 1) - Math.log10(lake.area + 1)) / s.ar, (l.type === lake.type ? 0 : 0.6)), km: km(l, lake) })).sort((a, b) => a.dist - b.dist).slice(0, 3); }, [lake.id, LAKES]);
  const [res, setRes] = useState(null);
  useEffect(() => { let dead = false; setRes(null); Promise.all([lake, ...tw.map((t) => t.l)].map((l) => lakeClimate(l, practice).then((c) => { const ann = c.ann, x = ann.map((a) => a.year), y = ann.map((a) => a.wb), mk = S.mannKendall(y), sl = S.senSlope(x, y, mk.varS).slope * 10; return { l, sl, p: mk.p, m: mean(y) }; }).catch(() => null))).then((r) => { if (!dead) setRes(r.filter(Boolean)); }); return () => { dead = true; }; }, [lake.id, practice]);
  const me = res?.find((item) => item.l.id === lake.id), others = res?.filter((item) => item.l.id !== lake.id) || [];
  const reading = me ? L(`${lake.name} (${lake.alt} m, ${lake.area} km²) tiene tres lagos gemelos por altitud, tamaño y tipo: ${tw.map((t) => t.l.name).join(', ')}. Su balance cambia ${Math.round(me.sl)} mm por década. ${others.length ? `Entre los gemelos va de ${Math.round(Math.min(...others.map((o) => o.sl)))} a ${Math.round(Math.max(...others.map((o) => o.sl)))} mm por década: ${others.every((o) => Math.sign(o.sl) === Math.sign(me.sl)) ? 'todos van en la misma dirección, así que es probable que sea algo regional.' : 'no todos van igual, así que lo local pesa.'}` : ''}`,
    `${lake.name} (${lake.alt} m, ${lake.area} km²) has three twin lakes by altitude, size and type: ${tw.map((t) => t.l.name).join(', ')}. Its balance changes ${Math.round(me.sl)} mm per decade. ${others.length ? `Among its twins it runs from ${Math.round(Math.min(...others.map((o) => o.sl)))} to ${Math.round(Math.max(...others.map((o) => o.sl)))} mm per decade: ${others.every((o) => Math.sign(o.sl) === Math.sign(me.sl)) ? 'all go the same way, so it is probably regional.' : 'they do not all go the same way, so local factors matter.'}` : ''}`) : '';
  if (res && !me) return <Alert color="orange">{L('No hay datos suficientes para este lago.', 'Not enough data for this lake.')}</Alert>;
  return (<>
    <p className="sub">{L('Los tres lagos más parecidos a este (altitud, tamaño y tipo) y cómo les va. Si todos cambian igual, el cambio es regional; si no, es local.', 'The three lakes most like this one (altitude, size and type) and how they are doing. If they all change alike the change is regional; if not, it is local.')}</p>
    {!res ? <Wait /> : (<>
      <div className="twins">{[{ l: lake, me: true, dist: 0, km: 0 }, ...tw].map((t, i) => { const r = res.find((x) => x.l.id === t.l.id); return (
        <motion.div key={t.l.id} className={'twin' + (t.me ? ' me' : '')} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <b>{t.l.name}</b><span className="stag" style={{ color: TYPES[t.l.type][2], borderColor: TYPES[t.l.type][2] }}>{TYPES[t.l.type][lang === 'es' ? 0 : 1]}</span>
          <small>{t.l.alt} m · {t.l.area} km²{!t.me && ` · ${Math.round(t.km)} km`}</small>
          {r && <div className="twin-v" style={{ color: r.sl < 0 ? '#c2410c' : '#1e40af' }}>{r.sl > 0 ? '+' : ''}{Math.round(r.sl)} <small>mm / {L('década', 'decade')}</small></div>}
          {!t.me && <Button size="compact-xs" variant="light" color="forest" rightSection={<IconArrowRight size={12} />} onClick={() => setLake(t.l.id)}>{L('Ver este lago', 'Open this lake')}</Button>}
        </motion.div>); })}</div>
      <KillaNote estado="ensenando" size={96} title={L('Lectura de Killa', 'Killa’s reading')}>{reading}</KillaNote>
      <Interpret title={L('Lagos gemelos de ', 'Twin lakes of ') + lake.name} facts={`${lake.name} balance trend ${Math.round(me?.sl ?? 0)} mm per decade; twins: ${others.map((o) => `${o.l.name} ${Math.round(o.sl)} mm per decade`).join('; ')}`} plain={reading} />
    </>)}
  </>);
}

export function LakeLab({ lake, L, lang }) {
  const practice = useStore((s) => s.practice), [clim, setClim] = useState(null), [t, setT] = useState('pulse');
  useEffect(() => { const controller = new AbortController(); setClim(null); lakeClimate(lake, practice, { signal: controller.signal }).then((c) => { if (!controller.signal.aborted) setClim(c); }).catch(() => { if (!controller.signal.aborted) setClim(false); }); return () => controller.abort(); }, [lake.id, lake.lat, lake.lon, practice]);
  const TABS = [['pulse', L('Pulso vital', 'Vital signs')], ['stripes', L('Código de barras', 'Water barcode')], ['seasons', L('Estaciones: antes y ahora', 'Seasons: then and now')], ['twins', L('Lagos gemelos', 'Twin lakes')]];
  return (<>
    <div className="subtabs">{TABS.map(([v, l]) => <button key={v} className={t === v ? 'on' : ''} onClick={() => setT(v)}>{l}</button>)}</div>
    <div style={{ paddingTop: 14 }}>
      {t === 'twins' ? <Twins lake={lake} L={L} lang={lang} /> : clim === false ? <Alert color="orange">{L('No hay datos suficientes. Reintenta o activa Práctica.', 'Not enough data. Retry or enable Practice.')}</Alert> : !clim ? <Wait /> : t === 'pulse' ? <Pulse lake={lake} clim={clim} L={L} lang={lang} /> : t === 'stripes' ? <Stripes lake={lake} clim={clim} L={L} lang={lang} /> : <Seasons lake={lake} clim={clim} L={L} lang={lang} />}
    </div>
  </>);
}
