import { radarGeometry } from '../game/topics';

/** Radar a n punte come uno schermo del Pip-Boy: anelli sottili, poligono luminoso, etichette brevi attorno. */
export function TopicRadar({ values, labels, size = 260 }: { values: (number | null)[]; labels: string[]; size?: number }) {
  const g = radarGeometry(values, size);
  const c = size / 2;
  const pad = 70; // spazio per le etichette ai lati (a due righe)
  return (
    <svg className="topic-radar" viewBox={`${-pad} 0 ${size + pad * 2} ${size}`} role="img" aria-label="radar">
      {g.rings.map((r, i) => <polygon key={i} points={r} className="tr-ring" />)}
      {g.axes.map((a, i) => <line key={i} x1={c} y1={c} x2={a.x} y2={a.y} className="tr-axis" />)}
      <polygon points={g.shape} className="tr-shape" />
      {g.dots.map((d, i) => d && <circle key={i} cx={d.x} cy={d.y} r={3} className="tr-dot" />)}
      {g.axes.map((a, i) => {
        const dx = a.x - c, dy = a.y - c, len = Math.hypot(dx, dy) || 1;
        const x = a.x + (dx / len) * 8, y = a.y + (dy / len) * 10 + 3;
        const anchor = Math.abs(dx) < 4 ? 'middle' : dx > 0 ? 'start' : 'end';
        const lines = labels[i].replace(' & ', ' &\n').split('\n'); // le etichette lunghe vanno a capo dopo la &
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} className={`tr-label${values[i] == null ? ' off' : ''}`}>
            {lines.map((ln, k) => <tspan key={k} x={x} dy={k ? 11 : 0}>{ln}</tspan>)}
          </text>
        );
      })}
    </svg>
  );
}
