import { useEffect, useRef, useState } from 'react';
import { SciChartSurface, NumericAxis, DateTimeNumericAxis, FastLineRenderableSeries, XyDataSeries, ZoomPanModifier, MouseWheelZoomModifier, ZoomExtentsModifier, RubberBandXyZoomModifier, RolloverModifier, SciChartJSLightTheme, EExecuteOn, NumberRange } from 'scichart';
let configured = false;
export default function Sci({ t, v, roll, unit, onFail }) {
  const el = useRef(null); const [ok, setOk] = useState(true);
  useEffect(() => {
    let surface, dead = false;
    (async () => {
      try {
        if (!configured) { SciChartSurface.configure({ wasmUrl: './scichart.wasm', wasmNoSimdUrl: './scichart-nosimd.wasm' }); SciChartSurface.UseCommunityLicense(); configured = true; }
        const { sciChartSurface, wasmContext } = await SciChartSurface.create(el.current, { theme: new SciChartJSLightTheme() });
        if (dead) { sciChartSurface.delete(); return; }
        surface = sciChartSurface; sciChartSurface.background = 'transparent';
        sciChartSurface.xAxes.add(new DateTimeNumericAxis(wasmContext));
        sciChartSurface.yAxes.add(new NumericAxis(wasmContext, { growBy: new NumberRange(0.05, 0.05), axisTitle: unit, axisTitleStyle: { fontSize: 12 } }));
        sciChartSurface.renderableSeries.add(new FastLineRenderableSeries(wasmContext, { stroke: '#1e3a8a88', strokeThickness: 1, dataSeries: new XyDataSeries(wasmContext, { xValues: t, yValues: v, dataSeriesName: 'diario', isSorted: true, containsNaN: false }) }));
        sciChartSurface.renderableSeries.add(new FastLineRenderableSeries(wasmContext, { stroke: '#c2410c', strokeThickness: 3, dataSeries: new XyDataSeries(wasmContext, { xValues: t.slice(364), yValues: roll, dataSeriesName: '365 d', isSorted: true }) }));
        sciChartSurface.chartModifiers.add(new RubberBandXyZoomModifier({ executeCondition: { button: EExecuteOn.MouseLeftButton } }), new ZoomPanModifier({ executeCondition: { button: EExecuteOn.MouseRightButton } }), new MouseWheelZoomModifier(), new ZoomExtentsModifier(), new RolloverModifier({ showTooltip: true }));
      } catch (e) { console.warn('SciChart no disponible', e); setOk(false); onFail?.(); }
    })();
    return () => { dead = true; surface?.delete(); };
  }, [t, v]);
  return ok ? <div ref={el} style={{ width: '100%', height: 380 }} /> : null;
}
