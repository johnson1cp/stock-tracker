export function Sparkline({ data, width = 100, height = 30, positive, previousClose }) {
  if (!data || data.length < 2) {
    return <div className="sparkline-placeholder" style={{ width, height }} />;
  }

  // Include previousClose in min/max calculation if provided
  const allValues = previousClose ? [...data, previousClose] : data;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  // Create SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Gradient for area fill
  const areaPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ].join(' ');

  const color = positive ? '#2ed573' : '#ff4757';
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  // Calculate previous close line position
  const prevCloseY = previousClose
    ? height - ((previousClose - min) / range) * height
    : null;

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Previous close reference line */}
      {prevCloseY !== null && (
        <line
          x1="0"
          y1={prevCloseY}
          x2={width}
          y2={prevCloseY}
          stroke="var(--text-muted)"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.6"
        />
      )}
      <polygon
        points={areaPoints}
        fill={`url(#${gradientId})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
