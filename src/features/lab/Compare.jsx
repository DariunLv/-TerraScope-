import Interpret from '../../shared/Interpret';
import { useEffect, useState } from 'react';
import { Alert, Button, Select } from '@mantine/core';
import { motion } from 'framer-motion';
import { PLACES, V, power, demo } from '../../lib/nasa/data';
import { useT } from '../../core/i18n';
import { useStore } from '../../core/store';
import { useRequest, aborted } from '../../core/useRequest';
import { runAnalysis } from '../../lib/analysis/run';
export default function Compare({ k, a, aName, years, ds, live }) {
  const { t, lang } = useT();
  const practice = useStore((state) => state.practice);
  const [bid, setBid] = useState('art'); const [b, setB] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const begin = useRequest([k, a, bid, years[0], years[1], ds, live, practice]);
  useEffect(() => { setB(null); setBusy(false); setError(''); }, [k, a, bid, years[0], years[1], ds, live, practice]);
  const go = async () => {
    const request = begin(), p = PLACES.find((x) => x.id === bid);
    if (!p) return;
    setBusy(true); setError('');
    try {
      const data = practice ? demo(p.lat, p.lon, [k], years[0], years[1]) : await power(p.lat, p.lon, [k], years[0], years[1], { signal: request.signal });
      if (!data[k]?.length) throw new Error('NO_DATA');
      const result = await runAnalysis('analyze', { items: [{ k, points: data[k] }], options: { deseason: ds } }, { signal: request.signal });
      if (!result.length) throw new Error('NO_DATA');
      if (request.current()) setB({ r: result[0].r, place: p });
    } catch (err) { if (request.current() && !aborted(err)) setError(lang === 'es' ? 'No se pudo cargar esta comparación. Reintenta o activa Práctica.' : 'This comparison could not be loaded. Retry or enable Practice.'); }
    finally { if (request.current()) setBusy(false); }
  };
  const W = 600, H = 200, P = 34;
  let body = null;
  if (b && a.annual && b.r.annual) {
    const A = a.annual, B = b.r.annual, xs = [...A.years, ...B.years], x0 = Math.min(...xs), x1 = Math.max(...xs);
    const all = [...A.y, ...B.y], lo = Math.min(...all), hi = Math.max(...all);
    const sx = (x) => P + ((x - x0) / (x1 - x0 || 1)) * (W - P - 8), sy = (v) => H - 18 - ((v - lo) / (hi - lo || 1)) * (H - 30);
    const path = (an) => 'M' + an.years.map((yr, i) => `${sx(yr)},${sy(an.y[i])}`).join('L');
    const ratio = Math.abs(a.perDec) > 1e-9 && Math.abs(b.r.perDec) > 1e-9 ? Math.abs(b.r.perDec / a.perDec) : null;
    body = (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
          <path d={path(A)} stroke="#0c5a43" strokeWidth="3" fill="none" /><path d={path(B)} stroke="#c2410c" strokeWidth="3" fill="none" />
          <text x={P} y="12" fontSize="13" fill="#0c5a43" fontWeight="700">A · {aName}: {a.perDec > 0 ? '+' : ''}{a.perDec.toFixed(V[k].d)}</text>
          <text x={W / 2 + 20} y="12" fontSize="13" fill="#c2410c" fontWeight="700">B · {b.place[lang]}: {b.r.perDec > 0 ? '+' : ''}{b.r.perDec.toFixed(V[k].d)}</text>
        </svg>
        <p className="mini" style={{ fontSize: 14 }}><b>{ratio == null ? '—' : ratio >= 1 ? t.ratio(ratio.toFixed(1)) : t.ratioSlow((1 / ratio).toFixed(1))}</b> ({V[k].u} {t.per})</p>
      </motion.div>
    );
  }
  return (
    <div className="cmp">
      <h3>{t.compTitle} · {V[k][lang][0]}</h3>
      <div className="row"><Select data={PLACES.map((p) => ({ value: p.id, label: p[lang] }))} value={bid} onChange={setBid} allowDeselect={false} label={t.compPlace} /><Button loading={busy} onClick={go} mt={22} variant="light">{t.compGo}</Button></div>
      {error && <Alert color="orange">{error}</Alert>}
      {body}
      {body && <Interpret title={t.compTitle + ' · ' + V[k][lang][0]} facts={`${V[k][lang][0]}; unit ${V[k].u}; A ${aName}, ${live ? 'NASA POWER model' : 'practice simulation'}, annual coverage ${a.annual.years[0]}-${a.annual.years.at(-1)}, Sen trend ${a.perDec} ${V[k].u}/decade; B ${b.place[lang]}, ${practice ? 'practice simulation' : 'NASA POWER model'}, annual coverage ${b.r.annual.years[0]}-${b.r.annual.years.at(-1)}, Sen trend ${b.r.perDec} ${V[k].u}/decade; if sources differ, do not present this as two real-world observations`} how={lang==='es' ? 'Cada línea representa las medias anuales de un lugar, con la misma unidad. Compara periodos y fuentes antes de comparar pendientes.' : 'Each line shows one place’s annual means in the same unit. Compare periods and sources before comparing slopes.'} plain={lang==='es' ? 'Una pendiente mayor en magnitud indica un cambio más rápido en esa serie, pero no identifica su causa.' : 'A larger slope magnitude indicates faster change in that series, but does not identify its cause.'} />}
    </div>
  );
}
