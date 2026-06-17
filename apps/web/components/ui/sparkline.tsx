export function Sparkline({
  data,
  color = 'var(--primary)',
  width = 120,
  height = 36,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const gradId = `spark-${Math.round(data.reduce((a, b) => a + b, 0))}-${color.length}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Deterministic pseudo-trend ending near `end`, for KPI sparklines. */
export function trendTo(end: number, points = 14, swing = 0.18): number[] {
  const out: number[] = [];
  let v = end * (1 - swing);
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const wobble = Math.sin(i * 1.7 + end) * swing * 0.4 * end;
    v = end * (1 - swing) + end * swing * t + wobble;
    out.push(Math.max(0, v));
  }
  out[points - 1] = end;
  return out;
}
