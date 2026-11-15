/* Centro de datos en vivo: comprueba qué fuentes de la NASA responden, busca datasets en el catálogo
   Earthdata (CMR), muestra la Tierra de hoy (EPIC/DSCOVR) y fotos de la fototeca de la NASA. */
import { useEffect, useState } from 'react';
import { Button, TextInput, Loader } from '@mantine/core';
import { IconPlugConnected, IconSearch, IconExternalLink, IconCircleCheck, IconCircleX, IconPhoto, IconWorld } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHECKS, checkSource, cmrCollections, epicLatest, nasaImages } from '../../lib/nasa/nasa';
import { PLACES } from '../../lib/nasa/data';
import { useStore, placeLabel } from '../../core/store';
import { useT } from '../../core/i18n';

export default function DataHub() {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const place = useStore((s) => s.place);
  const [st, setSt] = useState({}), [busy, setBusy] = useState(false);
  const [q, setQ] = useState('lake water level'), [cols, setCols] = useState(null), [cBusy, setCBusy] = useState(false);
  const [epic, setEpic] = useState(null), [iq, setIq] = useState('Lake Titicaca'), [imgs, setImgs] = useState(null), [iBusy, setIBusy] = useState(false);
  const test = async () => { setBusy(true); setSt({}); await Promise.all(CHECKS.map(async ([id, , fn]) => { const r = await checkSource(fn); setSt((s) => ({ ...s, [id]: r })); })); setBusy(false); };
  const find = async (e) => { e?.preventDefault(); if (!q.trim()) return; setCBusy(true); try { setCols(await cmrCollections(q.trim())); } catch { setCols('fail'); } setCBusy(false); };
  const photos = async (e) => { e?.preventDefault(); if (!iq.trim()) return; setIBusy(true); try { setImgs(await nasaImages(iq.trim(), 8)); } catch { setImgs('fail'); } setIBusy(false); };
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
      <div className="two" style={{ alignItems: 'start' }}>
        <div className="card panel">
          <h3>{L('Buscador de datasets (Earthdata)', 'Dataset finder (Earthdata)')}</h3>
          <form className="row" style={{ flexWrap: 'nowrap', gap: 8 }} onSubmit={find}><TextInput style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder={L('Ejemplo: soil moisture, lake, NDVI…', 'Example: soil moisture, lake, NDVI…')} leftSection={<IconSearch size={16} />} /><Button type="submit" color="navy" loading={cBusy}>{L('Buscar', 'Search')}</Button></form>
          <p className="mini">{L('Busca en inglés entre los miles de datasets de la NASA. Sirve para encontrar nuevas variables que analizar.', 'Search NASA’s thousands of datasets. Useful to find new variables to analyse.')}</p>
          {cols === 'fail' && <p className="wizerr">{L('No se pudo conectar con el catálogo. Revisa tu internet.', 'Could not reach the catalog. Check your connection.')}</p>}
          <div className="dslist"><AnimatePresence>{Array.isArray(cols) && cols.map((c, i) => <motion.a key={c.id} className="ds" href={`https://search.earthdata.nasa.gov/search?q=${encodeURIComponent(c.short)}`} target="_blank" rel="noreferrer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}><b>{c.title}</b><span>{c.short} v{c.version} · {c.center}{c.start ? ` · ${c.start}–${c.end || L('hoy', 'now')}` : ''} <IconExternalLink size={12} /></span></motion.a>)}</AnimatePresence>
            {Array.isArray(cols) && !cols.length && <p className="mini">{L('Sin resultados. Prueba con otra palabra en inglés.', 'No results. Try another word.')}</p>}</div>
        </div>
        <div className="card panel">
          <h3><IconWorld size={18} style={{ verticalAlign: '-3px' }} /> {L('La Tierra hoy, desde 1,5 millones de km', 'Earth today, from 1.5 million km')}</h3>
          {epic === null && <div style={{ padding: 30, textAlign: 'center' }}><Loader size="sm" color="forest" /></div>}
          {epic === 'fail' && <p className="mini">{L('La cámara EPIC del satélite DSCOVR publica cada día fotos de la Tierra completa. No se pudo cargar la de hoy (sin internet).', 'The EPIC camera on DSCOVR publishes full-Earth photos daily. Today’s could not load (offline).')}</p>}
          {epic && epic !== 'fail' && <a href={epic.img} target="_blank" rel="noreferrer" className="epic"><img src={epic.img} alt="EPIC" loading="lazy" /><span>{L('Cámara EPIC · satélite DSCOVR', 'EPIC camera · DSCOVR satellite')} · {epic.date}</span></a>}
          <h3 style={{ marginTop: 16 }}><IconPhoto size={18} style={{ verticalAlign: '-3px' }} /> {L('Fototeca de la NASA', 'NASA image library')}</h3>
          <form className="row" style={{ flexWrap: 'nowrap', gap: 8 }} onSubmit={photos}><TextInput style={{ flex: 1 }} value={iq} onChange={(e) => setIq(e.currentTarget.value)} /><Button type="submit" color="navy" loading={iBusy}>{L('Ver fotos', 'See photos')}</Button></form>
          <p className="mini">{L('Tu punto actual es', 'Your current point is')} <button className="textlink" style={{ display: 'inline' }} onClick={() => setIq(placeLabel(place, PLACES, 'en').split(',')[0])}>{placeLabel(place, PLACES, lang)}</button>.</p>
          {imgs === 'fail' && <p className="wizerr">{L('No se pudo conectar con la fototeca.', 'Could not reach the image library.')}</p>}
          {Array.isArray(imgs) && !imgs.length && <p className="mini">{L('Sin fotos para esa búsqueda.', 'No photos for that search.')}</p>}
          {Array.isArray(imgs) && imgs.length > 0 && <div className="gallery">{imgs.map((m) => <a key={m.id} href={m.page} target="_blank" rel="noreferrer" title={m.title}><img src={m.thumb} alt={m.title} loading="lazy" /><span>{m.title}</span></a>)}</div>}
        </div>
      </div>
    </div></section>
  );
}
