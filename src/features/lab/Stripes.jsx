import { motion } from 'framer-motion';
import { scale } from '../../lib/analysis/viz';
export default function Stripes({ vals, years, k, height = 120, labels = true, dec = 2, unit = '' }) {
  const m = Math.max(...vals.map(Math.abs)) || 1, col = scale(k);
  return (
    <div>
      <div style={{ display: 'flex', height, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(40,70,160,.18)' }}>
        {vals.map((v, i) => <motion.div key={i} title={`${years[i]}: ${v > 0 ? '+' : ''}${v.toFixed(dec)} ${unit}`} style={{ flex: 1, background: col(v, m), transformOrigin: 'bottom' }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.015, duration: 0.5 }} whileHover={{ filter: 'brightness(1.12)' }} />)}
      </div>
      {labels && <div className="row mini" style={{ justifyContent: 'space-between', marginTop: 4 }}><span>{years[0]}</span><span>{years[years.length - 1]}</span></div>}
    </div>
  );
}
