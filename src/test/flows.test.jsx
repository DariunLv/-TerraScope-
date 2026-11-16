import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MotionConfig } from 'framer-motion';
import Wizard from '../features/lab/Wizard';
import Questions from '../features/lab/Questions';
import BranchedMenu from '../ui/react-bits/BranchedMenu';
import { Reports } from '../features/lakes/LakeTools';
import { Quiz } from '../features/learn/Game';
import { QUIZ } from '../features/learn/content';
import { useStore } from '../core/store';
import { V } from '../lib/nasa/data';

vi.mock('../shared/charts/hooks', () => ({ EChart: () => null, PlotView: () => null }));
vi.mock('../shared/analysis/Intel', () => ({ MES: { es: [], en: [] } }));
vi.mock('../shared/Interpret', () => ({ default: () => null }));

const theme = { colors: { forest: Array(10).fill('#0c5a43'), navy: Array(10).fill('#1e3a8a') } };
const wrap = children => <MantineProvider theme={theme}><MotionConfig reducedMotion="always">{children}</MotionConfig></MantineProvider>;
const defaults = { vars: ['T2M'], years: [1981, 2025], ds: true };
const next = async user => user.click(screen.getByRole('button', { name: 'Continuar' }));
const atStep = n => waitFor(() => expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(String(n)));

beforeEach(() => {
  localStorage.clear();
  useStore.setState({ lang: 'es', place: { id: 'moq', lat: -17.19, lon: -70.93 }, job: null, practice: true });
});

