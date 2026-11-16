/* Aprender: ruta de lecciones interactivas, práctica, glosario y quiz. El progreso se guarda en este navegador. */
import Ghost from '../../ui/Ghost';
import { useEffect, useMemo, useState } from 'react';
import { Tabs, Progress, TextInput, Button } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSchool, IconRoute, IconPuzzle, IconBook2, IconTrophy, IconCircleCheck, IconCircle, IconSearch, IconChevronDown, IconChartLine, IconWaveSine, IconDice5, IconRuler2, IconDroplet, IconLink, IconCheck, IconX, IconArrowRight } from '@tabler/icons-react';
import PageHead from '../../layout/PageHead';
import Killa, { KillaSay } from '../../killa/Killa';
import { useT } from '../../core/i18n';
import { useStore } from '../../core/store';
import Bento from './Bento';
import Practice from './Practice';
import { LESSONS, GLOSSARY, QUIZ } from './content';
import { useProgress } from './progress';
import { TrendWidget, SeasonWidget, AlarmWidget, CoverWidget, BalanceWidget, SpuriousWidget } from './widgets';
const ICONS = { IconChartLine, IconWaveSine, IconDice5, IconRuler2, IconDroplet, IconLink };
const WIDGETS = { trend: TrendWidget, season: SeasonWidget, p: AlarmWidget, cover: CoverWidget, balance: BalanceWidget, spur: SpuriousWidget };
const LEVELS = [['Detective novato', 'Rookie detective'], ['Detective aprendiz', 'Apprentice detective'], ['Detective de campo', 'Field detective'], ['Detective experto', 'Expert detective']];

function Lesson({ ls, open, onToggle, done, onDone, L, lang }) {
  const Ic = ICONS[ls.ic], W = WIDGETS[ls.id], [pick, setPick] = useState(null), es = lang === 'es', i = es ? 0 : 1;
  const ok = pick !== null && pick === ls.q.c;
  return (
    <div className={'lesson card' + (open ? ' open' : '') + (done ? ' done' : '')}>
      <button className="ls-h" onClick={onToggle} aria-expanded={open}>
        <span className="ls-ic"><Ic size={22} /></span>
        <span className="ls-t"><b>{ls.t[i]}</b><small>{ls.goal[i]}</small></span>
        <span className="ls-st">{done ? <IconCircleCheck size={22} color="#0c7a5b" /> : <IconCircle size={22} color="#9aa7bd" />}</span>
        <IconChevronDown size={18} className="ls-chev" />
      </button>
      <AnimatePresence initial={false}>{open && (
        <motion.div className="ls-b" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
          <div className="ls-in">
            <p className="ls-body">{ls.body[i]}</p>
            <W L={L} es={es} />
            <div className="ls-q">
              <b>{ls.q.p[i]}</b>
              <div className="ls-opts">{ls.q.o.map((o, k) => <button key={k} disabled={ok} className={'ls-o' + (pick === k ? (k === ls.q.c ? ' good' : ' bad') : '')} onClick={() => { setPick(k); if (k === ls.q.c) onDone(); }}>{o[i]}</button>)}</div>
              {pick !== null && <p className={'ls-fb ' + (ok ? 'good' : 'bad')}>{ok ? <IconCheck size={16} /> : <IconX size={16} />} {ok ? L('Correcto. ', 'Correct. ') : L('Todavía no. ', 'Not yet. ')}{ok ? ls.q.w[i] : L('Prueba con otra opción; mira la simulación otra vez.', 'Try another option; look at the simulation again.')}</p>}
            </div>
          </div>
        </motion.div>)}</AnimatePresence>
    </div>);
}

