import Interpret from '../../shared/Interpret';
import Ghost from '../../ui/Ghost';
import AutoExplain, { stats as seriesStats } from '../../shared/charts/AutoExplain';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button, Chip, RangeSlider, Select, SegmentedControl, Switch, Tooltip, Progress, Alert, Group, Tabs } from '@mantine/core';
import { IconWorld, IconCrystalBall, IconDownload, IconTrendingUp, IconTrendingDown, IconEqual, IconCheck, IconX, IconSearch, IconUpload, IconMessageQuestion, IconFolders, IconAdjustments, IconGauge, IconChartDots3, IconArrowsLeftRight, IconRadar2, IconFlask } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import * as S from '../../lib/analysis/stats';
import { V, KEYS, PLACES, power, demo, parseCsv, sourceOf } from '../../lib/nasa/data';
import { pearson } from '../../lib/analysis/viz';
import { useStore, placeLabel } from '../../core/store';
import { useT } from '../../core/i18n';
import BrushChart from './BrushChart';
import LinkedCharts from './LinkedCharts';
import Stripes from './Stripes';
import Heatmap from './Heatmap';
import Compare from './Compare';
import Questions from './Questions';
import CaseFiles from './CaseFiles';
import Wizard from './Wizard';
import PageHead from '../../layout/PageHead';
import SpotlightCard from '../../ui/SpotlightCard';
import CountUp from '../../ui/CountUp';
const Analytics = lazy(() => import('./Analytics'));
const Forecast = lazy(() => import('../../shared/analysis/Forecast'));
const Intel = lazy(() => import('../../shared/analysis/Intel'));
const Surface3D = lazy(() => import('./Analytics').then((m) => ({ default: m.Surface3D })));
const Planet2050 = lazy(() => import('../../shared/analysis/Planet2050'));
const COL = { strong: '#0c5a43', likely: '#1e3a8a', weak: '#d97706', none: '#868e96' };
const fmt = (x, d) => (Math.abs(x) < 0.001 && x !== 0 ? x.toExponential(1) : x.toFixed(d));
const fp = (p) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
export default function Lab() {
  const { t, lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { place, setPlace, job, practice } = useStore();
  const [start, setStart] = useState('guia');
  const [vars, setVars] = useState(['T2M', 'PRECTOTCORR', 'GWETROOT']);
  const [years, setYears] = useState([1981, 2025]); const [ds, setDs] = useState(true);
  const sec = useStore((s) => s.sec), secN = useStore((s) => s.secN);
  useEffect(() => { if (sec && sec.startsWith('lab:')) setTab(sec.slice(4)); }, [secN]); // eslint-disable-line
  const [busy, setBusy] = useState(false); const [res, setRes] = useState(null); const [sel, setSel] = useState(null); const [note, setNote] = useState(''); const [tab, setTab] = useState('resumen'); const [o3, setO3] = useState('none');
  const out = useRef(null);
  const placeData = PLACES.map((p) => ({ value: p.id, label: p[lang] })).concat(place.id === 'custom' ? [{ value: 'custom', label: placeLabel(place, PLACES, lang) }] : []);
  const run = async (o = {}) => {
    const vs = o.vars || vars, pl = o.place || place, yr = o.years || years, dsv = o.ds ?? ds; if (!vs.length) return;
    setBusy(true); setNote(''); setTab('resumen');
    setTimeout(() => out.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    let data, live = false;
    if (!useStore.getState().practice) { try { data = await power(pl.lat, pl.lon, vs, yr[0], yr[1]); live = Object.keys(data).length > 0; if (!live) throw new Error('empty'); } catch { setNote(t.liveFail); } }
    if (!live) data = demo(pl.lat, pl.lon, vs, yr[0], yr[1]);
    await new Promise((r) => setTimeout(r, 350));
    const list = [];
    for (const k of vs) { if (!data[k]) continue; try { list.push({ k, r: S.analyze(data[k], { deseason: dsv }), raw: data[k] }); } catch { /* serie corta */ } }
    list.sort((a, b) => b.r.count - a.r.count || a.r.p - b.r.p);
    setRes({ list, live, pl }); setSel(list[0]?.k); setBusy(false);
    if (list[0]?.r.level === 'strong') setTimeout(() => confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 }, colors: ['#0c5a43', '#1e3a8a', '#34d399', '#f59e0b'] }), 200);
  };
  useEffect(() => { if (job) { setVars(job.vars); run({ vars: job.vars, place: useStore.getState().place }); } }, [job?.n]);
  const onCsv = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; const pts = parseCsv(await file.text());
    if (pts.length < 24) { setNote(L('El archivo necesita al menos 24 meses con fecha (AAAA-MM) y valor.', 'The file needs at least 24 months with date (YYYY-MM) and value.')); return; }
    const r = S.analyze(pts, { deseason: ds }); setNote(''); setTab('resumen'); setRes({ list: [{ k: 'CSV', r, raw: pts }], live: true, pl: { id: 'csv', lat: 0, lon: 0, name: file.name } }); setSel('CSV');
    setTimeout(() => out.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const cur = res?.list.find((x) => x.k === sel);
  const csv = () => { if (!cur) return; const rows = ['year,month,value,anomaly', ...cur.raw.map((p, i) => `${p.year},${p.month + 1},${p.v},${cur.r.y[i]}`)]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = `${cur.k}.csv`; a.click(); };
  const pname = (pl) => (pl.id === 'csv' ? pl.name : placeLabel(pl, PLACES, lang));
  return (
    <section id="lab"><div className="wrap">
      <PageHead icon={IconFlask} eyebrow={L('Laboratorio del detective', 'Detective lab')} title={L('Investiga un lugar paso a paso', 'Investigate a place step by step')} sub={L('Elige cómo empezar. Siempre terminas con lo mismo: qué cambia, cuánto cambia y si el cambio es significativo.', 'Choose how to start. You always end with the same: what changes, how much, and whether the change is significant.')} />
      <div className="card panel startcard"><Ghost k="flask" i={1} size={210} pos={0} />
        <SegmentedControl fullWidth color="forest" value={start} onChange={setStart} data={[
          { value: 'guia', label: <span className="seg"><IconMessageQuestion size={16} />{L('Preguntas guiadas', 'Guided questions')}</span> },
          { value: 'casos', label: <span className="seg"><IconFolders size={16} />{L('Casos de ejemplo', 'Example cases')}</span> },
          { value: 'manual', label: <span className="seg"><IconAdjustments size={16} />{L('Paso a paso', 'Step by step')}</span> }]} />
        <AnimatePresence mode="wait">
          <motion.div key={start} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 14 }}>
            {start === 'guia' && <Questions />}
            {start === 'casos' && <CaseFiles />}
            {start === 'manual' && (<>
              <Wizard busy={busy} defaults={{ vars, years, ds }} onRun={(o) => { setPlace(o.place); setVars(o.vars); setYears(o.years); setDs(o.ds); run(o); }} />
              <label className="textlink" style={{ marginTop: 10 }}><IconUpload size={14} /> {L('¿Ya tienes una serie? Súbela en CSV (Giovanni, AppEEARS, Data Rods, CDO, KNMI, SWOT o DAHITI)', 'Already have a series? Upload it as CSV (Giovanni, AppEEARS, Data Rods, CDO, KNMI, SWOT or DAHITI)')}<input type="file" accept=".csv,.txt" hidden onChange={onCsv} /></label>
            </>)}
          </motion.div>
        </AnimatePresence>
      </div>
      <div ref={out} style={{ scrollMarginTop: 90, marginTop: 16 }}>
        {busy && <div className="card panel scan"><div className="scanline" /><p className="sub" style={{ margin: '0 auto' }}>{t.running}</p></div>}
        {note && !busy && <Alert mb="sm" color="orange" radius="lg">{note}</Alert>}
        {res && cur && !busy && (
          <motion.div key={res.pl.lat + '_' + res.list.length + res.live} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            {!res.live && !note && <Alert mb="sm" color="blue" radius="lg">{L('Modo práctica: datos simulados. Apaga “Práctica” en la barra superior para usar NASA POWER.', 'Practice mode: simulated data. Turn off “Practice” in the top bar to use NASA POWER.')}</Alert>}
            <div className="glass verdict">
              <div className="vbadge" style={{ background: COL[cur.r.level] }}>{cur.r.level === 'none' ? <IconEqual /> : cur.r.dir > 0 ? <IconTrendingUp /> : <IconTrendingDown />}</div>
              <div className="vtext">
                <span className="mini">{pname(res.pl)} · {V[cur.k][lang][0]} · {L('fuente', 'source')}: {sourceOf(cur.k)}</span>
                <div className="big">{t.verdicts[cur.r.level]}</div>
                <div className="bignum"><span className="num"><CountUp key={cur.k} to={Math.abs(cur.r.perDec)} decimals={V[cur.k].d} duration={1.1} /></span> <span className="unit">{V[cur.k].u} {t.per} {cur.r.dir > 0 ? <IconTrendingUp size={16} style={{ verticalAlign: '-3px' }} /> : <IconTrendingDown size={16} style={{ verticalAlign: '-3px' }} />}</span></div>
                <small className="mini" style={{ display: 'block' }}>{L('Pendiente de Sen sobre la serie mensual sin estación', 'Sen slope on the monthly deseasonalised series')}, {Math.floor(cur.r.x[0])}–{Math.floor(cur.r.x[cur.r.n - 1])}.</small>
                <div>{t.lvlText[cur.r.level]}</div>
                <Progress mt="sm" value={(cur.r.count / 3) * 100} styles={{ section: { background: COL[cur.r.level] } }} />
              </div>
            </div>
            {res.list.length > 1 && (
              <div className="varpick">
                {res.list.map(({ k, r }) => (
                  <motion.button key={k} whileHover={{ y: -2 }} className={'vchip' + (k === sel ? ' on' : '')} onClick={() => setSel(k)}>
                    <b>{V[k][lang][0]}</b><span>{r.dir > 0 ? '+' : '−'}{Math.abs(r.perDec).toFixed(V[k].d)} {V[k].u} · {r.count}/3</span><i style={{ background: COL[r.level] }} />
                  </motion.button>
                ))}
              </div>
            )}
            <div className="card panel" style={{ marginTop: 12 }}>
              <Tabs value={tab} onChange={(v) => { setTab(v); useStore.getState().setSec('lab:' + v); }} color="forest" variant="pills" keepMounted={false}>
                <Tabs.List grow>
                  <Tabs.Tab value="resumen" leftSection={<IconGauge size={16} />}>{L('Resumen', 'Summary')}</Tabs.Tab>
                  <Tabs.Tab value="avanzado" leftSection={<IconChartDots3 size={16} />}>{L('Series de tiempo', 'Time series')}</Tabs.Tab>
                  <Tabs.Tab value="pred" leftSection={<IconCrystalBall size={16} />}>{L('Predicción', 'Forecast')}</Tabs.Tab>
                  <Tabs.Tab value="intel" leftSection={<IconRadar2 size={16} />}>{L('Anomalías y alertas', 'Anomalies and alerts')}</Tabs.Tab>
                  <Tabs.Tab value="comparar" leftSection={<IconArrowsLeftRight size={16} />}>{L('Comparar', 'Compare')}</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="resumen" pt="md">
                  <BrushChart r={cur.r} unit={V[cur.k].u} dec={V[cur.k].d} />
                  <Interpret title={`${V[cur.k][lang][0]} (${V[cur.k].u})`} facts={`${V[cur.k][lang][0]} en ${pname(res.pl)}; ${cur.r.n} datos de ${Math.round(cur.r.x[0])} a ${Math.round(cur.r.x[cur.r.n - 1])}; cambio estimado ${fmt(cur.r.sen.slope * 10, V[cur.k].d)} ${V[cur.k].u} por década; intervalo 95% [${fmt(cur.r.sen.ci[0] * 10, V[cur.k].d)}, ${fmt(cur.r.sen.ci[1] * 10, V[cur.k].d)}]; pruebas: ${cur.r.tests.map((x) => t.testNames[x.id] + ' p=' + (isNaN(x.p) ? 'n/d' : x.p.toFixed(4)) + (x.sig ? ' (significativa)' : ' (no significativa)')).join(', ')}; autocorrelación ${cur.r.tfpw.r1.toFixed(2)}`} how={L('Cómo se lee: cada punto es un mes; la línea es la tendencia. Arrastra la franja de abajo para mirar otro periodo.', 'How to read it: each dot is a month; the line is the trend. Drag the lower strip to look at another period.')} plain={cur.r.tests.some((x) => x.sig) ? L('Qué dice aquí: al menos una prueba estadística indica que el cambio es real y no azar.', 'What it says here: at least one statistical test indicates the change is real, not chance.') : L('Qué dice aquí: ninguna prueba muestra un cambio claro; puede ser solo variación natural.', 'What it says here: no test shows a clear change; it may be natural variation.')} next={L('Cambia el periodo con la franja inferior y mira si la tendencia se mantiene; luego abre Análisis avanzado.', 'Change the period with the bottom strip and see whether the trend holds; then open Advanced analysis.')} />
                  <div className="tests">
                    {cur.r.tests.map((x) => (
                      <SpotlightCard key={x.id} theme="light" className="test">
                        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><b style={{ fontSize: 14 }}>{t.testNames[x.id]}</b>{x.sig ? <IconCheck color="#0c5a43" /> : <IconX color="#868e96" />}</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: x.sig ? '#0c5a43' : '#868e96' }}>{isNaN(x.p) ? '—' : fp(x.p)}</div>
                        <div className="mini">{t.pval} · {x.sig ? t.agrees : t.noAgree}</div>
                      </SpotlightCard>
                    ))}
                    <SpotlightCard theme="light" className="test"><b style={{ fontSize: 14 }}>{t.ci}</b><div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>[{fmt(cur.r.sen.ci[0] * 10, V[cur.k].d)}, {fmt(cur.r.sen.ci[1] * 10, V[cur.k].d)}]</div><div className="mini">{V[cur.k].u} {t.per} · {cur.r.sen.ci[0] * cur.r.sen.ci[1] > 0 ? L('no incluye 0', 'excludes 0') : L('incluye 0', 'includes 0')}</div></SpotlightCard>
                    <SpotlightCard theme="light" className="test"><b style={{ fontSize: 14 }}>{t.change}</b><div className="mini" style={{ marginTop: 4 }}>{cur.r.pettitt?.sig ? t.changeText(cur.r.pettitt.year, cur.r.pettitt.before.toFixed(V[cur.k].d), cur.r.pettitt.after.toFixed(V[cur.k].d), V[cur.k].u) : t.noChange}</div></SpotlightCard>
                    <SpotlightCard theme="light" className="test"><b style={{ fontSize: 14 }}>{t.autocorr}</b><div style={{ fontSize: 20, fontWeight: 800 }}>{cur.r.tfpw.r1.toFixed(2)}</div><div className="mini">{cur.r.tfpw.applied ? t.autoApplied : t.autoOk}</div></SpotlightCard>
                  </div>
                  <p className="mini">{t.pHelp} {t.ciHelp}</p>
                  <div className="row" style={{ justifyContent: 'space-between' }}><span className="mini">{t.disclaimer}</span><button className="textlink" onClick={csv}><IconDownload size={14} /> {t.exportCsv}</button></div>
                </Tabs.Panel>
                <Tabs.Panel value="avanzado" pt="md"><Suspense fallback={null}><Analytics cur={cur} res={res} /></Suspense></Tabs.Panel>
                <Tabs.Panel value="pred" pt="md">{cur.raw.length < 72 ? <Alert radius="lg" color="gray">{L('Se necesitan al menos 6 años de datos mensuales.', 'At least 6 years of monthly data are needed.')}</Alert> : <Suspense fallback={null}><Forecast cur={cur} pname={pname(res.pl)} /></Suspense>}</Tabs.Panel>
                <Tabs.Panel value="intel" pt="md"><Suspense fallback={null}><Intel cur={cur} res={res} pname={pname(res.pl)} /></Suspense></Tabs.Panel>
                <Tabs.Panel value="comparar" pt="md">
                  {res.list.length > 1 && (<>
                    <h4 className="sh">{L('Todas tus variables, con zoom sincronizado', 'All your variables, with synchronized zoom')}</h4>
                    <LinkedCharts list={res.list} />
                    <AutoExplain title={L('Todas tus variables con zoom sincronizado', 'All your variables with synchronized zoom')} facts={res.list.map((x) => seriesStats(V[x.k][lang][0] + ' (' + V[x.k].u + ')', x.r.x, x.r.y)).join('\n')} />
                    <h4 className="sh">{L('¿Qué variables se mueven junto con', 'Which variables move together with')} {V[cur.k][lang][0].toLowerCase()}?</h4>
                    {res.list.filter((x) => x.k !== cur.k).map((x) => { const c = pearson(cur.r.y, x.r.y); return (
                      <div key={x.k} className="row" style={{ marginBottom: 6, flexWrap: 'nowrap' }}>
                        <span style={{ width: 170, fontSize: 13 }}>{V[x.k][lang][0]}</span>
                        <div style={{ flex: 1, height: 10, background: 'var(--track)', borderRadius: 6, position: 'relative' }}><motion.div initial={{ width: 0 }} animate={{ width: `${Math.abs(c) * 50}%` }} style={{ position: 'absolute', height: '100%', borderRadius: 6, background: c >= 0 ? '#0c5a43' : '#c2410c', left: c >= 0 ? '50%' : `${50 - Math.abs(c) * 50}%` }} /></div>
                        <b style={{ width: 44, fontSize: 13, textAlign: 'right' }}>{c.toFixed(2)}</b>
                      </div>); })}
                    <p className="mini">{t.corrHelp}</p>
                  </>)}
                  {cur.r.annual && (
                    <div className="two">
                      <div><h4 className="sh">{t.stripesTitle}</h4><Stripes vals={cur.r.annual.y} years={cur.r.annual.years} k={cur.k} dec={V[cur.k].d} unit={V[cur.k].u} /><p className="mini">{t.stripesHelp}</p><AutoExplain title={t.stripesTitle} kind="warming-stripes" facts={seriesStats(V[cur.k][lang][0] + ' (annual means, one stripe per year)', cur.r.annual.years, cur.r.annual.y)} /></div>
                      <div><h4 className="sh">{t.heatTitle}</h4><Heatmap pts={cur.raw} k={cur.k} unit={V[cur.k].u} dec={V[cur.k].d} /><p className="mini">{t.heatHelp}</p><AutoExplain title={t.heatTitle} kind="year-by-month heatmap" facts={seriesStats(V[cur.k][lang][0] + ' (monthly values, rows = years, columns = months)', cur.raw.map((p) => p.year + '-' + p.month), cur.raw.map((p) => p.v))} /></div>
                    </div>
                  )}
                  {cur.k !== 'CSV' && <Compare key={cur.k} k={cur.k} a={cur.r} aName={pname(res.pl)} years={years} ds={ds} live={res.live} />}
                </Tabs.Panel>
              </Tabs>
            </div>
            <div className="card panel opt3d">
              <div className="opt3d-h"><span className="opt3d-t"><IconWorld size={18} />{L('Opcional · vistas en 3D', 'Optional · 3D views')}</span><span className="mini">{L('Complementan el análisis de arriba; no hace falta abrirlas.', 'They complement the analysis above; you do not need to open them.')}</span></div>
              <SegmentedControl color="navy" size="sm" value={o3} onChange={(v) => setO3(v === o3 ? 'none' : v)} data={[{ value: 'none', label: L('Ocultar', 'Hide') }, { value: 'planet', label: L('Planeta 3D · 2050', '3D planet · 2050') }, { value: 'surface', label: L('Superficie 3D año × mes', '3D surface year × month') }]} />
              {o3 === 'planet' && <div style={{ marginTop: 14 }}><Suspense fallback={null}><Planet2050 cur={cur} res={res} pname={pname(res.pl)} L={L} lang={lang} /></Suspense></div>}
              {o3 === 'surface' && <div style={{ marginTop: 14 }}><h4 className="sh">{L('Superficie 3D año × mes: gira con el ratón', '3D surface year × month: drag to rotate')}</h4><Suspense fallback={null}><Surface3D cur={cur} /></Suspense></div>}
            </div>
          </motion.div>
        )}
      </div>
    </div></section>
  );
}
