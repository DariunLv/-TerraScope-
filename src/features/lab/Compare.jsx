import { useState } from 'react';
import { Button, Select } from '@mantine/core';
import { motion } from 'framer-motion';
import * as S from '../../lib/analysis/stats';
import { PLACES, V, power, demo } from '../../lib/nasa/data';
import { useT } from '../../core/i18n';
import { useStore } from '../../core/store';
import { scale } from '../../lib/analysis/viz';
export default function Compare({ k, a, aName, years, ds, live }) {
  const { t, lang } = useT();
  const [bid, setBid] = useState('art'); const [b, setB] = useState(null); const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); const p = PLACES.find((x) => x.id === bid); let d;
    try { if (live && !useStore.getState().practice) d = (await power(p.lat, p.lon, [k], years[0], years[1]))[k]; } catch { /* demo */ }
    if (!d) d = demo(p.lat, p.lon, [k], years[0], years[1])[k];
    setB({ r: S.analyze(d, { deseason: ds }), name: p[lang] }); setBusy(false);
  };
  const W = 600, H = 200, P = 34;
  let body = null;
  if (b && a.annual && b.r.annual) {
    const A = a.annual, B = b.r.annual, xs = [...A.years, ...B.years], x0 = Math.min(...xs), x1 = Math.max(...xs);
    const all = [...A.y, ...B.y], lo = Math.min(...all), hi = Math.max(...all);
    const sx = (x) => P + ((x - x0) / (x1 - x0)) * (W - P - 8), sy = (v) => H - 18 - ((v - lo) / (hi - lo || 1)) * (H - 30);
    const path = (an) => 'M' + an.years.map((yr, i) => `${sx(yr)},${sy(an.y[i])}`).join('L');
    const ratio = Math.abs(b.r.perDec) / (Math.abs(a.perDec) || 1e-9);
    body = (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
          <path d={path(A)} stroke="#0c5a43" strokeWidth="3" fill="none" /><path d={path(B)} stroke="#c2410c" strokeWidth="3" fill="none" />
          <text x={P} y="12" fontSize="13" fill="#0c5a43" fontWeight="700">A · {aName}: {a.perDec > 0 ? '+' : ''}{a.perDec.toFixed(V[k].d)}</text>
          <text x={W / 2 + 20} y="12" fontSize="13" fill="#c2410c" fontWeight="700">B · {b.name}: {b.r.perDec > 0 ? '+' : ''}{b.r.perDec.toFixed(V[k].d)}</text>
        </svg>
        <p className="mini" style={{ fontSize: 14 }}><b>{ratio >= 1 ? t.ratio(ratio.toFixed(1)) : t.ratioSlow((1 / ratio).toFixed(1))}</b> ({V[k].u} {t.per})</p>
      </motion.div>
    );
  }
  return (
    <div className="cmp">
      <h3>{t.compTitle} · {V[k][lang][0]}</h3>
      <div className="row"><Select data={PLACES.map((p) => ({ value: p.id, label: p[lang] }))} value={bid} onChange={setBid} allowDeselect={false} label={t.compPlace} /><Button loading={busy} onClick={go} mt={22} variant="light">{t.compGo}</Button></div>
      {body}
    </div>
  );
}