function Glossary({ L, lang }) {
  const [q, setQ] = useState(''), i = lang === 'es' ? 0 : 1;
  const list = useMemo(() => GLOSSARY.filter((g) => (g[0] + g[1] + g[2] + g[3]).toLowerCase().includes(q.toLowerCase())), [q]);
  return (<div>
    <TextInput radius="xl" size="md" leftSection={<IconSearch size={16} />} placeholder={L('Buscar un término…', 'Search a term…')} value={q} onChange={(e) => setQ(e.currentTarget.value)} mb="md" />
    <div className="gloss">{list.map((g) => <div key={g[0]} className="gl card"><b>{g[i]}</b><p>{g[i + 2]}</p></div>)}{!list.length && <p className="mini">{L('No hay resultados.', 'No results.')}</p>}</div>
  </div>);
}

function Quiz({ L, lang, best, onFinish }) {
  const i = lang === 'es' ? 0 : 1, [k, setK] = useState(0), [pick, setPick] = useState(null), [score, setScore] = useState(0), [fin, setFin] = useState(false);
  const q = QUIZ[k], right = pick === q?.[3];
  const next = () => { if (k + 1 >= QUIZ.length) { setFin(true); onFinish(score); } else { setK(k + 1); setPick(null); } };
  const again = () => { setK(0); setPick(null); setScore(0); setFin(false); };
  if (fin) return (<div className="card panel" style={{ textAlign: 'center' }}><KillaSay size={130} estado={score >= 6 ? 'celebrando' : 'ensenando'} text={score >= 6 ? L('¡Muy bien, detective!', 'Well done, detective!') : L('Repasa las lecciones y vuelve a intentarlo.', 'Review the lessons and try again.')} />
    <h2 style={{ fontSize: 28 }}>{score} / {QUIZ.length}</h2><p className="mini">{L('Mejor resultado', 'Best score')}: {Math.max(best || 0, score)} / {QUIZ.length}</p><Button color="forest" onClick={again}>{L('Intentar de nuevo', 'Try again')}</Button></div>);
  return (<div className="card panel quiz"><Ghost k="brain" i={1} size={190} pos={1} />
    <div className="q-top"><span className="mini">{L('Pregunta', 'Question')} {k + 1} / {QUIZ.length}</span><Progress value={((k + (pick !== null ? 1 : 0)) / QUIZ.length) * 100} color="forest" size="sm" style={{ flex: 1 }} /></div>
    <h3>{q[i]}</h3>
    <div className="ls-opts">{q[2].map((o, j) => <button key={j} disabled={pick !== null} className={'ls-o' + (pick !== null ? (j === q[3] ? ' good' : pick === j ? ' bad' : '') : '')} onClick={() => { setPick(j); if (j === q[3]) setScore((s) => s + 1); }}>{o[i]}</button>)}</div>
    {pick !== null && (<><p className={'ls-fb ' + (right ? 'good' : 'bad')}>{right ? <IconCheck size={16} /> : <IconX size={16} />} {q[4 + i]}</p><Button color="forest" rightSection={<IconArrowRight size={16} />} onClick={next}>{k + 1 >= QUIZ.length ? L('Ver resultado', 'See result') : L('Siguiente', 'Next')}</Button></>)}
  </div>);
}

