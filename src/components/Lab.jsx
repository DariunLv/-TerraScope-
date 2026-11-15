import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button, Chip, RangeSlider, Select, SegmentedControl, Switch, Tooltip, Progress, Alert, Group, Tabs } from '@mantine/core';
import { IconDownload, IconTrendingUp, IconTrendingDown, IconEqual, IconCheck, IconX, IconSearch, IconUpload, IconMessageQuestion, IconFolders, IconAdjustments, IconGauge, IconChartDots3, IconArrowsLeftRight } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import * as S from '../lib/stats';
import { V, KEYS, PLACES, power, demo, parseCsv, sourceOf } from '../lib/data';
import { pearson } from '../lib/viz';
import { useStore, placeLabel } from '../store';
import { useT } from '../i18n';
import BrushChart from './BrushChart';
import LinkedCharts from './LinkedCharts';
import Stripes from './Stripes';
import Heatmap from './Heatmap';
import Compare from './Compare';
import Questions from './Questions';
import CaseFiles from './CaseFiles';
import SpotlightCard from '../rb/SpotlightCard';
import CountUp from '../rb/CountUp';
const Analytics = lazy(() => import('./Analytics'));
const COL = { strong: '#0c5a43', likely: '#1e3a8a', weak: '#d97706', none: '#868e96' };
const fmt = (x, d) => (Math.abs(x) < 0.001 && x !== 0 ? x.toExponential(1) : x.toFixed(d));
const fp = (p) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
const GROUPS = [['Temperatura', 'Temperature', ['T2M', 'T2M_MAX', 'T2M_MIN', 'TS', 'T2MDEW']], ['Agua', 'Water', ['PRECTOTCORR', 'EVLAND', 'RH2M', 'QV2M', 'GWETTOP', 'GWETROOT', 'GWETPROF']], ['Aire y energía', 'Air & energy', ['WS10M', 'PS', 'ALLSKY_SFC_SW_DWN', 'CLOUD_AMT']]];
export default function Lab() {
  const { t, lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { place, setPlace, job, practice } = useStore();
  const [start, setStart] = useState('guia');
  const [vars, setVars] = useState(['T2M', 'PRECTOTCORR', 'GWETROOT']);
  const [years, setYears] = useState([1981, 2025]); const [ds, setDs] = useState(true);
  const [busy, setBusy] = useState(false); const [res, setRes] = useState(null); const [sel, setSel] = useState(null); const [note, setNote] = useState(''); const [tab, setTab] = useState('resumen');
  const out = useRef(null);
  const placeData = PLACES.map((p) => ({ value: p.id, label: p[lang] })).concat(place.id === 'custom' ? [{ value: 'custom', label: placeLabel(place, PLACES, lang) }] : []);
  const run = async (o = {}) => {
    const vs = o.vars || vars, pl = o.place || place; if (!vs.length) return;
    setBusy(true); setNote(''); setTab('resumen');
    setTimeout(() => out.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    let data, live = false;
    if (!useStore.getState().practice) { try { data = await power(pl.lat, pl.lon, vs, years[0], years[1]); live = Object.keys(data).length > 0; if (!live) throw new Error('empty'); } catch { setNote(t.liveFail); } }
    if (!live) data = demo(pl.lat, pl.lon, vs, years[0], years[1]);
    await new Promise((r) => setTimeout(r, 350));
    const list = [];
    for (const k of vs) { if (!data[k]) continue; try { list.push({ k, r: S.analyze(data[k], { deseason: ds }), raw: data[k] }); } catch { /* serie corta */ } }
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
      <h2>{t.labTitle}</h2>
      <p className="sub">{L('Elige cómo quieres empezar. Al final siempre obtienes lo mismo: qué cambia, cuánto cambia y si el cambio es significativo.', 'Choose how to start. You always end with the same: what changes, how much, and whether the change is significant.')}</p>
      <div className="card panel startcard">
        <SegmentedControl fullWidth color="forest" value={start} onChange={setStart} data={[
          { value: 'guia', label: <span className="seg"><IconMessageQuestion size={16} />{L('Preguntas guiadas', 'Guided questions')}</span> },
          { value: 'casos', label: <span className="seg"><IconFolders size={16} />{L('Casos de ejemplo', 'Example cases')}</span> },
          { value: 'manual', label: <span className="seg"><IconAdjustments size={16} />{L('Elegir yo mismo', 'Choose myself')}</span> }]} />
        <AnimatePresence mode="wait">
          <motion.div key={start} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 14 }}>
            {start === 'guia' && <Questions />}
            {start === 'casos' && <CaseFiles />}
            {start === 'manual' && (
              <div className="form">
                <div className="frow"><label>{L('1. Lugar', '1. Place')}</label><div><Select searchable data={placeData} value={place.id} allowDeselect={false} onChange={(v) => { const p = PLACES.find((x) => x.id === v); if (p) setPlace({ id: p.id, lat: p.lat, lon: p.lon }); }} /><span className="mini">{L('También puedes elegirlo tocando el planeta o el mapa.', 'You can also pick it by tapping the planet or the map.')}</span></div></div>
                <div className="frow"><label>{L('2. Variables', '2. Variables')}</label><div>
                  <Chip.Group multiple value={vars} onChange={setVars}>
                    {GROUPS.map(([es, en, ks]) => <div key={es} className="vgroup"><span>{L(es, en)}</span><Group gap={6}>{ks.map((k) => <Tooltip key={k} label={V[k][lang][1]} multiline w={230} events={{ hover: true, focus: true, touch: true }}><Chip value={k} size="xs" color="forest">{V[k][lang][0]}</Chip></Tooltip>)}</Group></div>)}
                  </Chip.Group>
                  {!vars.length && <span className="mini" style={{ color: '#c2410c' }}>{t.pickHint}</span>}</div></div>
                <div className="frow"><label>{L('3. Años', '3. Years')}: {years[0]}–{years[1]}</label><div><RangeSlider color="forest" min={1981} max={2025} minRange={15} value={years} onChange={setYears} />
                  <Tooltip label={t.deseasonHelp} multiline w={240} events={{ hover: true, focus: true, touch: true }}><div style={{ marginTop: 14, width: 'fit-content' }}><Switch color="forest" checked={ds} onChange={(e) => setDs(e.currentTarget.checked)} label={t.deseason} /></div></Tooltip></div></div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                  <label className="textlink"><IconUpload size={14} /> {L('O sube tu propia serie (CSV de Giovanni, AppEEARS, CDO o KNMI)', 'Or upload your own series (CSV from Giovanni, AppEEARS, CDO or KNMI)')}<input type="file" accept=".csv,.txt" hidden onChange={onCsv} /></label>
                  <Button size="md" color="forest" loading={busy} leftSection={<IconSearch size={18} />} onClick={() => run()}>{t.run}</Button>
                </div>
              </div>
            )}
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
              <Tabs value={tab} onChange={setTab} color="forest" variant="pills" keepMounted={false}>
                <Tabs.List grow>
                  <Tabs.Tab value="resumen" leftSection={<IconGauge size={16} />}>{L('Resumen', 'Summary')}</Tabs.Tab>
                  <Tabs.Tab value="avanzado" leftSection={<IconChartDots3 size={16} />}>{L('Análisis avanzado', 'Advanced analysis')}</Tabs.Tab>
                  <Tabs.Tab value="comparar" leftSection={<IconArrowsLeftRight size={16} />}>{L('Comparar', 'Compare')}</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="resumen" pt="md">
                  <BrushChart r={cur.r} unit={V[cur.k].u} dec={V[cur.k].d} />
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
                <Tabs.Panel value="comparar" pt="md">
                  {res.list.length > 1 && (<>
                    <h4 className="sh">{L('Todas tus variables, con zoom sincronizado', 'All your variables, with synchronized zoom')}</h4>
                    <LinkedCharts list={res.list} />
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
                      <div><h4 className="sh">{t.stripesTitle}</h4><Stripes vals={cur.r.annual.y} years={cur.r.annual.years} k={cur.k} dec={V[cur.k].d} unit={V[cur.k].u} /><p className="mini">{t.stripesHelp}</p></div>
                      <div><h4 className="sh">{t.heatTitle}</h4><Heatmap pts={cur.raw} k={cur.k} unit={V[cur.k].u} dec={V[cur.k].d} /><p className="mini">{t.heatHelp}</p></div>
                    </div>
                  )}
                  {cur.k !== 'CSV' && <Compare key={cur.k} k={cur.k} a={cur.r} aName={pname(res.pl)} years={years} ds={ds} live={res.live} />}
                </Tabs.Panel>
              </Tabs>
            </div>
          </motion.div>
        )}
      </div>
    </div></section>
  );
}
