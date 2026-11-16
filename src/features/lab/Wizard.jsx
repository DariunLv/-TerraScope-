/* Asistente “Nueva investigación”: Mantine Stepper + React Hook Form + Zod + Framer Motion.
   Cada paso se valida antes de avanzar y queda marcado con un check verde. */
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stepper, Button, Select, NumberInput, Chip, Group, RangeSlider, Switch, SegmentedControl, Tooltip } from '@mantine/core';
import { IconMapPin, IconListCheck, IconCalendar, IconRocket, IconCheck, IconArrowRight, IconArrowLeft, IconSearch } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { V, PLACES } from '../../lib/nasa/data';
import { useStore } from '../../core/store';
import { useT } from '../../core/i18n';
import { readSession, writeSession, useSessionState } from '../../core/useSessionState';
export const GROUPS = [['Temperatura', 'Temperature', ['T2M', 'T2M_MAX', 'T2M_MIN', 'TS', 'T2MDEW']], ['Agua', 'Water', ['PRECTOTCORR', 'EVLAND', 'RH2M', 'QV2M', 'GWETTOP', 'GWETROOT', 'GWETPROF']], ['Aire y energía', 'Air & energy', ['WS10M', 'PS', 'ALLSKY_SFC_SW_DWN', 'CLOUD_AMT']]];
const num = (code, lo, hi) => z.number({ error: code }).min(lo, { error: code }).max(hi, { error: code });
const schema = z.object({
  how: z.enum(['list', 'coords']),
  pick: z.string().nullable(),
  lat: num('lat', -90, 90),
  lon: num('lon', -180, 180),
  vars: z.array(z.string()).min(1, { error: 'vars1' }).max(6, { error: 'vars6' }),
  years: z.tuple([z.number(), z.number()]).refine(([a, b]) => b - a >= 14, { error: 'years' }),
  ds: z.boolean(),
}).refine((v) => v.how === 'coords' || !!v.pick, { path: ['pick'], error: 'pick' });
const MSG = { es: { lat: 'La latitud va de −90 a 90.', lon: 'La longitud va de −180 a 180.', vars1: 'Elige al menos una variable.', vars6: 'Elige como máximo seis variables para que el análisis se lea bien.', years: 'Se necesitan al menos 15 años para detectar una tendencia.', pick: 'Elige un lugar de la lista.' }, en: { lat: 'Latitude goes from −90 to 90.', lon: 'Longitude goes from −180 to 180.', vars1: 'Pick at least one variable.', vars6: 'Pick at most six variables so the analysis stays readable.', years: 'At least 15 years are needed to detect a trend.', pick: 'Pick a place from the list.' } };
const FIELDS = [['pick', 'lat', 'lon'], ['vars'], ['years']];

