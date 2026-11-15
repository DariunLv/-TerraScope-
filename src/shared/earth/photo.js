/* Foto del planeta: captura el lienzo de CesiumJS, le añade una franja con el título, los datos y los créditos, y la descarga como PNG. */
export function takePhoto(viewer, { title, lines = [], credit = '', file = 'terrascope' }) {
  if (!viewer) return false;
  viewer.render(); // debe ir en el mismo instante que la copia del lienzo
  const src = viewer.scene.canvas, w = src.width, h = src.height, k = Math.max(0.8, w / 1000), bar = Math.round((86 + lines.length * 26) * k);
  const out = document.createElement('canvas'); out.width = w; out.height = h + bar;
  const g = out.getContext('2d'); g.drawImage(src, 0, 0);
  g.fillStyle = '#0b1630'; g.fillRect(0, h, w, bar);
  g.fillStyle = '#facc15'; g.fillRect(0, h, w, Math.round(4 * k));
  g.textBaseline = 'top'; let y = h + Math.round(16 * k);
  g.fillStyle = '#ffffff'; g.font = `800 ${Math.round(26 * k)}px Inter, system-ui, sans-serif`; g.fillText(title, 22 * k, y); y += Math.round(38 * k);
  g.font = `600 ${Math.round(17 * k)}px Inter, system-ui, sans-serif`; g.fillStyle = '#dbe7f5';
  lines.forEach((t) => { g.fillText(t, 22 * k, y); y += Math.round(26 * k); });
  g.font = `500 ${Math.round(13 * k)}px Inter, system-ui, sans-serif`; g.fillStyle = '#9fb3cf'; g.textBaseline = 'bottom';
  g.fillText(credit + ' · TerraScope · NASA Space Apps 2026', 22 * k, h + bar - Math.round(10 * k));
  const a = document.createElement('a'); a.href = out.toDataURL('image/png'); a.download = `${file}-${new Date().toISOString().slice(0, 10)}.png`; document.body.appendChild(a); a.click(); a.remove();
  return true;
}
