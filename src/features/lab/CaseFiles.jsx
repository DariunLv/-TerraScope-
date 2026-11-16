import { IconMountain, IconSnowflake, IconPlant2, IconTrees, IconArrowRight } from '@tabler/icons-react';
import Ghost from '../../ui/Ghost';
import { motion } from 'framer-motion';
import SpotlightCard from '../../ui/SpotlightCard';
import { PLACES } from '../../lib/nasa/data';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
import { useState } from 'react';
import PlacePicker from './PlacePicker';
const IC = { mountain: IconMountain, snow: IconSnowflake, wheat: IconPlant2, trees: IconTrees };
export default function CaseFiles() {
  const { t } = useT(); const openCase = useStore((s) => s.openCase);
  const [hov, setHov] = useState(null);
  const go = (c) => { const p = PLACES.find((x) => x.id === c.id); openCase(c, { id: p.id, lat: p.lat, lon: p.lon }); };
  const pts = t.cases.map((c) => { const p = PLACES.find((x) => x.id === c.id); return p && { id: c.id, lat: p.lat, lon: p.lon, label: c.n }; }).filter(Boolean);
  return (<>
    <PlacePicker places={pts} sel={hov} onSelect={(id) => setHov(id)} height={300} />
    <div className="cases" style={{ marginTop: 12 }}>
      {t.cases.map((c, i) => { const I = IC[c.ic]; return (
        <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
          <SpotlightCard theme="light" className="case" onMouseEnter={() => setHov(c.id)} onClick={() => go(c)} style={{ cursor: 'pointer', height: '100%' }}>
            <Ghost k={['snow','fire','water','sun','rain','leaf','mountain'][i % 7]} i={i} size={120} pos={i} /><div className="icobox"><I size={28} /></div><h3 style={{ margin: '8px 0' }}>{c.n}</h3><p className="mini" style={{ fontSize: 14 }}>{c.d}</p>
            <span className="go">{t.open} <IconArrowRight size={16} /></span>
          </SpotlightCard>
        </motion.div>); })}
    </div>
  </>);
}