export default function Wizard({ onRun, busy, defaults }) {
  const { lang } = useT(); const L = (a, b) => (lang === 'es' ? a : b);
  const { place, lakes } = useStore();
  const known = PLACES.some((p) => p.id === place.id);
  const { control, handleSubmit, trigger, watch, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: { how: known ? 'list' : 'coords', pick: known ? 'p:' + place.id : null, lat: place.lat, lon: place.lon, vars: defaults.vars, years: defaults.years, ds: defaults.ds, ...readSession('wizard:draft') } });
  const [active, setActive] = useSessionState('wizard:step', 0), [done, setDone] = useSessionState('wizard:done', 0), [dir, setDir] = useState(1);
  useEffect(() => { const subscription = watch((draft) => writeSession('wizard:draft', draft)); return () => subscription.unsubscribe(); }, [watch]);
  const placeKey = `${place.id}:${place.lat}:${place.lon}`, previousPlace = useRef(readSession('wizard:place') || placeKey);
  useEffect(() => { // si el usuario elige otro punto en el planeta, el formulario lo refleja
    if (previousPlace.current === placeKey) { writeSession('wizard:place', placeKey); return; }
    previousPlace.current = placeKey; writeSession('wizard:place', placeKey);
    const k = PLACES.some((p) => p.id === place.id); setValue('how', k ? 'list' : 'coords'); setValue('pick', k ? 'p:' + place.id : null); setValue('lat', place.lat); setValue('lon', place.lon);
  }, [place.lat, place.lon]);
  const v = watch(), err = (k) => (errors[k] ? MSG[lang][errors[k].message] || errors[k].message : null);
  const opts = [{ group: L('Lugares del mundo', 'World places'), items: PLACES.map((p) => ({ value: 'p:' + p.id, label: p[lang] })) }, { group: L('Lagos y lagunas del Perú', 'Lakes of Peru'), items: lakes.map((l) => ({ value: 'l:' + l.id, label: l.name })) }];
  const setPick = (val) => { setValue('pick', val, { shouldValidate: true }); if (!val) return; const [t, id] = val.split(':'), o = t === 'p' ? PLACES.find((x) => x.id === id) : lakes.find((x) => x.id === id); if (o) { setValue('lat', o.lat); setValue('lon', o.lon); } };
  const go = async (to) => { if (busy || to < 0 || to > 3) return; if (to > active) { if (!(await trigger(FIELDS[active], { shouldFocus: true }))) return; setDone((d) => Math.max(d, active + 1)); } setDir(to > active ? 1 : -1); setActive(to); };
  const label = () => { if (v.how === 'coords' || !v.pick) return `${v.lat}°, ${v.lon}°`; const [t, id] = v.pick.split(':'); return t === 'p' ? PLACES.find((x) => x.id === id)?.[lang] : lakes.find((x) => x.id === id)?.name; };
  const submit = (d) => {
    let pl = { id: 'custom', lat: +(+d.lat).toFixed(3), lon: +(+d.lon).toFixed(3) };
    if (d.how === 'list' && d.pick) { const [t, id] = d.pick.split(':'); if (t === 'p') { const p = PLACES.find((x) => x.id === id); pl = { id: p.id, lat: p.lat, lon: p.lon }; } else { const l = lakes.find((x) => x.id === id); pl = { id: 'custom', lat: l.lat, lon: l.lon, name: l.name }; } }
    onRun({ place: pl, vars: d.vars, years: d.years, ds: d.ds });
  };
  const steps = [[IconMapPin, L('Lugar', 'Place'), L('¿Dónde?', 'Where?')], [IconListCheck, L('Variables', 'Variables'), L('¿Qué medir?', 'What to measure?')], [IconCalendar, L('Periodo', 'Period'), L('¿Cuándo?', 'When?')], [IconRocket, L('Revisar', 'Review'), L('Todo listo', 'All set')]];
  return (
    <form className="wizard" aria-label={L('Nueva investigación', 'New investigation')} data-step={active + 1} aria-busy={busy} onKeyDown={(event) => { if (event.key === 'Enter' && event.target.tagName === 'INPUT' && event.target.getAttribute('role') !== 'combobox' && !['checkbox', 'radio'].includes(event.target.type) && active < 3) { event.preventDefault(); go(active + 1); } }} onSubmit={(event) => { if (busy || active < 3) { event.preventDefault(); if (!busy) go(active + 1); } else handleSubmit(submit)(event); }}>
      <Stepper active={active} onStepClick={(i) => i <= done && go(i)} color="forest" size="lg" iconSize={52} className="tsstep" classNames={{ stepLabel: "tsstep-l", stepDescription: "tsstep-d" }} completedIcon={<IconCheck size={18} />} allowNextStepsSelect={false}>
        {steps.map(([Ic, a, b], i) => <Stepper.Step key={i} disabled={busy} aria-current={i === active ? 'step' : undefined} icon={<Ic size={18} />} label={a} description={b} />)}
      </Stepper>
      <div className="wizbody">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={active} initial={{ opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 * dir }} transition={{ duration: 0.22 }}>
            {active === 0 && (<>
              <p className="qq">{L('¿Qué lugar quieres investigar?', 'Which place do you want to investigate?')}</p>
              <Controller name="how" control={control} render={({ field }) => <SegmentedControl color="navy" value={field.value} onChange={field.onChange} data={[{ value: 'list', label: L('Elegir de la lista', 'Pick from the list') }, { value: 'coords', label: L('Escribir coordenadas', 'Type coordinates') }]} />} />
              {v.how === 'list' ? <Select mt="sm" searchable size="md" aria-label={L('Lugar de investigación', 'Investigation place')} data={opts} value={v.pick} onChange={setPick} error={err('pick')} placeholder={L('Busca un lugar o un lago…', 'Search a place or a lake…')} maxDropdownHeight={260} leftSection={<IconSearch size={18} />} />
                : <Group mt="sm" grow align="flex-start">
                  <Controller name="lat" control={control} render={({ field }) => <NumberInput label={L('Latitud', 'Latitude')} description={L('Sur es negativo', 'South is negative')} value={field.value} onChange={(x) => field.onChange(x === '' ? NaN : x)} error={err('lat')} decimalScale={3} step={0.5} />} />
                  <Controller name="lon" control={control} render={({ field }) => <NumberInput label={L('Longitud', 'Longitude')} description={L('Oeste es negativo', 'West is negative')} value={field.value} onChange={(x) => field.onChange(x === '' ? NaN : x)} error={err('lon')} decimalScale={3} step={0.5} />} />
                </Group>}
              <p className="mini">{L('Consejo: si tocas un punto en el planeta, sus coordenadas aparecen aquí.', 'Tip: if you tap a point on the planet, its coordinates show up here.')}</p>
            </>)}
            {active === 1 && (<>
              <p className="qq">{L('¿Qué variables quieres analizar?', 'Which variables do you want to analyse?')} <span className="mini">({v.vars.length}/6)</span></p>
              <Controller name="vars" control={control} render={({ field }) => (
                <Chip.Group multiple value={field.value} onChange={field.onChange}>
                  {GROUPS.map(([es, en, ks]) => <div key={es} className="vgroup"><span>{L(es, en)}</span><Group gap={6}>{ks.map((k) => <Tooltip key={k} label={V[k][lang][1]} multiline w={230} events={{ hover: true, focus: true, touch: true }}><Chip value={k} size="xs" color="forest">{V[k][lang][0]}</Chip></Tooltip>)}</Group></div>)}
                </Chip.Group>)} />
              {err('vars') && <p className="wizerr">{err('vars')}</p>}
              <p className="mini">{L('Pasa el cursor sobre cada variable para ver qué significa.', 'Hover each variable to see what it means.')}</p>
            </>)}
            {active === 2 && (<>
              <p className="qq">{L('¿Qué periodo quieres estudiar?', 'Which period do you want to study?')} <b>{v.years[0]}–{v.years[1]}</b> <span className="mini">({v.years[1] - v.years[0] + 1} {L('años', 'years')})</span></p>
              <Controller name="years" control={control} render={({ field }) => <RangeSlider color="forest" min={1981} max={2025} minRange={5} value={field.value} onChange={field.onChange} marks={[1981, 1990, 2000, 2010, 2020, 2025].map((y) => ({ value: y, label: String(y) }))} mb={30} />} />
              {err('years') && <p className="wizerr">{err('years')}</p>}
              <Controller name="ds" control={control} render={({ field }) => <Switch color="forest" checked={field.value} onChange={(e) => field.onChange(e.currentTarget.checked)} label={L('Quitar el ciclo de las estaciones (recomendado)', 'Remove the seasonal cycle (recommended)')} description={L('Así el verano y el invierno no esconden la tendencia.', 'So summer and winter do not hide the trend.')} />} />
            </>)}
            {active === 3 && (<>
              <p className="qq">{L('Revisa tu investigación', 'Review your investigation')}</p>
              <div className="wizsum">
                <div><span>{L('Lugar', 'Place')}</span><b>{label()}</b></div>
                <div><span>{L('Variables', 'Variables')}</span><b>{v.vars.map((k) => V[k][lang][0]).join(' · ')}</b></div>
                <div><span>{L('Periodo', 'Period')}</span><b>{v.years[0]}–{v.years[1]}{v.ds ? L(' · sin ciclo estacional', ' · seasonal cycle removed') : ''}</b></div>
              </div>
              <p className="mini">{L('Al investigar se piden los datos a NASA POWER y se aplican las tres pruebas de tendencia.', 'Investigating requests the data from NASA POWER and applies the three trend tests.')}</p>
            </>)}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Button disabled={busy} variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={() => go(active - 1)} style={{ visibility: active ? 'visible' : 'hidden' }}>{L('Atrás', 'Back')}</Button>
        {active < 3 ? <Button disabled={busy} key="next" type="button" color="forest" size="md" rightSection={<IconArrowRight size={18} />} onClick={() => go(active + 1)}>{L('Continuar', 'Continue')}</Button>
          : <Button key="run" type="submit" color="forest" size="md" loading={busy} leftSection={<IconSearch size={18} />}>{L('Investigar', 'Investigate')}</Button>}
      </div>
    </form>
  );
}
