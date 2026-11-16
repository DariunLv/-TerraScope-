/* Every map opens the real Cesium viewer; loading and errors never imitate a globe. */
import { Component, lazy, Suspense, useMemo, useState } from 'react';
import { Loader } from '@mantine/core';
import { useT } from '../../core/i18n';
import { loadCesium } from './loadCesium';
class Safe extends Component {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch(error) { console.warn('Cesium no disponible:', error); }
  render() { return this.state.bad ? this.props.fallback : this.props.children; }
}
export default function Earth(props) {
  const { lang } = useT(), [attempt, setAttempt] = useState(0), mode = props.mode || 'hero';
  const EarthView = useMemo(() => lazy(loadCesium), [attempt]);
  const fallback = <div className={'earthwrap earthwrap-' + mode}><div className={'earth earth-' + mode + ' cesium-message'} role="alert">
    <b>{lang === 'es' ? 'No se pudo iniciar el mapa 3D de Cesium.' : 'The Cesium 3D map could not start.'}</b>
    <button className="textlink" onClick={() => setAttempt((value) => value + 1)}>{lang === 'es' ? 'Reintentar mapa 3D' : 'Retry 3D map'}</button>
  </div></div>;
  const loading = <div className={'earthwrap earthwrap-' + mode}><div className={'earth earth-' + mode + ' cesium-message'} role="status"><Loader color="forest" size="sm" /><span>{lang === 'es' ? 'Cargando Cesium…' : 'Loading Cesium…'}</span></div></div>;
  return <div style={mode === 'pick' ? { height: '100%' } : undefined}><Safe key={attempt} fallback={fallback}><Suspense fallback={loading}><EarthView {...props} /></Suspense></Safe></div>;
}
