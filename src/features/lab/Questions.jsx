import { useMemo, useState } from 'react';
import { Button } from '@mantine/core';
import { IconCactus, IconTrees, IconBuildingSkyscraper, IconMountain, IconRipple, IconSnowflake, IconDroplet, IconFlame, IconPlant2, IconSolarPanel, IconSearch } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { V, PLACES } from '../../lib/nasa/data';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
import PlacePicker from './PlacePicker';
import { useRouteState } from '../../core/useRouteState';
const B = [['desert', IconCactus, 'Desierto o zona seca', 'Desert or dryland'], ['forest', IconTrees, 'Selva o bosque', 'Rainforest'], ['city', IconBuildingSkyscraper, 'Gran ciudad', 'Large city'], ['mountain', IconMountain, 'Alta montaña', 'High mountain'], ['coast', IconRipple, 'Costa, delta o estuario', 'Coast, delta or estuary'], ['polar', IconSnowflake, 'Zona polar', 'Polar region']];
const C = [['agua', IconDroplet, 'Agua y sequía', 'Water & drought', ['PRECTOTCORR', 'GWETROOT', 'RH2M']], ['calor', IconFlame, 'Calor', 'Heat', ['T2M_MAX', 'T2M_MIN', 'TS']], ['agro', IconPlant2, 'Agricultura', 'Farming', ['GWETROOT', 'T2M_MIN', 'PRECTOTCORR']], ['energia', IconSolarPanel, 'Energía solar y viento', 'Solar & wind energy', ['ALLSKY_SFC_SW_DWN', 'WS10M', 'CLOUD_AMT']]];
const EXTRA = { desert: ['T2M_MAX'], forest: ['CLOUD_AMT'], city: ['T2M_MIN'], mountain: ['TS'], coast: ['QV2M'], polar: ['T2M'] };
const WHY = { es: { desert: 'En zonas secas, pequeños cambios de lluvia o calor pesan mucho.', forest: 'En la selva, las nubes y la lluvia regulan todo el ecosistema.', city: 'Las ciudades guardan calor de noche: mira la temperatura mínima.', mountain: 'En montaña el calentamiento afecta nieve, glaciares y agua.', coast: 'En costas y deltas, la humedad y el viento marcan el clima.', polar: 'Las zonas polares son las que más rápido se calientan.' }, en: { desert: 'In drylands, small changes in rain or heat matter a lot.', forest: 'In rainforests, clouds and rain drive the whole ecosystem.', city: 'Cities keep heat at night: watch minimum temperature.', mountain: 'In mountains, warming affects snow, glaciers and water.', coast: 'On coasts and deltas, humidity and wind shape the climate.', polar: 'Polar regions warm the fastest.' } };
function Opt({ on, I, label, onClick }) {
  return <motion.button type="button" aria-pressed={on} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} className={'opt' + (on ? ' on' : '')} onClick={onClick}><I size={26} /><span>{label}</span></motion.button>;
}
export default function Questions() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const openCase = useStore((s) => s.openCase);
  const [b, setB] = useRouteState('lab_type', null, (value) => B.some((item) => item[0] === value)); const [c, setC] = useRouteState('lab_concern', null, (value) => C.some((item) => item[0] === value)); const [pid, setPid] = useRouteState('lab_place', null, (value) => PLACES.some((place) => place.id === value));
  const vars = b && c ? [...new Set([...C.find((x) => x[0] === c)[4], ...EXTRA[b]])] : [];
  const cand = useMemo(() => PLACES.filter((p) => p.b === b), [b]);
  const points = useMemo(() => cand.map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, label: p[lang] })), [cand, lang]);
  const selectedId = cand.some((p) => p.id === pid) ? pid : cand[0]?.id;
  const go = () => { const p = cand.find((x) => x.id === selectedId); if (p) openCase({ vars }, { id: p.id, lat: p.lat, lon: p.lon }); };
  return (
    <div className="qbox">
      <p className="qq">1. {L('¿Qué tipo de lugar quieres investigar?', 'What kind of place do you want to investigate?')}</p>
      <div className="opts">{B.map(([id, I, es, en]) => <Opt key={id} on={b === id} I={I} label={L(es, en)} onClick={() => { if (b !== id) { setB(id); setPid(null); } }} />)}</div>
      <p className="qq">2. {L('¿Qué te preocupa?', 'What are you worried about?')}</p>
      <div className="opts">{C.map(([id, I, es, en]) => <Opt key={id} on={c === id} I={I} label={L(es, en)} onClick={() => setC(id)} />)}</div>
      <AnimatePresence>
        {b && c && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <p className="qq">{L('Pistas recomendadas', 'Recommended clues')}</p>
            <p className="mini" style={{ fontSize: 14 }}>{WHY[lang][b]}</p>
            <div className="recs">{vars.map((k) => <div key={k} className="rec"><b>{V[k][lang][0]}</b><span>{V[k][lang][1]}</span></div>)}</div>
            <PlacePicker places={points} sel={selectedId} onSelect={setPid} />
            <Button mt="md" color="forest" size="md" leftSection={<IconSearch size={18} />} onClick={go}>{L('Investigar con estas pistas', 'Investigate with these clues')}</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
