/* Muestra texto de la IA con formato limpio: negritas, listas, tablas y párrafos (sin mostrar ** ni barras sueltas). */
const norm = (t) => {
  t = String(t || '').replace(/\r/g, '');
  if (/\|\s*:?-{3,}/.test(t)) t = t.replace(/\|\s*\|/g, '|\n|'); // tabla aplanada en una línea
  t = t.split('\n').map((l) => { const i = l.indexOf('|'); return i > 0 && (l.match(/\|/g) || []).length >= 3 ? l.slice(0, i).trim() + '\n' + l.slice(i) : l; }).join('\n');
  t = t.split('\n').map((l) => { const j = l.lastIndexOf('|'); return l.startsWith('|') && j > 0 && l.slice(j + 1).trim() ? l.slice(0, j + 1) + '\n' + l.slice(j + 1).trim() : l; }).join('\n');
  return t
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/([.:;!?)])\s+(?=\*\*[^*\n]{2,40}\*\*\s*(\n|-\s|\d{1,2}[.)]\s|\||$))/g, '$1\n')
    .replace(/([.:;!?)])\s+(?=(\d{1,2}[.)]\s+[A-ZÁÉÍÓÚÑ¿¡“"]))/g, '$1\n')
    .replace(/([.:;!?)])\s+-\s+(?=[A-ZÁÉÍÓÚÑ¿¡“"*])/g, '$1\n- ')
    .replace(/\n\s*[-*•]\s+/g, '\n- ')
    .replace(/(\*\*[^*\n]{2,60}\*\*)\s+(?=[-\d])/g, '$1\n')
    .replace(/(\*\*[^*\n]{2,60}\*\*)[ \t]+(?=\|)/g, '$1\n')
    .replace(/\n{3,}/g, '\n\n').trim();
};
const inline = (s) => s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, i) => (/^\*\*[^*]+\*\*$/.test(p) ? <b key={i}>{p.slice(2, -2)}</b> : p.replace(/\*/g, '')));
const cells = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const isSep = (l) => /^\|?[\s:|-]+\|?$/.test(l) && /---/.test(l);
export default function Rich({ text }) {
  const lines = norm(text).split('\n').map((l) => l.trim()).filter(Boolean), out = []; let list = null, tbl = null;
  const flush = () => {
    if (list) { const Tag = list.ord ? 'ol' : 'ul'; out.push(<Tag key={out.length} className="rich-l">{list.items.map((x, i) => <li key={i}>{inline(x)}</li>)}</Tag>); list = null; }
    if (tbl) { const [h, ...rows] = tbl; out.push(<div key={out.length} className="rich-t"><table><thead><tr>{h.map((c, i) => <th key={i}>{inline(c)}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody></table></div>); tbl = null; }
  };
  lines.forEach((l) => {
    if (l.startsWith('|')) { if (isSep(l)) return; if (list) flush(); (tbl = tbl || []).push(cells(l)); return; }
    const b = l.match(/^[-•]\s+(.*)$/), n = l.match(/^\d{1,2}[.)]\s+(.*)$/);
    if (b || n) { const ord = !!n; if (tbl) flush(); if (!list || list.ord !== ord) { flush(); list = { ord, items: [] }; } list.items.push((b || n)[1]); }
    else { flush(); out.push(<p key={out.length} className="rich-p">{inline(l)}</p>); }
  });
  flush();
  return <div className="rich">{out}</div>;
}
