import Rich from '../../shared/Rich';
import { caseLink, seriesCsv, caseReportHtml } from './report';
/* Centro de decisiones: de los datos a qué hacer.
   Semáforo + tres futuros posibles + alertas con su evidencia + asistente de consulta + confianza,
   lenguaje de la Tierra (EEL), descubrimientos automáticos y pasaporte de evidencia. Todo local. */
import Ghost from '../../ui/Ghost';
import SplitFlapText from '../../components/reactbits/SplitFlapText/SplitFlapText';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Select, Tabs, Progress, Button, Skeleton, Alert, TextInput, SegmentedControl } from '@mantine/core';
import { IconShieldCheck, IconCircleCheck, IconEye, IconAlertTriangle, IconSend, IconMessageChatbot, IconDownload, IconTelescope, IconArrowRight, IconSparkles, IconWorld, IconEyeOff, IconMountain, IconFingerprint, IconBuildingBank, IconPlant2, IconFlask, IconRadar2, IconCopy, IconCheck, IconSettings } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
import { PLACES } from '../../lib/nasa/data';
import { TYPES } from '../lakes/lakesData';
import { lakeClimate, snapshotInfo } from '../lakes/lakeclim';
import { runCycle } from './agent';
import { ols, senSlope } from '../../lib/analysis/stats';
import { assess, actions, scenText, LV, EEL_DIMS, similar, eelCode, discover, passport, timeline, validate, coherence } from './decideEngine';
import Interpret from '../../shared/Interpret';
import { echartsFacts, tableFacts } from '../../shared/charts/chartFacts';
import Killa, { KillaNote } from '../../killa/Killa';
import { reply, chips } from './copilot';
import { getCfg, setCfg, askLLM, buildContext } from './llm';
import { EChart } from '../../shared/charts/hooks';
import PageHead from '../../layout/PageHead';
import CountUp from '../../ui/CountUp';
import { useRequest, aborted } from '../../core/useRequest';
import { useAnalysis } from '../../lib/analysis/useAnalysis';
import { useRouteState } from '../../core/useRouteState';
import { useSessionState } from '../../core/useSessionState';
import { periodText } from '../../lib/data/monthly';