export default function Game() {
  const { t, lang } = useT(), L = (a, b) => (lang === 'es' ? a : b), setView = useStore((s) => s.setView);
  const [pg, upd] = useProgress(), [openId, setOpen] = useState(null), [tab, setTab] = useState('ruta'), sec = useStore((s) => s.sec), secN = useStore((s) => s.secN);
  useEffect(() => { if (sec && sec.startsWith('aprender:')) setTab(sec.slice(9)); }, [secN]); // eslint-disable-line
  const done = pg.done || {}, nDone = LESSONS.filter((l) => done[l.id]).length, quizBest = pg.quiz || 0;
  const pts = nDone + (quizBest >= 6 ? 2 : quizBest >= 4 ? 1 : 0), lvl = pts >= 7 ? 3 : pts >= 5 ? 2 : pts >= 2 ? 1 : 0, pct = Math.round((nDone / LESSONS.length) * 100);
  const next = LESSONS.find((l) => !done[l.id]);
  const say = nDone === 0 ? L('Empecemos por la primera lección: tendencia o ruido.', 'Let us start with the first lesson: trend or noise.') : next ? L(`Vas muy bien. Sigue con “${next.t[0]}”.`, `You are doing great. Continue with “${next.t[1]}”.`) : quizBest >= 6 ? L('Completaste todo. Ya puedes investigar tu propio lugar.', 'You completed everything. You can now investigate your own place.') : L('Terminaste las lecciones. Ahora el quiz final.', 'You finished the lessons. Now the final quiz.');
  return (
    <section id="aprende"><div className="wrap">
      <PageHead icon={IconSchool} tone="navy" eyebrow={L('Aprender', 'Learn')} title={t.learnTitle} sub={L('Seis lecciones con simulaciones para distinguir una tendencia real del ruido, entender el valor p y no confundir clima con nivel del lago.', 'Six lessons with simulations to tell a real trend from noise, understand the p-value and not confuse climate with lake level.')} />
      <div className="card panel lrn-hero"><Ghost k="book" i={0} size={200} pos={0} />
        <div className="lrn-say"><Killa estado={nDone === LESSONS.length ? 'celebrando' : 'ensenando'} size={74} live={false} shadow={false} tap={false} /><p>{say}</p></div>
        <div className="lrn-prog">
          <div className="lrn-lv"><IconTrophy size={20} /><b>{LEVELS[lvl][lang === 'es' ? 0 : 1]}</b></div>
          <Progress value={pct} color="forest" size="lg" radius="xl" />
          <span className="mini">{nDone} {L('de', 'of')} {LESSONS.length} {L('lecciones', 'lessons')} · {L('quiz', 'quiz')}: {quizBest} / {QUIZ.length}</span>
          <div className="lrn-cta"><Button size="sm" radius="xl" color="forest" onClick={() => { setTab('ruta'); setOpen((next || LESSONS[0]).id); }}>{nDone ? L('Continuar', 'Continue') : L('Empezar', 'Start')}</Button><Button size="sm" radius="xl" variant="default" onClick={() => setView('lab')}>{L('Investigar con datos reales', 'Investigate with real data')}</Button></div>
        </div>
      </div>
      <Tabs value={tab} onChange={(v) => { setTab(v); useStore.getState().setSec('aprender:' + v); }} color="forest" variant="pills" radius="xl" mt="lg">
        <Tabs.List className="lrn-tabs"><Tabs.Tab value="ruta" leftSection={<IconRoute size={16} />}>{L('Ruta', 'Path')}</Tabs.Tab><Tabs.Tab value="practica" leftSection={<IconPuzzle size={16} />}>{L('Practicar', 'Practice')}</Tabs.Tab><Tabs.Tab value="glosario" leftSection={<IconBook2 size={16} />}>{L('Glosario', 'Glossary')}</Tabs.Tab><Tabs.Tab value="quiz" leftSection={<IconTrophy size={16} />}>Quiz</Tabs.Tab></Tabs.List>
        <Tabs.Panel value="ruta" pt="md">
          <div className="lessons">{LESSONS.map((ls) => <Lesson key={ls.id} ls={ls} L={L} lang={lang} open={openId === ls.id} done={!!done[ls.id]} onToggle={() => setOpen(openId === ls.id ? null : ls.id)} onDone={() => upd((p) => ({ ...p, done: { ...(p.done || {}), [ls.id]: true } }))} />)}</div>
          <h3 className="lrn-h">{L('Ideas clave en una mirada', 'Key ideas at a glance')}</h3><Bento />
        </Tabs.Panel>
        <Tabs.Panel value="practica" pt="md"><Practice /></Tabs.Panel>
        <Tabs.Panel value="glosario" pt="md"><Glossary L={L} lang={lang} /></Tabs.Panel>
        <Tabs.Panel value="quiz" pt="md"><Quiz L={L} lang={lang} best={quizBest} onFinish={(s) => upd((p) => ({ ...p, quiz: Math.max(p.quiz || 0, s) }))} /></Tabs.Panel>
      </Tabs>
    </div></section>
  );
}
