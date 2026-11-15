import { motion } from 'framer-motion';
import { IconCheck } from '@tabler/icons-react';
import SpotlightCard from '../rb/SpotlightCard';
import { useT } from '../i18n';
import { useTheme } from '../palette';
export default function Reto() {
  const theme = useTheme();
  const { t } = useT();
  return (
    <section id="reto"><div className="wrap">
      <h2>{t.retoTitle}</h2><p className="sub">{t.retoSub}</p>
      <div className="reto">
        {t.reto.map(([a, b], i) => (
          <motion.div key={a} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
            <SpotlightCard theme={theme} className="rt"><div className="chk"><IconCheck size={18} /></div><div><b>{a}</b><div className="mini" style={{ fontSize: 14 }}>{b}</div></div></SpotlightCard>
          </motion.div>
        ))}
      </div>
    </div></section>
  );
}
