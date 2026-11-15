import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import '@mantine/core/styles.css';
import './styles/theme.css';
import App from './App.jsx';
import { useStore } from './core/store';
// Ruta de los archivos estáticos de CesiumJS (debe definirse antes de cargar el planeta)
window.CESIUM_BASE_URL = new URL('./cesium/', document.baseURI).href;
const theme = createTheme({ colors: { forest: ['#e6f5ef', '#c5e8da', '#9fd8c2', '#74c7a8', '#4fb692', '#2f9f7b', '#1f8766', '#146f53', '#0c5a43', '#064532'], navy: ['#e8eefc', '#c9d7f8', '#a3bbf2', '#7a9cea', '#557fe0', '#3b66d1', '#2c52b8', '#234399', '#1e3a8a', '#172c69'] }, primaryColor: 'forest', primaryShade: 8, defaultRadius: 'xl', fontFamily: "'Inter Variable', Inter, system-ui, sans-serif", headings: { fontFamily: "'Plus Jakarta Sans Variable', 'Inter Variable', sans-serif", fontWeight: '800' }, components: { Button: { defaultProps: { fw: 700 } } } });
function Root() {
  const th = useStore((s) => s.theme);
  useEffect(() => { document.documentElement.setAttribute('data-theme', th); }, [th]);
  return <MantineProvider theme={theme} forceColorScheme={th}><App /></MantineProvider>;
}
createRoot(document.getElementById('root')).render(<Root />);