const MES = { es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const LVI = [IconCircleCheck, IconEye, IconAlertTriangle];

function Gauge({ risk, color, label }) {
  const cx = 130, cy = 124, r = 100, pt = (t, rr = r) => [cx - rr * Math.cos(Math.PI * t), cy - rr * Math.sin(Math.PI * t)];
  const arc = (a, b) => { const [x0, y0] = pt(a), [x1, y1] = pt(b); return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  return (
    <svg viewBox="0 0 260 150" className="gauge" role="img" aria-label={label}>
      <path d={arc(0, 1)} stroke="#e8eef5" strokeWidth="22" fill="none" strokeLinecap="round" />
      <path d={arc(0.012, 0.25)} stroke="#0c7a5b" strokeWidth="22" fill="none" strokeLinecap="round" opacity=".95" />
      <path d={arc(0.265, 0.5)} stroke="#d97706" strokeWidth="22" fill="none" opacity=".95" />
      <path d={arc(0.515, 0.988)} stroke="#b91c1c" strokeWidth="22" fill="none" strokeLinecap="round" opacity=".95" />
      <motion.g initial={{ rotate: 0 }} animate={{ rotate: 180 * Math.min(1, risk / 100) }} transition={{ type: 'spring', stiffness: 50, damping: 12, delay: 0.3 }} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <path d={`M${cx - r + 18} ${cy} L${cx - 14} ${cy - 5} L${cx - 14} ${cy + 5} Z`} fill="#14213d" />
      </motion.g>
      <circle cx={cx} cy={cy} r="13" fill="#14213d" /><circle cx={cx} cy={cy} r="5" fill={color} />
    </svg>
  );
}

function Chat({ A, tgt, ann, sweep, clim, L, lang }) {
  const [msgs, setMsgs] = useState([]), [txt, setTxt] = useState(''), box = useRef(null), [busy, setBusy] = useState(false), [cfg, setC] = useState(getCfg), [cog, setCog] = useState(false), [test, setTest] = useState('');
  const browserOrigin = globalThis.location?.origin || 'http://localhost:5173';
  const upd = (p) => { const n = { ...cfg, ...p }; setC(n); setCfg(n); };
  const begin = useRequest([tgt.id, clim, lang]);
  useEffect(() => { setBusy(false); }, [tgt.id, clim, lang]);
  useEffect(() => { if (!A) return; setMsgs([{ me: false, tag: 'rules', text: L(`Hola. Ya revisé ${tgt.name}: está en nivel ${LV[A.level].es.toLowerCase()}. Pregúntame por qué, qué hacer, qué pasaría si algo cambia o qué tan confiable es. También puedes escribir tus propias cifras, por ejemplo “si llueve 25 % menos”.`, `Hi. I reviewed ${tgt.name}: it is at level ${LV[A.level].en.toLowerCase()}. Ask me why, what to do, what would happen if something changes or how reliable it is. You can also type your own numbers, for example “if rain drops 25 %”.`) }]); }, [tgt.id, !!A, lang]);
  useEffect(() => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [msgs, busy]);
  const send = async (q) => {
    q = (q ?? txt).trim(); if (!q || !A || busy) return; setTxt(''); const hist = msgs; setMsgs((m) => [...m, { me: true, text: q }]); setBusy(true);
    const request = begin(), ctx0 = { A, name: tgt.name, ann, sweep, id: tgt.id }, rule = reply(q, ctx0, L, lang);
    try {
      if (cfg.mode === 'rules') { if (request.current()) setMsgs((m) => [...m, { me: false, tag: 'rules', ...rule }]); return; }
      const text = await askLLM(cfg, { signal: request.signal, question: q, history: hist, ctx: buildContext(A, tgt, clim, useStore.getState().agent, lang, coherence(A, tgt, clim, sweep?.rows, L)), calc: rule.miss ? null : rule.text, lang });
      if (request.current()) setMsgs((m) => [...m, { me: false, tag: 'ai', text }]);
    } catch (e) { if (request.current() && !aborted(e)) setMsgs((m) => [...m, { me: false, tag: 'rules', ...rule, note: L(`${e.message}. Respondí con reglas locales.`, `${e.message}. Answered with local rules.`) }]); }
    finally { if (request.current()) setBusy(false); }
  };
  useEffect(() => { const h = (e) => send(e.detail); window.addEventListener('td-ask', h); return () => window.removeEventListener('td-ask', h); });
  const probar = async () => { setTest(L('Probando…', 'Testing…')); try { const t = await askLLM(cfg, { question: L('Responde solo: listo', 'Reply only: ready'), history: [], ctx: { prueba: true }, calc: null, lang, noVerify: true }); setTest('OK: ' + t.slice(0, 60)); } catch (e) { setTest(L('Falló: ', 'Failed: ') + e.message); } };
  const modeName = cfg.mode === 'ollama' ? L(`IA local (${cfg.ollamaModel})`, `Local AI (${cfg.ollamaModel})`) : cfg.mode === 'claude' ? L('IA Claude (API)', 'Claude AI (API)') : cfg.mode === 'online' ? L('IA en línea', 'Online AI') : L('Reglas locales', 'Local rules');
  return (
    <div className="chat card" id="asistente">
      <div className="chat-h"><span className="chat-ico"><Killa estado={busy ? 'pensando' : 'explicando'} size={64} look={false} shadow={false} /></span><div><b>{L('Killa, tu asistente', 'Killa, your assistant')}</b><span>{modeName} · {L('responde con las cifras de este análisis', 'answers with this analysis’s figures')}</span></div>
        <button className="chat-cog" onClick={() => setCog(!cog)} aria-label={L('Ajustes de la IA', 'AI settings')}><IconSettings size={20} /></button></div>
      {cog && <div className="chat-set">
        <SegmentedControl fullWidth size="xs" color="forest" value={cfg.mode} onChange={(v) => upd({ mode: v })} data={[{ value: 'online', label: L('En línea', 'Online') }, { value: 'rules', label: L('Reglas', 'Rules') }, { value: 'ollama', label: L('IA local', 'Local AI') }, { value: 'claude', label: 'Claude' }]} />
        {cfg.mode === 'online' && <p className="mini">{L('IA en línea gratuita a través del servidor de la app. No necesitas clave. Si falla, responde con reglas.', 'Free online AI through the app server. No key needed. If it fails, it answers with rules.')}</p>}
        {cfg.mode === 'ollama' && <><TextInput size="xs" label={L('Dirección de Ollama', 'Ollama address')} value={cfg.ollamaUrl} onChange={(e) => upd({ ollamaUrl: e.currentTarget.value })} /><TextInput size="xs" label={L('Modelo instalado', 'Installed model')} value={cfg.ollamaModel} onChange={(e) => upd({ ollamaModel: e.currentTarget.value })} />
          <p className="mini">{L(`Corre en tu computador, gratis y sin internet. Instala Ollama, ejecuta “ollama pull llama3.2” y permite el origen del navegador: OLLAMA_ORIGINS=${browserOrigin}`, `Runs on your computer, free and offline. Install Ollama, run “ollama pull llama3.2” and allow the browser origin: OLLAMA_ORIGINS=${browserOrigin}`)}</p></>}
        {cfg.mode === 'claude' && <><TextInput size="xs" type="password" label={L('Clave de la API de Anthropic', 'Anthropic API key')} placeholder="sk-ant-…" value={cfg.apiKey} onChange={(e) => upd({ apiKey: e.currentTarget.value })} /><TextInput size="xs" label={L('Modelo', 'Model')} value={cfg.claudeModel} onChange={(e) => upd({ claudeModel: e.currentTarget.value })} />
          <p className="mini">{L('La clave se guarda solo durante esta sesión del navegador. Se envía únicamente a api.anthropic.com junto con un resumen numérico del análisis.', 'The key is stored only for this browser session. It is sent only to api.anthropic.com along with a numeric summary of the analysis.')}</p></>}
        {cfg.mode !== 'rules' && <div className="row" style={{ gap: 8 }}><Button size="xs" color="forest" variant="light" onClick={probar}>{L('Probar conexión', 'Test connection')}</Button><span className="mini">{test}</span></div>}
      </div>}
      <div className="chat-log" ref={box}>
        {msgs.map((m, i) => (<motion.div key={i} className={'msg' + (m.me ? ' me' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{!m.me && <span className="msg-av"><Killa estado={m.tag === 'ai' ? 'idea' : m.miss ? 'duda' : 'bienvenida'} size={38} live={false} shadow={false} tap={false} /></span>}{!m.me && m.tag === 'ai' && <i className="aitag">Killa</i>}<Rich text={m.text} />{m.note && <small>{m.note}</small>}</motion.div>))}
        {busy && <div className="msg typing"><span className="msg-av"><Killa estado="pensando" size={38} shadow={false} tap={false} /></span><i /><i /><i /></div>}
      </div>
      <div className="chat-chips">{chips(L).map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div>
      <form className="chat-in" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <TextInput value={txt} onChange={(e) => setTxt(e.currentTarget.value)} placeholder={L('Escribe tu pregunta…', 'Type your question…')} size="md" aria-label={L('Pregunta', 'Question')} style={{ flex: 1 }} />
        <Button type="submit" color="forest" size="md" aria-label={L('Enviar', 'Send')}><IconSend size={18} /></Button>
      </form>
    </div>
  );
}

export default function Decide() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { practice, lakes, setView } = useStore();
  const [sel, setSel] = useRouteState('caso', 'l:titicaca', (value) => !!value && /^[lp]:[\w-]+$/.test(value)), [clim, setClim] = useState(null), [pass, setPass] = useState(null), [copied, setCopied] = useState(false), [aud, setAud] = useSessionState('decide:audience', 'auth');
  useEffect(() => { useStore.setState({ aud }); }, [aud]);
  const tgt = useMemo(() => { const [k, id] = sel.split(':'); if (k === 'l') return { ...(lakes.find((x) => x.id === id) || lakes[0]) }; const p = PLACES.find((x) => x.id === id) || PLACES[0]; return { id: p.id, name: p[lang], lat: p.lat, lon: p.lon }; }, [sel, lakes, lang]);
  useEffect(() => { const controller = new AbortController(); setClim(null); lakeClimate(tgt, practice, { signal: controller.signal }).then((c) => { if (!controller.signal.aborted) setClim(c); }).catch((error) => { if (!controller.signal.aborted && !aborted(error)) setClim(false); }); return () => controller.abort(); }, [tgt.id, tgt.lat, tgt.lon, practice]);
  const points = useStore((state) => state.monitoringPoints), monitoringSource = useStore((state) => state.monitoringSource);
  const evaluation = useAnalysis('assess', clim ? { clim, tgt, lang, points, observations: { verified: !!monitoringSource, source: monitoringSource } } : null, [clim, lang, tgt.id, tgt.lat, tgt.lon, points, monitoringSource]);
  const A = evaluation.value;
  useEffect(() => { if (!A) { setPass(null); return; } let on = true; passport(tgt, A, { datos: { origen: clim.src, descargado: clim.when } }).then((p) => on && setPass(p)); return () => { on = false; }; }, [A]);
  const ag = useStore((st) => st.agent), sweep = ag.rows?.length && ag.practice === practice ? { rows: ag.rows, space: ag.space, practice: !ag.src || ag.src === 'demo' } : null, prog = ag.status === 'running' ? ag.pct : null, runSweep = runCycle;
  const [fromY, setFromY] = useSessionState('decide:fromYear', '2015');
  const toTop = () => document.getElementById('decidir')?.scrollIntoView({ behavior: 'smooth' });
  const pick = (id) => { setSel('l:' + id); toTop(); };
  const opts = [{ group: L('Lagos y lagunas del Perú', 'Lakes of Peru'), items: lakes.map((l) => ({ value: 'l:' + l.id, label: l.name })) }, { group: L('Lugares del mundo', 'World places'), items: PLACES.map((p) => ({ value: 'p:' + p.id, label: p[lang] })) }];
  const dl = () => { if (!pass) return; useStore.getState().sayKilla('descarga', L('Pasaporte descargado.', 'Passport downloaded.')); const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(pass, null, 2)], { type: 'application/json' })); a.href = url; a.download = `${pass.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); };
  const saveBlob = (txt, name, type) => { const u = URL.createObjectURL(new Blob([txt], { type })), x = document.createElement('a'); x.href = u; x.download = name; x.click(); setTimeout(() => URL.revokeObjectURL(u), 3000); };
  const slug = (tgt?.name || 'caso').toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  const [lnk, setLnk] = useState(false);
  const copyLink = async () => { try { await navigator.clipboard.writeText(caseLink(sel)); setLnk(true); useStore.getState().sayKilla('descarga', L('Enlace del caso copiado.', 'Case link copied.')); setTimeout(() => setLnk(false), 1600); } catch { useStore.getState().sayKilla('sin-datos', L('No se pudo copiar. Copia el enlace desde la barra del navegador.', 'Copy failed. Copy the link from the browser address bar.')); } };
  const dlCsv = () => { if (ann) saveBlob(seriesCsv(ann, tgt, clim), `terrascope-${slug}-serie.csv`, 'text/csv;charset=utf-8'); };
  const report = () => { if (!A || !pass || !ann) return; const html = caseReportHtml({ A, tgt, ann, pass, coh: coherence(A, tgt, clim, sweep?.rows, L), lang, L, link: caseLink(sel) }), w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch { /* sin impresión */ } }, 400); } else saveBlob(html, `terrascope-${slug}-informe.html`, 'text/html;charset=utf-8'); };
  const cp = async () => { if (!pass) return; try { await navigator.clipboard.writeText(pass.id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { useStore.getState().sayKilla('sin-datos', L('No se pudo copiar. Puedes descargar el pasaporte.', 'Copy failed. You can download the passport.')); } };
  const lvc = A ? LV[A.level].c : '#64748b', Ic = A ? LVI[A.level] : IconEye;
  const sec = useStore((s) => s.sec), secN = useStore((s) => s.secN);
  useEffect(() => { // el menú ramificado de la izquierda lleva a cada parte
    if (!sec || !sec.startsWith('decidir:')) return undefined; const id = sec.slice(8); let n = 0;
    const t = setInterval(() => { const el = document.getElementById(id); if (el || ++n > 30) { clearInterval(t); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 120);
    return () => clearInterval(t);
  }, [secN]); // eslint-disable-line
  useEffect(() => { // y marca en qué parte estás mientras bajas
    const ids = ['semaforo', 'asistente', 'tend', 'futuros', 'validacion', 'pasaporte'];
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) useStore.getState().setSec('decidir:' + v.target.id); }, { rootMargin: '-20% 0px -65% 0px' });
    const t = setTimeout(() => ids.forEach((i) => { const e = document.getElementById(i); if (e) io.observe(e); }), 1200);
    return () => { clearTimeout(t); io.disconnect(); };
  }, [A ? 1 : 0]); // eslint-disable-line
  const coh = useMemo(() => (A && clim ? coherence(A, tgt, clim, sweep?.rows, L) : null), [A, clim, sweep, lang]); // eslint-disable-line
  const head = !A ? '' : A.level === 0 ? L('Balance climático dentro del rango histórico', 'Climate balance within the historical range') : A.kind === 'wet' ? L('Exceso de agua: vigila posibles desbordes', 'Excess water: watch for overflow') : A.level === 1 ? L('Hay señales de que el agua empieza a faltar', 'Signs that water is starting to run short') : L('Riesgo alto de falta de agua', 'High risk of water shortage');
  const lead = !A ? '' : A.level === 0 ? L(`En ${tgt.name} la lluvia menos la evaporación de los últimos 12 meses está dentro de lo esperable. Es un índice del clima de la zona, no el nivel medido del lago o embalse. ${A.pDry >= 0.2 ? `Aun así, la simulación da ${Math.round(A.pDry * 100)} % de que el próximo año sea de los más secos (lo normal es 10 %): conviene preparar un plan sin actuar todavía.` : 'No hace falta actuar; sí seguir midiendo.'}`, `At ${tgt.name} rain minus evaporation over the last 12 months is within what is expected. It is a climate index for the area, not the measured lake or reservoir level. ${A.pDry >= 0.2 ? `Even so, the simulation gives ${Math.round(A.pDry * 100)} % that next year is among the driest (normal is 10 %): prepare a plan without acting yet.` : 'No action needed; keep measuring.'}`) : A.alerts.find((a) => a.lv > 0)?.why;
  const act = A ? actions(A, L) : null, end = A ? `${MES[lang][A.w.end.month]} ${A.w.end.year}` : '';
  const ann = clim?.ann;
  const explanationContext = A && clim ? `${tgt.name}; ${periodText(clim.wb)}; source: ${clim.src}; ${A.live ? 'NASA POWER climate model, not measured lake level' : 'simulated practice data, not real observations'}; retrieved: ${clim.when || 'not applicable'}` : '';
  const sOpt = useMemo(() => {
    if (!A) return null; const cats = [L('Ahora', 'Now'), L('Sequía y calor', 'Drought and heat'), L('Clima reciente', 'Recent climate'), L('Año húmedo', 'Wet year')], col = ['#94a3b8', ...A.scen.map((s) => s.c)], vals = [A.scen[0].r.now, ...A.scen.map((s) => s.r.val)];
    return { textStyle: { color: '#5b6b8c', fontFamily: 'Inter Variable, sans-serif' }, grid: { left: 64, right: 118, top: 34, bottom: 36 }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => Math.round(v) + ' mm' },
      xAxis: { type: 'category', data: cats, axisTick: { show: false }, axisLabel: { fontSize: 14, fontWeight: 700, color: '#14213d' } }, yAxis: { type: 'value', name: L('mm por año', 'mm per year'), nameTextStyle: { align: 'left' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: [{ type: 'bar', barWidth: '46%', data: vals.map((v, i) => ({ value: +v.toFixed(0), itemStyle: { color: col[i], borderRadius: v >= 0 ? [10, 10, 0, 0] : [0, 0, 10, 10] } })), label: { show: true, position: 'top', fontWeight: 800, fontSize: 15, color: '#14213d', formatter: (p) => p.value + ' mm' },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: '#b91c1c', type: 'dashed', width: 2 }, label: { formatter: L('Año seco\n(10 % más seco)', 'Dry year\n(driest 10 %)'), position: 'end', color: '#b91c1c', fontWeight: 700, lineHeight: 16 }, data: [{ yAxis: +A.p10.toFixed(0) }] } },
        { type: 'custom', z: 10, data: A.scen.map((s, i) => [i + 1, s.r.lo, s.r.hi]), renderItem: (p, api) => { const a = api.coord([api.value(0), api.value(1)]), b = api.coord([api.value(0), api.value(2)]), st = { stroke: '#14213d', lineWidth: 2.5 }; return { type: 'group', children: [{ type: 'line', shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: st }, { type: 'line', shape: { x1: a[0] - 9, y1: a[1], x2: a[0] + 9, y2: a[1] }, style: st }, { type: 'line', shape: { x1: b[0] - 9, y1: b[1], x2: b[0] + 9, y2: b[1] }, style: st }] }; } }] };
  }, [A, lang]);
  useEffect(() => { if (!A) return; const sk = useStore.getState().sayKilla; if (A.level === 2) sk('alerta', L(`Ojo: ${tgt.name} está en alerta.`, `Careful: ${tgt.name} is on alert.`)); else if (A.level === 1) sk('lupa', L(`Vigilo ${tgt.name}: algo se sale de lo normal.`, `Watching ${tgt.name}: something is off normal.`)); else sk('celebrando', L(`${tgt.name} está tranquilo.`, `${tgt.name} is calm.`)); }, [tgt.id, !!A, A?.level]);
  const tr = useMemo(() => {
    if (!A || !ann) return null; const yrs = ann.map((a) => a.year), v = ann.map((a) => a.wb), o = ols(yrs, v), sen = senSlope(yrs, v, A.mk.varS), p = A.mk.p, dir = sen.slope * 10 < 0, lvl = p < 0.05 ? 2 : p < 0.1 ? 1 : 0;
    const opt = { textStyle: { color: '#5b6b8c' }, grid: { left: 60, right: 20, top: 24, bottom: 36 }, tooltip: { trigger: 'axis', valueFormatter: (x) => Math.round(x) + ' mm' }, legend: { top: 0, right: 0, data: [L('Balance de cada año', 'Balance of each year'), L('Tendencia', 'Trend')] },
      xAxis: { type: 'category', data: yrs, axisLabel: { interval: 4 } }, yAxis: { type: 'value', name: 'mm', splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: [{ name: L('Balance de cada año', 'Balance of each year'), type: 'bar', itemStyle: { color: '#7fb3a3' }, data: v.map((x, i) => ({ value: Math.round(x), itemStyle: { color: x < A.p10 ? '#b91c1c' : '#7fb3a3', borderRadius: [4, 4, 0, 0] } })), barCategoryGap: '25%' }, { name: L('Tendencia', 'Trend'), type: 'line', symbol: 'none', data: yrs.map((y) => Math.round(o.intercept + o.slope * y)), lineStyle: { color: '#1e3a8a', width: 3 } }] };
    return { opt, perDec: sen.slope * 10, ci: sen.ci.map((x) => x * 10), p, dir, lvl };
  }, [A, ann, lang]);
  const retrospective = useAnalysis('timeline', clim ? { clim, fromYear: +fromY } : null, [clim, fromY]), tl = retrospective.value?.rows || null, val = retrospective.value?.validation || null;
  const mon = (r) => (r ? `${MES[lang][r.month]} ${r.year}` : '');
  const vOpt = useMemo(() => {
    if (!tl || !val) return null; const lab = tl.map((r) => `${r.year}-${String(r.month + 1).padStart(2, '0')}`), im = tl.findIndex((r) => r.i === val.minR.i), mk = (r, c, t, pos) => (r ? { xAxis: tl.findIndex((q) => q.i === r.i), lineStyle: { color: c, type: 'dashed', width: 2 }, label: { formatter: t, color: c, fontWeight: 700, position: pos } } : null);
    return { textStyle: { color: '#5b6b8c' }, grid: { left: 52, right: 56, top: 30, bottom: 56 }, legend: { top: 0, data: [L('Riesgo del semáforo', 'Traffic-light risk'), L('Balance de agua, 12 meses', 'Water balance, 12 months')] }, tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: lab, boundaryGap: false, axisLabel: { interval: 23 } }, dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 6 }],
      yAxis: [{ type: 'value', name: L('Riesgo', 'Risk'), min: 0, max: 100, splitLine: { lineStyle: { color: '#eef2f7' } } }, { type: 'value', name: 'mm', splitLine: { show: false }, scale: true }],
      series: [{ name: L('Riesgo del semáforo', 'Traffic-light risk'), type: 'line', itemStyle: { color: '#0c5a43' }, data: tl.map((r) => r.risk), symbol: 'none', lineStyle: { color: '#0c5a43', width: 2.5 }, areaStyle: { color: 'rgba(12,90,67,.12)' }, markArea: { silent: true, data: [[{ yAxis: 0, itemStyle: { color: 'rgba(12,122,91,.05)' } }, { yAxis: 25 }], [{ yAxis: 25, itemStyle: { color: 'rgba(217,119,6,.10)' } }, { yAxis: 50 }], [{ yAxis: 50, itemStyle: { color: 'rgba(185,28,28,.10)' } }, { yAxis: 100 }]] }, markLine: { symbol: 'none', silent: true, data: [mk(val.w1, '#d97706', L('Vigilar', 'Watch'), 'start'), mk(val.w2, '#b91c1c', L('Alerta', 'Alert'), 'end')].filter(Boolean) } },
        { name: L('Balance de agua, 12 meses', 'Water balance, 12 months'), type: 'line', yAxisIndex: 1, itemStyle: { color: '#1e3a8a' }, data: tl.map((r) => Math.round(r.roll)), symbol: 'none', lineStyle: { color: '#1e3a8a', width: 2, type: 'dashed' }, markPoint: { data: [{ coord: [im, Math.round(val.minVal)], name: 'min', symbol: 'circle', symbolSize: 12, itemStyle: { color: '#1e3a8a', borderColor: '#fff', borderWidth: 2 }, label: { show: true, position: 'top', formatter: L('mínimo de agua', 'water low'), color: '#1e3a8a', fontWeight: 700, fontSize: 12 } }] } }] };
  }, [tl, val, lang]);
  const iT = sweep && sweep.rows.findIndex((r) => r.id === tgt.id), space = sweep?.space;
  const eelOpt = useMemo(() => {
    if (!space || iT == null || iT < 0) return null; const z = space.Z[iT], nm = (d) => d[lang === 'es' ? 1 : 2];
    return { radar: { indicator: EEL_DIMS.map((d) => ({ name: nm(d), min: -3, max: 3 })), radius: '64%', axisName: { color: '#14213d', fontWeight: 600, fontSize: 12 }, splitArea: { areaStyle: { color: ['#f8fbfa', '#fff'] } } }, tooltip: {},
      series: [{ type: 'radar', data: [{ value: Array(8).fill(0), name: L('Promedio de los lagos', 'Lake average'), lineStyle: { color: '#94a3b8', type: 'dashed' }, itemStyle: { color: '#94a3b8' }, areaStyle: { opacity: 0 } }, { value: z.map((v) => +v.toFixed(2)), name: tgt.name, lineStyle: { color: '#0c5a43', width: 3 }, itemStyle: { color: '#0c5a43' }, areaStyle: { color: 'rgba(12,90,67,.25)' } }] }] };
  }, [space, iT, lang, tgt]);
  const mapOpt = useMemo(() => {
    if (!space) return null; return { textStyle: { color: '#5b6b8c' }, grid: { left: 40, right: 16, top: 16, bottom: 40 }, tooltip: { formatter: (p) => `<b>${p.name}</b>` },
      xAxis: { type: 'value', name: L(`Eje 1 (${Math.round(space.expl[0] * 100)} %)`, `Axis 1 (${Math.round(space.expl[0] * 100)} %)`), nameLocation: 'middle', nameGap: 26, splitLine: { lineStyle: { color: '#eef2f7' } } }, yAxis: { type: 'value', name: L(`Eje 2 (${Math.round(space.expl[1] * 100)} %)`, `Axis 2 (${Math.round(space.expl[1] * 100)} %)`), splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: [{ type: 'scatter', data: sweep.rows.map((r, j) => ({ value: space.xy[j], name: r.name, id: r.id, symbolSize: r.id === tgt.id ? 20 : 10, itemStyle: { color: TYPES[r.type]?.[2] || '#64748b', borderColor: r.id === tgt.id ? '#facc15' : '#fff', borderWidth: r.id === tgt.id ? 4 : 1.5, opacity: 0.9 } })), z: 5 }] };
  }, [space, sweep, tgt.id, lang]);
  const sim = space && iT >= 0 ? similar(space, sweep.rows, iT, 5) : [];
  const disc = sweep ? discover(sweep.rows, space, L) : [];
  const DI = { odd: IconSparkles, region: IconWorld, gap: IconEyeOff, alt: IconMountain };
  const AUD = [['auth', IconBuildingBank, L('Autoridad', 'Authority')], ['farm', IconPlant2, L('Agricultura y comunidad', 'Farming and community')], ['sci', IconFlask, L('Investigación', 'Research')]];
  return (
    <section id="decidir" className="page"><div className="wrap">
      <PageHead lot="thermo" icon={IconShieldCheck} eyebrow={L('Centro de decisiones', 'Decision center')} title={L('Qué pasa, qué podría pasar y qué hacer', 'What is happening, what could happen and what to do')} sub={L('Elige un lago o un lugar. La app lee los datos de la NASA, te da un semáforo, compara tres futuros posibles y te dice qué hacer y qué tan seguro es.', 'Choose a lake or a place. The app reads NASA data, gives you a traffic light, compares three possible futures and tells you what to do and how sure it is.')}>
        <div className="ph-pick"><span>{L('Analizar', 'Analyse')}</span><Select value={sel} onChange={(v) => v && setSel(v)} data={opts} searchable size="lg" radius="xl" allowDeselect={false} maxDropdownHeight={300} aria-label={L('Lugar a analizar', 'Place to analyse')} /></div>
      </PageHead>

      {(clim === null || evaluation.loading) && <div className="status card"><KillaNote estado="analizando" size={110} title={L('Killa está analizando', 'Killa is analysing')}>{L('Leyendo 40 años de datos de la NASA…', 'Reading 40 years of NASA data…')}</KillaNote></div>}
      {clim === false && <KillaNote estado="sin-conexion" tone="red" title={L('No pude calcular este lugar', 'I could not compute this place')}>{L('Prueba con otro lugar o activa el modo Práctica arriba a la derecha.', 'Try another place or turn on Practice mode at the top right.')}</KillaNote>}
      {clim && !A && !evaluation.loading && <KillaNote estado="sin-datos" tone="orange" title={L('Faltan datos', 'Not enough data')}>{L('No se pudo evaluar esta serie. Reintenta o revisa la cobertura de los datos.', 'Could not assess this series. Retry or check data coverage.')}</KillaNote>}

      {A && (<>
        {A.live && <p className="srcline"><IconCheck size={16} />{clim.src === 'live' ? L('Datos reales de NASA POWER, descargados ahora.', 'Real NASA POWER data, downloaded now.') : L(`Datos reales de NASA POWER, guardados el ${new Date(clim.when).toLocaleDateString(lang)}. Funcionan sin internet.`, `Real NASA POWER data, saved on ${new Date(clim.when).toLocaleDateString(lang)}. They work offline.`)} · {periodText(clim.wb)}{clim.stale ? L(' · copia histórica; no se pudo actualizar', ' · historical copy; refresh unavailable') : ''}</p>}
        {!A.live && <Alert color="blue" radius="lg" mt="md" icon={<IconEye size={18} />}>{L('Estás en modo práctica: los datos son simulados y sirven solo para probar. Apaga “Práctica” en la barra superior para usar NASA POWER.', 'You are in practice mode: data are simulated and only for testing. Turn off “Practice” in the top bar to use NASA POWER.')}</Alert>}
        <motion.div id="semaforo" className="status card" style={{ '--lv': lvc }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={tgt.id + A.level}>
          <Ghost k="shield" i={A.level} size={200} pos={2} />
          <div className="st-gauge"><Gauge risk={A.risk} color={lvc} label={L('Nivel de riesgo', 'Risk level')} /><div className="gnum"><CountUp key={tgt.id} to={A.risk} duration={1.2} /><small>/100</small></div><span className="gcap">{L('Riesgo', 'Risk')}</span></div>
          <div className="st-main">
            <span className="lvchip"><Ic size={22} /><SplitFlapText key={lang + A.level} words={[LV[A.level][lang].toUpperCase()]} loop={false} padTo={0} fontSize={16} tileColor="rgba(255,255,255,.16)" textColor="#fff" gap={2} flipsPerChar={5} tileRadius={5} /></span>
            <div className="st-two"><span className="st-pill ok">{L('Ahora', 'Now')}: {A.w.z <= -1 ? L('balance reciente bajo', 'recent balance low') : L('balance reciente dentro de lo esperado', 'recent balance as expected')}</span><span className={'st-pill ' + (A.pDry >= 0.2 ? 'warn' : 'ok')}>{L('Próximo año', 'Next year')}: {A.pDry >= 0.2 ? L('riesgo elevado según la simulación', 'elevated risk in the simulation') : L('riesgo normal según la simulación', 'normal risk in the simulation')}</span></div>
            <h2 className="st-head">{head}</h2>
            <p className="st-lead">{lead}</p>
            <div className="st-btns">
              <Button size="lg" color="forest" rightSection={<IconArrowRight size={18} />} onClick={() => document.getElementById('asistente')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{L('Preguntar al asistente', 'Ask the assistant')}</Button>
              <Button size="lg" variant="default" leftSection={<IconFingerprint size={18} />} onClick={() => document.getElementById('pasaporte')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{L('Pasaporte de evidencia', 'Evidence passport')}</Button>
            </div>
          </div>
          <div className="st-kpis">
            <div className="bigk"><span>{L('Balance climático (lluvia − evaporación), 12 meses', 'Climate balance (rain − evaporation), 12 months')}</span><b>{Math.round(A.w.last)}<small> mm</small></b><em>{L('índice de la zona (celda ~50 km), no el nivel del lago o embalse. Normal', 'area index (~50 km cell), not the lake or reservoir level. Normal')} {Math.round(A.w.normal)} mm · {A.w.z >= 0 ? '+' : '−'}{Math.abs(A.w.z).toFixed(1)} σ</em></div>
            <div className="bigk"><span>{L('Probabilidad de año seco', 'Dry-year probability')}</span><b>{Math.round(A.pDry * 100)}<small> %</small></b><em>{L('Simulación de 500 años posibles. El 10 % es lo que se espera por definición: el 10 % de los años de la historia son los más secos.', '500 simulated possible years. 10 % is expected by definition: 10 % of historical years are the driest.')}</em></div>
            <div className="bigk"><span>{L('Confianza del resultado', 'Result confidence')}</span><b>{A.conf}<small> /100</small></b><em>{A.bt ? L(`El intervalo nominal del 90 % cubrió ${Math.round(A.bt.coverage * 100)} % en los últimos 5 años de prueba. El ${A.conf}/100 combina calidad de datos, años de serie, cercanía de estaciones y esa validación.`, `The nominal 90 % interval covered ${Math.round(A.bt.coverage * 100)} % over the last 5 test years. The ${A.conf}/100 combines data quality, series length, station distance and that validation.`) : L('datos hasta', 'data to')} · {end}</em></div>
          </div>
        </motion.div>

        <Interpret kind="result" title={L('Riesgo y semáforo de ', 'Risk and traffic light for ') + tgt.name} facts={`${explanationContext}; risk index ${A.risk}/100; level ${LV[A.level][lang]}; confidence index ${A.conf}/100; 12-month climate balance ${Math.round(A.w.last)} mm; expected balance ${Math.round(A.w.normal)} mm; simulated dry-year probability ${Math.round(A.pDry * 100)}%; risk and confidence indices are not probabilities`} how={L('La aguja indica el índice de riesgo de 0 a 100 y el color su nivel. La probabilidad de año seco y la confianza son medidas distintas.', 'The needle shows a risk index from 0 to 100 and the colour its level. Dry-year probability and confidence are separate measures.')} plain={lead} />

        {coh && <div className={'coh card' + (coh.length ? ' warn' : '')}><span className="coh-av"><Killa estado={coh.length ? 'duda' : 'confirmado'} size={70} live={false} shadow={false} tap={false} /></span><div className="coh-b"><b>{coh.length ? L('Killa revisó la coherencia y encontró ' + (coh.length === 1 ? 'una diferencia' : coh.length + ' diferencias'), 'Killa checked consistency and found ' + (coh.length === 1 ? 'one difference' : coh.length + ' differences')) : L('Killa revisó la coherencia: no hay contradicciones entre vistas', 'Killa checked consistency: no contradictions between views')}</b>{coh.length > 0 && <ul>{coh.map((c) => <li key={c.t}><strong>{c.t}.</strong> {c.b}</li>)}</ul>}</div></div>}
        <h2 className="blockh" id="tend">{L('¿Hay una tendencia de fondo?', 'Is there a background trend?')}<span>{L('Antes de mirar el futuro, se prueba si el agua ya viene cambiando año tras año y si ese cambio es real o puede ser azar.', 'Before looking at the future, we test whether water has already been changing year after year and whether that change is real or may be chance.')}</span></h2>
        {tr && <div className="trendrow"><div className="card panel"><EChart option={tr.opt} deps={[tr.opt]} h={300} /><p className="mini">{L('Barras rojas: años entre el 10 % más seco. Línea azul: tendencia lineal.', 'Red bars: years among the driest 10 %. Blue line: linear trend.')}</p>
            <Interpret title={L('Balance de agua de cada año y su tendencia', 'Yearly water balance and its trend')} facts={`${tgt.name}; ${ann.length} años (${ann[0].year}-${ann[ann.length - 1].year}); balance = lluvia menos evaporación en mm por año; cambio ${Math.round(tr.perDec)} mm por década; Mann-Kendall p=${tr.p.toFixed(4)} (${tr.lvl === 2 ? 'significativa' : tr.lvl === 1 ? 'probable' : 'no significativa'}); intervalo 95% de Sen [${Math.round(tr.ci[0])}, ${Math.round(tr.ci[1])}] mm/década; años en el 10% más seco: ${ann.filter((a) => a.wb < A.p10).length}; datos ${A.live ? 'reales NASA POWER' : 'de práctica simulados'}`} how={L('Cada barra es un año: más alta significa más agua disponible. La línea azul resume hacia dónde va todo.', 'Each bar is a year: taller means more water available. The blue line summarises where it is heading.')} plain={tr.lvl === 0 ? L('Qué dice aquí: el cambio es pequeño frente a la variación normal entre años; puede ser azar.', 'What it says here: the change is small compared with normal year-to-year variation; it may be chance.') : L(`Qué dice aquí: el agua disponible cambia ${Math.round(tr.perDec)} mm por década y es poco probable que sea casualidad.`, `What it says here: available water changes ${Math.round(tr.perDec)} mm per decade and is unlikely to be chance.`)} next={tr.lvl === 0 ? L('Abre el Laboratorio con este lugar y prueba otro periodo u otra variable (por ejemplo temperatura) antes de concluir.', 'Open the Lab with this place and try another period or variable (e.g. temperature) before concluding.') : L('Confirma con una estación cercana o una medición del lago; el Pasaporte dice qué dato falta.', 'Confirm with a nearby station or a lake measurement; the Passport says which data is missing.')} /></div>
          <div className="card trendk" style={{ '--c': tr.lvl === 2 ? '#0c5a43' : tr.lvl === 1 ? '#d97706' : '#64748b' }}><Ghost k="trend" i={1} size={140} pos={1} />
            <span className="lvchip" style={{ '--lv': tr.lvl === 2 ? '#0c5a43' : tr.lvl === 1 ? '#d97706' : '#64748b' }}>{tr.lvl === 2 ? L('Tendencia significativa', 'Significant trend') : tr.lvl === 1 ? L('Tendencia probable', 'Likely trend') : L('Sin tendencia clara', 'No clear trend')}</span>
            <b className="tk-v">{tr.perDec >= 0 ? '+' : '−'}{Math.abs(Math.round(tr.perDec))}<small> mm {L('por década', 'per decade')}</small></b>
            <p>{tr.lvl === 0 ? L('El cambio es pequeño frente a la variación natural entre años: puede ser azar.', 'The change is small compared with natural year-to-year variation: it may be chance.') : tr.dir ? L('El agua disponible viene disminuyendo y es poco probable que sea casualidad.', 'Available water has been decreasing and it is unlikely to be chance.') : L('El agua disponible viene aumentando y es poco probable que sea casualidad.', 'Available water has been increasing and it is unlikely to be chance.')}</p>
            <small>{L('Balance anual de', 'Annual balance from')} {ann[0].year} {L('a', 'to')} {ann[ann.length - 1].year} · {L('pendiente de Sen sobre años completos', 'Sen slope on full years')} · Mann-Kendall: p {tr.p < 0.001 ? '< 0.001' : '= ' + tr.p.toFixed(3)} · {L('intervalo 95 % de Sen', 'Sen 95 % interval')}: [{Math.round(tr.ci[0])}, {Math.round(tr.ci[1])}] mm/{L('década', 'decade')}</small>
          </div></div>}

        <h2 className="blockh" id="futuros">{L('Tres futuros posibles', 'Three possible futures')}<span>{L('Qué pasaría con el agua de este lugar si ocurre algo peligroso, si no ocurre nada nuevo o si todo está tranquilo.', 'What would happen to this place’s water if something dangerous happens, if nothing new happens or if all stays calm.')}</span></h2>
        <div className="scs">
          {A.scen.map((s, i) => { const t = scenText(s, A, L); return (
            <motion.div key={s.id} className="sc card" style={{ '--c': s.c }} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Ghost k={s.id === 'bad' ? 'fire' : s.id === 'same' ? 'calm' : 'rain'} i={s.id === 'bad' ? 0 : s.id === 'same' ? 1 : 2} size={150} /><span className="sc-tag">{s[lang]}</span>
              <small>{s.sub[lang === 'es' ? 0 : 1]}</small>
              <b className="sc-v">{t.v}<i> mm/{L('año', 'yr')}</i></b>
              <p className="sc-r">{t.rel}</p>
              <p>{t.head}</p>
              <div className="sc-p"><span>{L('Año seco', 'Dry year')}</span><Progress value={t.pDry} color={s.c} size="lg" radius="xl" /><b>{t.pDry} %</b></div>
              <Interpret title={s[lang] + ': ' + tgt.name} facts={`${explanationContext}; conditional scenario ${s[lang]}; simulated year ${ann.at(-1).year + 1}; rainfall change ${s.p.dP * 100}%; temperature change ${s.p.dT} °C; balance ${Math.round(s.r.val)} mm/year; 90% range ${Math.round(s.r.lo)} to ${Math.round(s.r.hi)} mm/year; dry-year probability ${t.pDry}%`} how={L('La barra indica la probabilidad de año seco bajo este supuesto, no lo que sucederá con certeza.', 'The bar shows dry-year probability under this assumption, not what will certainly happen.')} plain={t.head + ' ' + t.rel} />
            </motion.div>); })}
        </div>
        <div className="card panel" style={{ marginTop: 14 }}>
          <EChart option={sOpt} deps={[sOpt]} h={320} />
          <Interpret title={L('Tres futuros posibles del balance de agua', 'Three possible futures of the water balance')} facts={explanationContext + '\n' + A.scen.map((s) => `${s.id === 'bad' ? 'peligroso (-15% lluvia, +2.5 C)' : s.id === 'same' ? 'sin novedad' : 'tranquilo (+12% lluvia)'}: balance anual ${Math.round(s.r.val)} mm, rango 90% [${Math.round(s.r.lo)}, ${Math.round(s.r.hi)}], probabilidad de año seco ${Math.round(s.r.dry * 100)}%`).join(' | ') + `; hoy: ${Math.round(A.w.normal)} mm normal`} plain={L('Qué dice aquí: cada barra es un posible futuro y la línea negra su rango probable. Si el rango es ancho, hay mucha duda.', 'What it says here: each bar is a possible future and the black line its likely range. A wide range means a lot of doubt.')} how={L('Cómo se lee: cada barra es el balance anual esperado en un futuro distinto.', 'How to read it: each bar is the expected yearly balance in a different future.')} next={L('Mira el Pasaporte para ver la incertidumbre y decide qué observación reduciría más la duda.', 'Check the Passport for the uncertainty and decide which observation would cut doubt the most.')} />
          <p className="mini">{L('Balance anual = lluvia menos evaporación. Línea negra: rango probable (90 %). “Ahora” es el promedio de los últimos 10 años. Los futuros son escenarios condicionales (temperatura y lluvia), no predicciones.', 'Annual balance = rain minus evaporation. Black line: likely range (90 %). “Now” is the average of the last 10 years. The futures are conditional scenarios (temperature and rain), not predictions.')}</p>
        </div>

        <h2 className="blockh">{L('Alertas y asistente', 'Alerts and assistant')}<span>{L('Cada alerta dice qué ve la app, por qué importa y qué hacer. A la derecha puedes preguntar lo que no entiendas.', 'Each alert says what the app sees, why it matters and what to do. On the right you can ask anything you do not understand.')}</span></h2>
        <div className="duo">
          <div className="alerts">
            {A.alerts.length === 0 && <div className="card panel">{L('Ninguna alerta: todo está dentro de lo esperado.', 'No alerts: everything is within expectations.')}</div>}
            {A.alerts.map((a, i) => { const I2 = LVI[a.lv]; return (
              <motion.div key={a.t} className="alert card" style={{ '--c': LV[a.lv].c }} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 4) * 0.06 }}>
                <span className="al-ico"><I2 size={22} /></span>
                <div><span className="al-lv">{LV[a.lv][lang]}</span><h3>{a.t}</h3><p>{a.why}</p><p className="al-do"><IconArrowRight size={16} /><span><b>{L('Qué hacer', 'What to do')}:</b> {a.act}</span></p></div>
              </motion.div>); })}
          </div>
          <Chat A={A} tgt={tgt} ann={ann} sweep={sweep && { ...sweep }} clim={clim} L={L} lang={lang} />
        </div>

        <h2 className="blockh">{L('Qué hacer según quién eres', 'What to do depending on who you are')}</h2>
        <div className="card panel">
          <Tabs value={aud} onChange={setAud} color="forest" variant="pills" radius="xl">
            <Tabs.List grow>{AUD.map(([v, I2, l]) => <Tabs.Tab key={v} value={v} leftSection={<I2 size={18} />} style={{ fontWeight: 700, fontSize: 15, height: 46 }}>{l}</Tabs.Tab>)}</Tabs.List>
            {AUD.map(([v]) => <Tabs.Panel key={v} value={v} pt="md"><ol className="todo">{act[v].map((x, i) => <li key={i}><span>{i + 1}</span>{x}</li>)}</ol></Tabs.Panel>)}
          </Tabs>
        </div>

        <h2 className="blockh">{L('Cuánto no sabemos', 'How much we do not know')}<span>{L('Un resultado sin su incertidumbre engaña. Aquí separamos de dónde viene la duda y qué observación la reduciría más.', 'A result without its uncertainty misleads. Here we separate where the doubt comes from and which observation would cut it most.')}</span></h2>
        <div className="duo even">
          <div className="card panel">
            {A.unc.map((u) => (<div key={u.k} className="unc"><div><b>{u.n}</b><span>{u.v}/100</span></div><Progress value={u.v} size="md" radius="xl" color={u.v >= 60 ? '#b91c1c' : u.v >= 35 ? '#d97706' : '#0c7a5b'} /><small>{u.why}</small></div>))}
            <Interpret title={L('Fuentes de incertidumbre', 'Sources of uncertainty')} facts={explanationContext + '\n' + tableFacts(['source', 'uncertainty index /100', 'evidence'], A.unc.map((u) => [u.n, u.v, u.why])) + `; recommended next observation: ${A.obs.t}; ${A.obs.why}`} how={L('Cada barra mide una fuente de duda de 0 a 100: una barra más larga significa más incertidumbre, no más confianza.', 'Each bar measures a source of doubt from 0 to 100: a longer bar means more uncertainty, not more confidence.')} plain={A.worst.why + ' ' + A.obs.why} />
          </div>
          <div className="obs card" style={{ '--c': '#1e3a8a' }}>
            <span className="obs-ico"><IconTelescope size={30} /></span>
            <span className="ph-eyebrow dark">{L('Siguiente mejor observación', 'Next best observation')}</span>
            <h3>{A.obs.t}</h3><p>{A.obs.why}</p>
            <small>{L('La app elige la fuente de duda más grande y propone la medición que más la reduce. Es observación activa: decidir qué mirar después.', 'The app picks the biggest source of doubt and proposes the measurement that cuts it most. It is active observation: deciding what to look at next.')}</small>
          </div>
        </div>

        <h2 className="blockh" id="validacion">{L('¿Habría avisado a tiempo?', 'Would it have warned in time?')}<span>{L('Prueba de máquina del tiempo: el semáforo se recalcula mes a mes usando solo los datos que existían entonces, sin mirar el futuro. Así se ve si habría avisado antes de la sequía.', 'Time-machine test: the traffic light is recomputed month by month using only the data that existed then, without peeking at the future. This shows whether it would have warned before the drought.')}</span></h2>
        <div className="card panel">
          <div className="row" style={{ marginBottom: 6 }}><span className="mini" style={{ fontWeight: 700 }}>{L('Revisar desde el año', 'Review from year')}</span><Select value={fromY} onChange={(v) => v && setFromY(v)} data={['2000', '2005', '2010', '2015', '2018', '2020']} allowDeselect={false} w={120} aria-label={L('Año de inicio', 'Start year')} /></div>
          {val ? (<>
            <div className="valk">
              <div style={{ '--c': val.w1 ? '#0c5a43' : '#64748b' }}><span>{L('Aviso “Vigilar”', '“Watch” warning')}</span><b>{val.w1 ? `${val.lead1} ${L('meses antes', 'months before')}` : L('No avisó a tiempo', 'No timely warning')}</b><small>{val.w1 ? L(`Desde ${mon(val.w1)}; el agua llegó a su mínimo en ${mon(val.minR)}.`, `From ${mon(val.w1)}; water hit its low in ${mon(val.minR)}.`) : L(`El agua llegó a su mínimo en ${mon(val.minR)}.`, `Water hit its low in ${mon(val.minR)}.`)}</small></div>
              <div style={{ '--c': val.w2 ? '#b91c1c' : '#64748b' }}><span>{L('Aviso “Alerta”', '“Alert” warning')}</span><b>{val.w2 ? `${val.lead2} ${L('meses antes', 'months before')}` : L('No llegó a Alerta', 'Never reached Alert')}</b><small>{val.w2 ? L(`Desde ${mon(val.w2)}.`, `From ${mon(val.w2)}.`) : L('Antes del mínimo no superó el umbral de alerta.', 'Before the low it did not cross the alert threshold.')}</small></div>
              <div style={{ '--c': '#1e3a8a' }}><span>{L('Avisos que acertaron', 'Warnings that were right')}</span><b>{val.hit} {L('de', 'of')} {val.eps}</b><small>{L('episodios de vigilancia fueron seguidos por un periodo seco en los 12 meses siguientes', 'watch episodes were followed by a dry period within the next 12 months')}{val.unresolved ? L(`; ${val.unresolved} aún no se pueden evaluar.`, `; ${val.unresolved} cannot be assessed yet.`) : '.'}</small></div>
            </div>
            <EChart option={vOpt} deps={[vOpt]} h={330} />
            <Interpret title={L('Prueba retrospectiva del semáforo', 'Traffic-light time-machine test')} facts={`${explanationContext}; revisión desde ${fromY}; mínimo de agua en ${mon(val.minR)}; aviso Vigilar ${val.w1 ? val.lead1 + ' meses antes (' + mon(val.w1) + ')' : 'no hubo'}; aviso Alerta ${val.w2 ? val.lead2 + ' meses antes (' + mon(val.w2) + ')' : 'no hubo'}; avisos que acertaron ${val.hit} de ${val.eps}; datos ${A.live ? 'reales' : 'de práctica (solo ejemplo)'}`} how={L('Cómo se lee: la línea verde es el riesgo mes a mes; las franjas son verde, ámbar y rojo; la azul punteada es el agua de 12 meses.', 'How to read it: the green line is monthly risk; bands are green, amber and red; the dashed blue is 12-month water.')} plain={val.w1 ? L(`Qué dice aquí: el semáforo avisó ${val.lead1} meses antes del mínimo de agua.`, `What it says here: the light warned ${val.lead1} months before the water low.`) : L('Qué dice aquí: el semáforo no avisó antes del mínimo.', 'What it says here: the light did not warn before the low.')} next={L('Si la cobertura real queda por debajo del 90 %, trata los rangos como orientativos y confirma con datos de campo.', 'If real coverage is below 90 %, treat the ranges as indicative and confirm with field data.')} />
            <p className="mini">{L('Línea verde: riesgo (balance de agua y temperatura de los últimos 12 meses frente a lo normal, calculado solo con datos pasados). Línea azul: balance de agua de 12 meses. “Periodo seco” = el 15 % más bajo de toda la historia. Versión simplificada del semáforo.', 'Green line: risk (water balance and temperature of the last 12 months versus normal, computed only with past data). Blue line: 12-month water balance. “Dry period” = the lowest 15 % of the whole record. Simplified version of the traffic light.')} {!A.live && <b>{L('Con datos de práctica esto es solo un ejemplo.', 'With practice data this is only an example.')}</b>}</p>
          </>) : <p className="mini">{L('Elige un año anterior: se necesitan al menos 24 meses para revisar.', 'Choose an earlier year: at least 24 months are needed to review.')}</p>}
        </div>

        <h2 className="blockh">{L('Lenguaje de la Tierra (EEL)', 'Earth Language (EEL)')}<span>{L('Cada lago se resume en 8 números comparables: altitud, tamaño, agua, tendencia, temperatura, calentamiento, estaciones y variabilidad. Con ese “idioma común” se pueden comparar lagos distintos.', 'Each lake is summarised in 8 comparable numbers: altitude, size, water, trend, temperature, warming, seasons and variability. With that “common language” different lakes can be compared.')}</span></h2>
        <div className="card panel">
          {!sweep && (<div className="eel-empty"><p>{L('Para construir el mapa del lenguaje hay que analizar todos los lagos del inventario. En modo práctica tarda segundos; con datos reales, uno o dos minutos.', 'To build the language map all lakes in the inventory must be analysed. In practice mode it takes seconds; with real data, a minute or two.')}</p>
            <Button size="lg" color="forest" leftSection={<IconRadar2 size={20} />} loading={prog != null} onClick={runSweep}>{L('Analizar todos los lagos', 'Analyse all lakes')}</Button>{prog != null && <Progress value={prog} color="forest" mt="sm" animated />}</div>)}
          {sweep && (<>
            <div className="duo even" style={{ marginTop: 0 }}>
              <div><h4 className="sh">{iT >= 0 ? L(`Perfil de ${tgt.name} frente al promedio`, `Profile of ${tgt.name} versus the average`) : L('Elige un lago para ver su perfil', 'Choose a lake to see its profile')}</h4>
                {eelOpt ? <EChart option={eelOpt} deps={[eelOpt]} h={330} explanation={{ title: L('Huella ambiental de ', 'Environmental fingerprint of ') + tgt.name, facts: explanationContext + '\n' + echartsFacts(eelOpt) + `; ${sweep.rows.length} lakes in the comparison; axes are standardised deviations across the inventory, clipped to -3 to 3; reference is zero, not an absolute physical measurement`, how: L('Cada radio es una característica normalizada. El cero es el promedio de los lagos comparados; valores positivos o negativos indican diferencias respecto de ese promedio.', 'Each spoke is a standardised characteristic. Zero is the average of the compared lakes; positive or negative values indicate differences from that average.'), plain: L('La forma ayuda a comparar perfiles. No mide por sí sola riesgo ni demuestra una causa.', 'The shape helps compare profiles. It does not by itself measure risk or demonstrate a cause.') }} /> : <p className="mini">{L('Este lugar no está en el inventario de lagos.', 'This place is not in the lake inventory.')}</p>}
                {iT >= 0 && <code className="eelcode">{eelCode(space.Z[iT])}</code>}</div>
              <div><h4 className="sh">{L('Mapa del lenguaje: cada punto es un lago (toca uno)', 'Language map: each dot is a lake (tap one)')}</h4>
                <EChart option={mapOpt} deps={[mapOpt]} h={330} explanation={{ title: L('Mapa del lenguaje ambiental', 'Environmental language map'), facts: explanationContext + '\n' + echartsFacts(mapOpt) + `; PCA explained variance: axis 1 ${Math.round(space.expl[0] * 100)}%, axis 2 ${Math.round(space.expl[1] * 100)}%; points are lakes in a statistical projection, not geographic coordinates; colours identify lake types`, how: L('Los puntos cercanos tienen perfiles parecidos en esta proyección. Los ejes no son latitud ni longitud, y parte de la información queda fuera del plano.', 'Nearby points have similar profiles in this projection. Axes are not latitude or longitude, and some information remains outside the plane.'), plain: L('La cercanía sugiere perfiles comparables, no una causa compartida ni una clasificación oficial.', 'Proximity suggests comparable profiles, not a shared cause or an official classification.') }} onClick={(e) => e.data?.id && pick(e.data.id)} />
                <div className="legend">{Object.entries(TYPES).map(([k, v]) => <span key={k}><i style={{ background: v[2] }} />{v[lang === 'es' ? 0 : 1]}</span>)}</div></div>
            </div>
            {sim.length > 0 && <><h4 className="sh">{L('Los lagos que más se parecen', 'The most similar lakes')}</h4>
              <div className="simrow">{sim.map((o) => <button key={o.r.id} className="simc" onClick={() => pick(o.r.id)}><b>{o.r.name}</b><Progress value={Math.max(0, o.s) * 100} color="forest" size="sm" radius="xl" /><span>{Math.round(Math.max(0, o.s) * 100)} % {L('similar', 'similar')}</span></button>)}</div><Interpret kind="table" title={L('Comparación de lagos similares', 'Similar-lake comparison')} facts={explanationContext + '\n' + tableFacts(['lake', 'displayed cosine similarity %'], sim.map((o) => [o.r.name, Math.round(Math.max(0, o.s) * 100)])) + '; similarity is a cosine score, not a probability of equal climate or safety'} how={L('Cada tarjeta es un lago comparado por su perfil ambiental. El porcentaje resume similitud, no seguridad ni probabilidad de compartir una causa.', 'Each card is a lake compared by environmental profile. The percentage summarises similarity, not safety or the probability of a shared cause.')} plain={L('Usa los parecidos para buscar una segunda comparación y luego confirma con datos del lugar.', 'Use similarities to find another comparison, then confirm with local data.')} /></>}
            <p className="mini">{L('Cada eje se estandariza entre lagos (σ). La similitud es el coseno entre vectores. El mapa es una proyección (componentes principales). Es una representación para comparar, no una clasificación oficial.', 'Each axis is standardised across lakes (σ). Similarity is the cosine between vectors. The map is a projection (principal components). It is a representation for comparing, not an official classification.')}</p>
          </>)}
        </div>

        <h2 className="blockh">{L('¿Qué no estamos viendo?', 'What are we missing?')}<span>{L('La app revisa todos los lagos sin que se lo pidas y propone hipótesis, vacíos de conocimiento y qué observar después. Son hipótesis para investigar, no conclusiones.', 'The app reviews all lakes without being asked and proposes hypotheses, knowledge gaps and what to observe next. They are hypotheses to investigate, not conclusions.')}</span></h2>
        {!sweep && <div className="card panel eel-empty"><p>{L('Este panel se llena cuando analizas todos los lagos (botón de arriba).', 'This panel fills in once you analyse all lakes (button above).')}</p></div>}
        {sweep?.practice && <Alert color="blue" radius="lg" mb="sm">{L('Con datos de práctica (simulados) estos hallazgos son solo un ejemplo de cómo funciona. Con NASA POWER real serán hallazgos del territorio.', 'With practice (simulated) data these findings are only an example of how it works. With real NASA POWER they will be findings about the territory.')}</Alert>}
        {sweep && <div className="disc">{disc.map((d, i) => { const I2 = DI[d.kind] || IconSparkles; return (
          <motion.div key={d.t} className="dc card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
            <span className="dc-ico"><I2 size={24} /></span><span className="dc-tag">{L('Hipótesis', 'Hypothesis')}</span>
            <h3>{d.t}</h3><p>{d.b}</p><p className="dc-next"><IconTelescope size={16} />{d.next}</p>
            {d.lakes.length > 0 && <div className="dc-l">{d.lakes.slice(0, 5).map((id) => <button key={id} onClick={() => pick(id)}>{sweep.rows.find((r) => r.id === id)?.name}</button>)}</div>}
          </motion.div>); })}</div>}

        <h2 className="blockh" id="pasaporte">{L('Pasaporte de evidencia', 'Evidence passport')}<span>{L('Cada resultado lleva su identidad: de dónde salieron los datos, qué métodos y parámetros se usaron, cómo se validó y qué limitaciones tiene. Cualquiera puede reconstruirlo.', 'Each result carries its identity: where the data came from, which methods and parameters were used, how it was validated and its limitations. Anyone can rebuild it.')}</span></h2>
        {pass && (<div className="pass card">
          <div className="pass-h"><div><span className="ph-eyebrow dark">{L('Identificador', 'Identifier')}</span><b className="pass-id">{pass.id}</b></div>
            <div className="pass-b"><Button variant="default" leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />} onClick={cp}>{copied ? L('Copiado', 'Copied') : L('Copiar ID', 'Copy ID')}</Button><Button color="forest" leftSection={<IconDownload size={16} />} onClick={dl}>{L('Descargar pasaporte (JSON)', 'Download passport (JSON)')}</Button><Button variant="default" leftSection={lnk ? <IconCheck size={16} /> : <IconCopy size={16} />} onClick={copyLink}>{lnk ? L('Enlace copiado', 'Link copied') : L('Copiar enlace del caso', 'Copy case link')}</Button><Button variant="default" leftSection={<IconDownload size={16} />} onClick={dlCsv}>{L('Serie analizada (CSV)', 'Analysed series (CSV)')}</Button><Button variant="default" leftSection={<IconDownload size={16} />} onClick={report}>{L('Informe del caso (PDF)', 'Case report (PDF)')}</Button></div></div>
          <div className="pass-g">
            <div><span>{L('Territorio', 'Territory')}</span><b>{pass.territorio.nombre}</b><small>{pass.territorio.lat.toFixed(2)}°, {pass.territorio.lon.toFixed(2)}°</small></div>
            <div><span>{L('Periodo y fuente', 'Period and source')}</span><b>{pass.periodo}</b><small>{pass.fuentes[0]}</small></div>
            <div><span>{L('Métodos', 'Methods')}</span><b>{pass.metodos.length}</b><small>{pass.metodos.map((m) => m.nombre.split(' (')[0]).join(' · ')}</small></div>
            <div><span>{L('Validación', 'Validation')}</span><b>{pass.validacion ? `${Math.round(pass.validacion.cobertura_90 * 100)} %` : '—'}</b><small>{pass.validacion ? L('de cobertura en los últimos 5 años (ideal 90 %)', 'coverage over the last 5 years (ideal 90 %)') : L('serie corta', 'short series')}</small></div>
          </div>
          <h4 className="sh">{L('Limitaciones conocidas', 'Known limitations')}</h4>
          <ul className="lims">{pass.limitaciones.map((x) => <li key={x}>{x}</li>)}</ul>
          <Interpret kind="table" title={L('Pasaporte de evidencia de ', 'Evidence passport for ') + tgt.name} facts={JSON.stringify({ place: pass.territorio.nombre, period: pass.periodo, sources: pass.fuentes, methods: pass.metodos, validation: pass.validacion, limitations: pass.limitaciones })} how={L('La ficha reúne fuente, periodo, métodos y validación del mismo resultado. La cobertura observada del intervalo debe compararse con su nivel nominal.', 'The record brings together source, period, methods and validation of the same result. Observed interval coverage should be compared with its nominal level.')} plain={L('El pasaporte permite reconstruir el resultado y ver sus límites. No certifica el nivel del lago ni sustituye mediciones de campo.', 'The passport lets you reconstruct the result and see its limits. It does not certify lake level or replace field measurements.')} />
        </div>)}
        <p className="mini" style={{ marginTop: 14 }}>{L('Esta herramienta apoya la decisión con evidencia; no reemplaza a la autoridad competente ni a la medición de campo.', 'This tool supports decisions with evidence; it does not replace the competent authority or field measurement.')}</p>
      </>)}
    </div></section>
  );
}
