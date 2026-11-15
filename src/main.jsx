import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import './theme.css';
import App from './App.jsx';
import { useStore } from './store';
const theme = createTheme({ colors: { forest: ['#e6f5ef', '#c5e8da', '#9fd8c2', '#74c7a8', '#4fb692', '#2f9f7b', '#1f8766', '#146f53', '#0c5a43', '#064532'], navy: ['#e8eefc', '#c9d7f8', '#a3bbf2', '#7a9cea', '#557fe0', '#3b66d1', '#2c52b8', '#234399', '#1e3a8a', '#172c69'] }, primaryColor: 'forest', primaryShade: 8, defaultRadius: 'xl', fontFamily: 'Inter, system-ui, sans-serif' });
function Root() {
  const th = useStore((s) => s.theme);
  useEffect(() => { document.documentElement.setAttribute('data-theme', th); }, [th]);
  return <MantineProvider theme={theme} forceColorScheme={th}><App /></MantineProvider>;
}
createRoot(document.getElementById('root')).render(<Root />);
