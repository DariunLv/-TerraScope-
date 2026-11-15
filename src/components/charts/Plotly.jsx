import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);
export default function P({ data, layout, pal, h = 340 }) {
  return <Plot data={data} useResizeHandler style={{ width: '100%', height: h }} config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }}
    layout={{ autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: pal.muted, family: 'Inter, system-ui', size: 12 }, margin: { l: 52, r: 14, t: 30, b: 40 }, legend: { orientation: 'h', y: 1.12 },
      xaxis: { gridcolor: pal.grid, zerolinecolor: pal.grid }, yaxis: { gridcolor: pal.grid, zerolinecolor: pal.grid }, ...layout }} />;
}
