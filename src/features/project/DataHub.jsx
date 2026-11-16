/* Centro de datos en vivo: comprueba qué fuentes de la NASA responden, busca datasets en el catálogo
   Earthdata (CMR), muestra la Tierra de hoy (EPIC/DSCOVR) y fotos de la fototeca de la NASA. */
import { useEffect, useState } from 'react';
import { Button, TextInput, Loader } from '@mantine/core';
import { IconPlugConnected, IconSearch, IconExternalLink, IconCircleCheck, IconCircleX, IconPhoto, IconWorld } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import OrbitImages from '../../components/reactbits/OrbitImages/OrbitImages';
import { CHECKS, checkSource, cmrCollections, epicLatest, nasaImages } from '../../lib/nasa/nasa';
import { PLACES } from '../../lib/nasa/data';
import { useStore, placeLabel } from '../../core/store';
import { useT } from '../../core/i18n';

export default function DataHub() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const place = useStore((s) => s.place);
  const [st, setSt] = useState({}), [busy, setBusy] = useState(false);
  const [q, setQ] = useState('lake water level'), [cols, setCols] = useState(null), [cBusy, setCBusy] = useState(false);
  const [sel, setSel] = useState(null), [epic, setEpic] = useState(null), [iq, setIq] = useState('Lake Titicaca'), [imgs, setImgs] = useState(null), [iBusy, setIBusy] = useState(false);
  const test = async () => { setBusy(true); setSt({}); await Promise.all(CHECKS.map(async ([id, , fn]) => { const r = await checkSource(fn); setSt((s) => ({ ...s, [id]: r })); })); setBusy(false); };
  const find = async (e) => { e?.preventDefault(); if (!q.trim()) return; setCBusy(true); try { setCols(await cmrCollections(q.trim())); } catch { setCols('fail'); } setCBusy(false); };
  const photos = async (e) => { e?.preventDefault(); if (!iq.trim()) return; setIBusy(true); try { setImgs(await nasaImages(iq.trim(), 14)); } catch { setImgs('fail'); } setIBusy(false); };
  useEffect(() => { photos(); }, []); // eslint-disable-line
  useEffect(() => { let dead = false; epicLatest().then((a) => { if (!dead) setEpic(a.length ? a[Math.floor(a.length / 2)] : 'fail'); }).catch(() => { if (!dead) setEpic('fail'); }); return () => { dead = true; }; }, []);
  const okN = Object.values(st).filter((r) => r.ok).length, n = Object.keys(st).length;
  return (
    <section><div className="wrap">
      <h2>{L('Datos en vivo de la NASA', 'Live NASA data')}</h2>
      <p className="sub">{L('La app se conecta directamente a siete servicios abiertos de la NASA, sin claves ni servidor propio. Aquí puedes comprobarlo y explorar el catálogo.', 'The app connects straight to seven open NASA services, with no keys and no server of its own. Check it here and explore the catalog.')}</p>
      <div className="card panel">
        <div className="row" style={{ justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>{L('¿Están respondiendo las fuentes?', 'Are the sources responding?')}</h3><Button color="forest" loading={busy} leftSection={<IconPlugConnected size={18} />} onClick={test}>{L('Probar conexión', 'Test connection')}</Button></div>
        <div className="checks">{CHECKS.map(([id, name]) => { const r = st[id]; return <div key={id} className={'check' + (r ? (r.ok ? ' ok' : ' bad') : '')}>{r ? (r.ok ? <IconCircleCheck size={18} /> : <IconCircleX size={18} />) : busy ? <Loader size={14} color="gray" /> : <i />}<b>{name}</b>{r && <span>{r.ok ? `${r.ms} ms` : L('sin respuesta', 'no response')}</span>}</div>; })}</div>
        {n === CHECKS.length && <p className="mini" style={{ marginBottom: 0 }}>{okN === n ? L('Todas las fuentes responden: la app trabaja con datos reales.', 'All sources respond: the app is working with real data.') : okN === 0 ? L('Ninguna fuente responde: probablemente no hay internet. Activa “Práctica” en la barra superior para seguir con datos simulados.', 'No source responds: probably no internet. Turn on “Practice” in the top bar to continue with simulated data.') : L(`Responden ${okN} de ${n}. Las secciones que dependen de las demás mostrarán un aviso.`, `${okN} of ${n} respond. Sections depending on the others will show a notice.`)}</p>}
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="card panel">
          <h3>{L('Buscador de datasets (Earthdata)', 'Dataset finder (Earthdata)')}</h3>
          <form className="row" style={{ flexWrap: 'nowrap', gap: 8 }} onSubmit={find}><TextInput style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder={L('Ejemplo: soil moisture, lake, NDVI…', 'Example: soil moisture, lake, NDVI…')} leftSection={<IconSearch size={16} />} /><Button type="submit" color="navy" loading={cBusy}>{L('Buscar', 'Search')}</Button></form>
          <p className="mini">{L('Busca en inglés entre los miles de datasets de la NASA. Sirve para encontrar nuevas variables que analizar.', 'Search NASA’s thousands of datasets. Useful to find new variables to analyse.')}</p>
          {cols === 'fail' && <p className="wizerr">{L('No se pudo conectar con el catálogo. Revisa tu internet.', 'Could not reach the catalog. Check your connection.')}</p>}
          <div className="dslist"><AnimatePresence>{Array.isArray(cols) && cols.map((c, i) => <motion.a key={c.id} className="ds" href={`https://search.earthdata.nasa.gov/search?q=${encodeURIComponent(c.short)}`} target="_blank" rel="noreferrer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}><b>{c.title}</b><span>{c.short} v{c.version} · {c.center}{c.start ? ` · ${c.start}–${c.end || L('hoy', 'now')}` : ''} <IconExternalLink size={12} /></span></motion.a>)}</AnimatePresence>
            {Array.isArray(cols) && !cols.length && <p className="mini">{L('Sin resultados. Prueba con otra palabra en inglés.', 'No results. Try another word.')}</p>}</div>
        </div>
      </div>
      <div className="card panel orbit-card">
        <div className="orb-stars" aria-hidden="true" />
        <div className="orb-head">
          <span className="ph-eyebrow light"><IconWorld size={15} />{L('Fotos reales de la NASA', 'Real NASA photos')}</span>
          <h3>{L('La Tierra hoy y fotos desde el espacio', 'Earth today and photos from space')}</h3>
          <p>{L('La imagen del centro la tomó hoy la cámara EPIC del satélite DSCOVR, a 1,5 millones de km. Alrededor giran fotos de la fototeca de la NASA del lugar que busques: arrastra para girarlas y toca una para verla.', 'The centre image was taken today by the EPIC camera on the DSCOVR satellite, 1.5 million km away. Around it orbit photos from NASA’s image library for the place you search: drag to spin them and tap one to see it.')}</p>
          <form className="orb-form" onSubmit={photos}><TextInput style={{ flex: 1 }} value={iq} onChange={(e) => setIq(e.currentTarget.value)} leftSection={<IconSearch size={16} />} placeholder={L('Un lugar, lago, volcán…', 'A place, lake, volcano…')} /><Button type="submit" color="forest" loading={iBusy}>{L('Ver fotos', 'See photos')}</Button></form>
          <p className="mini orb-hint">{L('Tu punto actual es', 'Your current point is')} <button className="textlink" style={{ display: 'inline' }} onClick={() => setIq(placeLabel(place, PLACES, 'en').split(',')[0])}>{placeLabel(place, PLACES, lang)}</button>.</p>
          {imgs === 'fail' && <p className="wizerr">{L('No se pudo conectar con la fototeca.', 'Could not reach the image library.')}</p>}
          {Array.isArray(imgs) && !imgs.length && <p className="mini orb-hint">{L('Sin fotos para esa búsqueda.', 'No photos for that search.')}</p>}
        </div>
        <div className="orb-stage">
          {Array.isArray(imgs) && imgs.length >= 3 ? (
            <OrbitImages key={iq + imgs.length} images={imgs.map((m) => ({ src: m.thumb, alt: m.title }))} shape="ellipse" baseWidth={1400} radiusX={600} radiusY={190} rotation={-6} duration={60} itemSize={190} itemRadius={22} depth={0.6} shadow={0.5}
              onItemClick={(i) => setSel(imgs[i])}
              centerContent={<div className="orb-earth">{epic === null && <Loader size="sm" color="teal" />}{epic && epic !== 'fail' && <a href={epic.img} target="_blank" rel="noreferrer"><img src={epic.img} alt="EPIC" /></a>}{epic === 'fail' && <IconWorld size={90} />}<span>{epic && epic !== 'fail' ? `${L('Hoy', 'Today')} · ${epic.date}` : L('Sin conexión a EPIC', 'EPIC offline')}</span></div>} />
          ) : <div className="orb-wait">{iBusy || imgs === null ? <Loader color="teal" /> : null}</div>}
        </div>
        {sel && <div className="orb-sel"><img src={sel.thumb} alt={sel.title} /><div><b>{sel.title}</b><span>{sel.date}</span><a href={sel.page} target="_blank" rel="noreferrer">{L('Ver en la NASA', 'Open on NASA')} <IconExternalLink size={14} /></a></div></div>}
      </div>
    </div></section>
  );
}