describe('Manual investigation', () => {
  it('validates coordinates before advancing or submitting', async () => {
    const user = userEvent.setup(), run = vi.fn();
    render(wrap(<Wizard defaults={defaults} onRun={run} />));
    await user.click(screen.getByText('Escribir coordenadas'));
    const latitude = screen.getByLabelText('Latitud');
    await user.clear(latitude);
    await user.type(latitude, '91');
    await next(user);
    expect(await screen.findByText('La latitud va de −90 a 90.')).toBeTruthy();
    await atStep(1);
    expect(run).not.toHaveBeenCalled();
    await user.clear(latitude);
    await user.type(latitude, '-17');
    await user.keyboard('{Enter}');
    await atStep(2);
    expect(run).not.toHaveBeenCalled();
  });

  it('requires a variable, preserves selections and runs only from review', async () => {
    const user = userEvent.setup(), run = vi.fn();
    render(wrap(<Wizard defaults={{ ...defaults, vars: [] }} onRun={run} />));
    await next(user);
    await screen.findByText(/¿Qué variables quieres analizar/);
    await next(user);
    expect(await screen.findByText('Elige al menos una variable.')).toBeTruthy();
    await user.click(screen.getByLabelText(V.T2M.es[0]));
    await next(user);
    await screen.findByText(/¿Qué periodo quieres estudiar/);
    await next(user);
    await screen.findByText('Revisa tu investigación');
    expect(run).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Editar variables' }));
    await screen.findByText(/¿Qué variables quieres analizar/);
    expect(screen.getByLabelText(V.T2M.es[0]).checked).toBe(true);
    await next(user);
    await screen.findByText(/¿Qué periodo quieres estudiar/);
    await next(user);
    await screen.findByText('Revisa tu investigación');
    await user.click(screen.getByRole('button', { name: 'Investigar', exact: true }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(run.mock.calls[0][0]).toMatchObject({ vars: ['T2M'], years: [1981, 2025], ds: true, place: { id: 'moq' } });
  });

  it('locks navigation while an investigation is running', () => {
    render(wrap(<Wizard defaults={defaults} onRun={vi.fn()} busy />));
    expect(screen.getByRole('button', { name: 'Atrás' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Continuar' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Lugar ¿Dónde/ }).disabled).toBe(true);
  });
});

describe('Guided investigation', () => {
  it('requires choices and launches the selected landscape with its clues', async () => {
    const user = userEvent.setup();
    render(wrap(<Questions />));
    expect(screen.getByRole('button', { name: 'Continuar' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Alta montaña' }));
    await next(user);
    await screen.findByText('¿Qué te preocupa?');
    expect(screen.getByRole('button', { name: 'Continuar' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Agua y sequía' }));
    await next(user);
    await screen.findByText('Pistas recomendadas');
    await user.click(screen.getByRole('button', { name: 'Atrás' }));
    await screen.findByText('¿Qué te preocupa?');
    expect(screen.getByRole('button', { name: 'Agua y sequía' }).getAttribute('aria-pressed')).toBe('true');
    await next(user);
    await screen.findByText('Pistas recomendadas');
    await user.click(screen.getByRole('button', { name: 'Investigar con estas pistas' }));
    expect(useStore.getState().view).toBe('lab');
    expect(useStore.getState().job.vars).toEqual(['PRECTOTCORR', 'GWETROOT', 'RH2M', 'TS']);
  });
});

describe('Branched navigation', () => {
  const items = [{ label: 'Investigar', children: [{ value: 'lab', label: 'Laboratorio' }, { value: 'lagos', label: 'Lagos' }] }, { label: 'Más', children: [{ value: 'aprender', label: 'Aprender' }] }];
  it('folds sections and follows navigation originating outside the menu', async () => {
    const user = userEvent.setup(), select = vi.fn();
    const { rerender } = render(<BranchedMenu items={items} activeValue="lab" defaultOpen={[0]} onSelect={select} />);
    expect(screen.getByRole('button', { name: 'Laboratorio' }).getAttribute('aria-current')).toBe('page');
    await user.click(screen.getByRole('button', { name: 'Investigar' }));
    expect(screen.queryByRole('button', { name: 'Laboratorio' })).toBeNull();
    expect(screen.getByText('Laboratorio').closest('button').tabIndex).toBe(-1);
    rerender(<BranchedMenu items={items} activeValue="aprender" defaultOpen={[0]} onSelect={select} />);
    expect(await screen.findByRole('button', { name: 'Aprender' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Más' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Investigar' }).getAttribute('aria-expanded')).toBe('false');
    await user.click(screen.getByRole('button', { name: 'Aprender' }));
    expect(select).toHaveBeenCalledWith('aprender', items[1].children[0]);
  });
});

describe('Citizen reports', () => {
  it('validates observations, shows the complete review and saves once', async () => {
    const user = userEvent.setup(), lake = useStore.getState().lakes[0];
    render(wrap(<Reports lake={lake} L={(es) => es} lang="es" />));
    await next(user);
    await screen.findByText('¿Qué observaste?');
    await next(user);
    expect(await screen.findByText('Elige qué observaste.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cambió el color del agua' }));
    await user.type(screen.getByLabelText('Describe lo que viste'), 'Prueba');
    await next(user);
    expect(await screen.findByText('Describe lo que viste con al menos 15 letras.')).toBeTruthy();
    const note = 'Prueba local: el agua se observa más turbia cerca de la orilla.';
    await user.clear(screen.getByLabelText('Describe lo que viste'));
    await user.type(screen.getByLabelText('Describe lo que viste'), note);
    await next(user);
    await screen.findByText(note);
    expect(localStorage.getItem('ts_reports_v1')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Guardar reporte', exact: true }));
    await screen.findByRole('status');
    const saved = JSON.parse(localStorage.getItem('ts_reports_v1'));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ lake: lake.id, note, kind: 'color', check: { code: 'na' } });
    await atStep(1);
  });
});

describe('Learning quiz', () => {
  it('requires an answer per question and records the final score once', async () => {
    const user = userEvent.setup(), finish = vi.fn();
    render(wrap(<Quiz L={es => es} lang="es" best={0} onFinish={finish} />));
    for (let index = 0; index < QUIZ.length; index++) {
      const question = QUIZ[index], label = index + 1 === QUIZ.length ? 'Ver resultado' : 'Siguiente';
      await screen.findByRole('heading', { name: question[0] });
      expect(screen.getByRole('button', { name: label }).disabled).toBe(true);
      const answer = screen.getByRole('button', { name: question[2][question[3]][0] });
      await user.click(answer);
      expect(answer.disabled).toBe(true);
      await user.click(screen.getByRole('button', { name: label }));
    }
    await screen.findByRole('button', { name: 'Intentar de nuevo' });
    expect(finish).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledWith(QUIZ.length);
  });
});
