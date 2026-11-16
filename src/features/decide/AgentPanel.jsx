/* Centinela IA: botón en la barra superior + panel lateral con el ciclo de descubrimiento, lo que cambió,
   lo que nadie pidió buscar, qué dato falta y cómo van las predicciones verificadas. */
import { LEVELS } from '../lakes/lakeclim';
import { useEffect, useState } from 'react';
import { Drawer, Switch, Progress, Button } from '@mantine/core';
import { IconRadar2, IconEye, IconSparkles, IconTelescope, IconChecks, IconRefresh, IconArrowRight, IconBrain, IconSearch, IconBulb, IconTargetArrow, IconShieldCheck } from '@tabler/icons-react';
import Killa from '../../killa/Killa';
import Interpret from '../../shared/Interpret';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
import { runCycle, STEPS, nextRunIn } from './agent';
import { discover, LV } from './decideEngine';

const ST = { observe: [IconEye, 'Observar', 'Observe'], learn: [IconBrain, 'Aprender', 'Learn'], discover: [IconSearch, 'Descubrir', 'Discover'], hypothesis: [IconBulb, 'Hipótesis', 'Hypotheses'], evidence: [IconTargetArrow, 'Evidencia', 'Evidence'], verify: [IconShieldCheck, 'Verificar', 'Verify'] };
const ago = (t, L) => { if (!t) return L('todavía no', 'not yet'); const m = Math.round((Date.now() - t) / 60e3); return m < 1 ? L('hace instantes', 'just now') : m < 60 ? L(`hace ${m} min`, `${m} min ago`) : L(`hace ${Math.round(m / 60)} h`, `${Math.round(m / 60)} h ago`); };

export function SentinelButton() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const a = useStore((s) => s.agent), [open, setOpen] = useState(false), clear = useStore((s) => s.clearUnseen);
  const run = a.status === 'running';
  return (<>
    <button className={'sentinel' + (run ? ' run' : '') + (a.unseen ? ' alert' : '')} onClick={() => { setOpen(true); clear(); }} aria-label={L('Abrir el Centinela IA', 'Open the AI Sentinel')}>
      <IconRadar2 size={18} /><span>{L('Centinela', 'Sentinel')}</span>{a.unseen > 0 ? <b>{a.unseen}</b> : <i />}
    </button>
    <Panel opened={open} onClose={() => setOpen(false)} />
  </>);
}

