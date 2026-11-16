import { motion } from 'framer-motion';
import Ghost from '../../ui/Ghost';
import SpotlightCard from '../../ui/SpotlightCard';
import { useT } from '../../core/i18n';
import { useTheme } from '../../core/palette';
const pts = [10, 14, 12, 18, 16, 22, 21, 27, 26, 32];
function Trend() { const d = 'M' + pts.map((v, i) => `${10 + i * 28},${70 - v * 1.6}`).join('L'); return (<svg viewBox="0 0 300 80" width="100%"><motion.path d={d} fill="none" stroke="#0c5a43" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6 }} /><line x1="10" y1="62" x2="280" y2="22" stroke="#f59e0b" strokeDasharray="6 5" strokeWidth="2.5" /></svg>); }
function PGauge() { return (<svg viewBox="0 0 200 80" width="100%"><rect x="10" y="30" width="180" height="16" rx="8" fill="#e6ecfb" /><rect x="10" y="30" width="9" height="16" rx="4" fill="#12b886" /><motion.circle cx="14" cy="38" r="9" fill="#12b886" initial={{ cx: 120 }} whileInView={{ cx: 14 }} viewport={{ once: true }} transition={{ duration: 1.4, type: 'spring' }} /><text x="10" y="68" fontSize="12" fill="#12b886" fontWeight="700">0.05</text><text x="150" y="68" fontSize="12" fill="#5b6b8c">1.0</text></svg>); }
function Interval() { return (<svg viewBox="0 0 200 80" width="100%"><line x1="100" y1="8" x2="100" y2="72" stroke="#f0506e" strokeDasharray="4 4" /><motion.rect x="116" y="32" width="64" height="14" rx="7" fill="#1e3a8a" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} style={{ transformOrigin: '116px 39px' }} transition={{ duration: 1 }} /><rect x="60" y="52" width="80" height="12" rx="6" fill="#f59e0bAA" /><text x="104" y="22" fontSize="11" fill="#f0506e">0</text></svg>); }
function Memory() { const v = [30, 36, 42, 38, 46, 52, 48, 40, 34, 28]; return (<svg viewBox="0 0 300 80" width="100%">{v.map((y, i) => <motion.circle key={i} cx={20 + i * 28} cy={80 - y} r="6" fill="#1e3a8a" initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} />)}</svg>); }
export default function Bento() {
  const theme = useTheme();
  const { t } = useT();
  const V = [Trend, PGauge, Interval, Memory];
  return (
    <div className="bento">
      {t.learnBento.map((c, i) => { const X = V[i]; return (
        <motion.div key={c.title} className={'bi b' + i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
          <SpotlightCard theme={theme} className="bcard"><Ghost k={['trend','sun','shield','brain','book','radar'][i % 6]} i={i} size={120} pos={i} /><div className="bviz"><X /></div><h3 style={{ margin: '8px 0 2px' }}>{c.title}</h3><p className="mini" style={{ fontSize: 14, margin: 0 }}>{c.description}</p></SpotlightCard>
        </motion.div>); })}
    </div>
  );
}