function Panel({ opened, onClose }) {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const a = useStore((s) => s.agent), setAuto = useStore((s) => s.setAgentAuto), setView = useStore((s) => s.setView), setLake = useStore((s) => s.setLake);
  const [, force] = useState(0); useEffect(() => { if (!opened) return; const t = setInterval(() => force((x) => x + 1), 15e3); return () => clearInterval(t); }, [opened]);
  const run = a.status === 'running', idx = STEPS.indexOf(a.step), finds = a.rows ? discover(a.rows, a.space, L).slice(0, 3) : [];
  const ev = (e) => e.kind === 'change' ? (() => { const sg = (z) => (z > 0 ? '+' : '−') + Math.abs(z ?? 0).toFixed(1); return L(`${e.name} pasó de ${LEVELS[e.from][0]} a ${LEVELS[e.to][0]}. Dato: balance de agua de 12 meses z = ${sg(e.zw)}, temperatura z = ${sg(e.zt)} (Vigilar desde |z| ≥ 1,5; Alerta desde |z| ≥ 2,5). Mide el clima reciente; el riesgo del próximo año está en Decidir.`, `${e.name} went from ${LEVELS[e.from][1]} to ${LEVELS[e.to][1]}. Data: 12-month water balance z = ${sg(e.zw)}, temperature z = ${sg(e.zt)} (Watch from |z| ≥ 1.5; Alert from |z| ≥ 2.5). It measures recent climate; next-year risk is in Decide.`); })() : e.kind === 'first' ? L(`Primera revisión: ${e.n} lagos observados.`, `First review: ${e.n} lakes observed.`) : L(`Verificación ${e.year} de ${e.name}: predijo ${e.pred} mm, se observó ${e.obs} mm. ${e.ok ? 'Acertó.' : 'Se equivocó: se registra para aprender.'}`, `Check ${e.year} for ${e.name}: predicted ${e.pred} mm, observed ${e.obs} mm. ${e.ok ? 'Correct.' : 'Wrong: logged to learn from.'}`);
  const need = (n) => ({ station: L('una estación meteorológica cercana', 'a nearby weather station'), radar: L('radar Sentinel-1 (atraviesa nubes) o mapas ópticos OPERA DSWx-HLS (necesitan cielo despejado) para medir el lago', 'Sentinel-1 radar (sees through clouds) or optical OPERA DSWx-HLS maps (need clear sky) to measure the lake'), second: L('una segunda fuente (IMERG) para confirmar', 'a second source (IMERG) to confirm') })[n];
  const counts = a.rows ? [0, 1, 2].map((v) => a.rows.filter((r) => r.level === v).length) : [0, 0, 0];
  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="md" padding={0} withCloseButton={false} overlayProps={{ opacity: 0.25, blur: 2 }} zIndex={400}>
      <div className="sp">
        <div className="sp-h"><span className="sp-ico"><Killa estado={a.status === 'running' ? 'radar' : a.unseen > 0 ? 'alerta' : 'confirmado'} size={78} shadow={false} /></span><div><b>{L('Centinela IA', 'AI Sentinel')}</b><small>{L('Vigila solo mientras la app está abierta', 'Watches on its own while the app is open')}</small></div><button className="sp-x" onClick={onClose} aria-label={L('Cerrar', 'Close')}>×</button></div>
        <div className="sp-b">
          <div className="sp-row"><Switch color="forest" size="md" checked={a.auto} onChange={(e) => setAuto(e.currentTarget.checked)} label={L('Vigilancia continua (cada 15 min)', 'Continuous watch (every 15 min)')} /></div>
          <div className="sp-stat">{run ? <><b>{L('Revisando…', 'Reviewing…')}</b><span>{ST[a.step]?.[lang === 'es' ? 1 : 2]} · {a.pct}%</span></> : <><b>{L('Última revisión', 'Last review')}: {ago(a.last, L)}</b><span>{a.auto ? L(`próxima en ${nextRunIn(a.last)} min`, `next in ${nextRunIn(a.last)} min`) : L('vigilancia pausada', 'watch paused')}</span></>}</div>
          {run && <Progress value={a.pct} color="forest" size="sm" animated />}
          <ol className="sp-loop">{STEPS.map((s, i) => { const I = ST[s][0]; return <li key={s} className={(run && i === idx ? 'on ' : '') + (!run && a.last ? 'ok ' : run && i < idx ? 'ok' : '')}><span><I size={16} /></span>{ST[s][lang === 'es' ? 1 : 2]}</li>; })}</ol>
          {a.rows && <div className="sp-kpis">{[2, 1, 0].map((v) => <div key={v} style={{ '--c': LV[v].c }}><b>{counts[v]}</b><span>{LV[v][lang]}</span></div>)}</div>}
          {a.rows?.length > 0 && !run && <Interpret kind="table" title={L('Resumen del Centinela', 'Sentinel summary')} facts={JSON.stringify({ source: a.src, lastReview: a.last, reviewedLakes: a.rows.length, missing: a.missing, normal: counts[0], watch: counts[1], alert: counts[2], forecastChecks: a.ledger, note: 'Sentinel levels describe recent climate anomalies, not the Decide risk index; logged forecasts use a nominal 90% interval, not a guarantee' })} how={L('Los conteos resumen la revisión del Centinela. La verificación compara pronósticos anteriores con datos que llegaron después.', 'Counts summarise the Sentinel review. Verification compares earlier forecasts with data that arrived later.')} plain={L('Una alerta prioriza qué confirmar; la cobertura de un intervalo no garantiza que todos los próximos pronósticos acierten.', 'An alert prioritises what to confirm; interval coverage does not guarantee every next forecast will succeed.')} />}
          <h4 className="sp-t"><IconSparkles size={16} />{L('Qué cambió', 'What changed')}</h4>
          {a.log.length === 0 ? <p className="sp-m">{L('Aún no hay cambios. El Centinela compara cada revisión con la anterior.', 'No changes yet. The Sentinel compares each review with the previous one.')}</p> : <ul className="sp-ev">{a.log.slice(0, 5).map((e, i) => <li key={i}>{ev(e)}</li>)}</ul>}
          <h4 className="sp-t"><IconSearch size={16} />{L('Lo que nadie pidió buscar', 'What nobody asked to look for')}</h4>
          {finds.length === 0 ? <p className="sp-m">{L('Se llena al terminar la primera revisión.', 'Fills in after the first review.')}</p> : <ul className="sp-ev">{finds.map((f) => <li key={f.t}><b>{f.t}</b><br />{f.b}</li>)}</ul>}
          {a.needs?.length > 0 && <><h4 className="sp-t"><IconTelescope size={16} />{L('Qué dato necesita ahora', 'What data it needs now')}</h4>
            <ul className="sp-ev">{a.needs.map((n) => <li key={n.id}><b>{n.name}</b>: {need(n.why)}.</li>)}</ul></>}
          <h4 className="sp-t"><IconChecks size={16} />{L('Verificación de lo que predijo', 'Checking what it predicted')}</h4>
          <p className="sp-m">{a.ledger.total > 0 ? L(`${a.ledger.hits} de ${a.ledger.total} predicciones acertaron (el rango del 90 %).`, `${a.ledger.hits} of ${a.ledger.total} predictions were right (the 90 % range).`) : L(`${a.ledger.pending} predicciones anotadas. Se verificarán solas cuando lleguen los datos del año pronosticado.`, `${a.ledger.pending} predictions logged. They will verify themselves when data for the forecast year arrives.`)}</p>
          <div className="sp-btns">
            <Button color="forest" size="md" leftSection={<IconRefresh size={18} />} loading={run} onClick={() => runCycle({ refresh: true })}>{L('Revisar ahora', 'Review now')}</Button>
            <Button variant="default" size="md" rightSection={<IconArrowRight size={16} />} onClick={() => { onClose(); setView('decidir'); setTimeout(() => document.querySelector('.disc')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600); }}>{L('Ver todos los hallazgos', 'See all findings')}</Button>
          </div>
          <p className="sp-m">{a.src === 'unavailable' ? L('No se pudieron cargar datos reales. Reintenta o activa Práctica.', 'Real data could not be loaded. Retry or enable Practice.') : a.src === 'demo' || !a.src ? L('Usa datos de práctica (simulados). Con datos reales, los hallazgos describen el territorio.', 'Using practice (simulated) data. With real data, findings describe the territory.') : L('Usa datos reales de NASA POWER.', 'Using real NASA POWER data.')}{a.missing > 0 && L(` ${a.missing} lugares sin evaluar.`, ` ${a.missing} locations not assessed.`)}{a.limited && L(' La revisión automática está limitada a 200 lugares por ciclo.', 'Automatic review is limited to 200 locations per cycle.')}</p>
        </div>
      </div>
    </Drawer>
  );
}
