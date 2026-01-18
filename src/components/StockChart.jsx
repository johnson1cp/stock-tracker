import { useState } from 'react';

export function StockChart({ data, width = 300, height = 150, positive, previousClose, symbol }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length < 2) {
    return (
      <div className="stock-chart-placeholder" style={{ width, height }}>
        <span>No chart data available</span>
      </div>
    );
  }

  const padding = { top: 20, right: 50, bottom: 25, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = previousClose ? [...data, previousClose] : data;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  // Add some padding to the range
  const paddedMin = min - range * 0.05;
  const paddedMax = max + range * 0.05;
  const paddedRange = paddedMax - paddedMin;

  // Create SVG path
  const points = data.map((value, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((value - paddedMin) / paddedRange) * chartHeight;
    return { x, y, value, index };
  });

  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  // Area fill points
  const areaPoints = [
    `${padding.left},${padding.top + chartHeight}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${padding.left + chartWidth},${padding.top + chartHeight}`,
  ].join(' ');

  const color = positive ? '#2ed573' : '#ff4757';
  const gradientId = `chart-gradient-${Math.random().toString(36).substr(2, 9)}`;

  // Previous close line position
  const prevCloseY = previousClose
    ? padding.top + chartHeight - ((previousClose - paddedMin) / paddedRange) * chartHeight
    : null;

  // Y-axis labels
  const yLabels = [paddedMax, (paddedMax + paddedMin) / 2, paddedMin].map((value, i) => ({
    value: value.toFixed(2),
    y: padding.top + (i * chartHeight) / 2,
  }));

  // Handle mouse move for hover effect
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Find closest point
    const closestPoint = points.reduce((closest, point) => {
      return Math.abs(point.x - x) < Math.abs(closest.x - x) ? point : closest;
    }, points[0]);

    setHoveredPoint(closestPoint);
  };

  return (
    <div className="stock-chart-container">
      <svg
        className="stock-chart"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={label.y}
            x2={padding.left + chartWidth}
            y2={label.y}
            stroke="var(--border-color)"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={label.y + 4}
            textAnchor="end"
            fill="var(--text-muted)"
            fontSize="10"
          >
            ${label.value}
          </text>
        ))}

        {/* Previous close reference line */}
        {prevCloseY !== null && (
          <>
            <line
              x1={padding.left}
              y1={prevCloseY}
              x2={padding.left + chartWidth}
              y2={prevCloseY}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.7"
            />
            <text
              x={padding.left + chartWidth + 5}
              y={prevCloseY + 3}
              fill="var(--text-muted)"
              fontSize="9"
            >
              PC
            </text>
          </>
        )}

        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={`url(#${gradientId})`}
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current price indicator */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill="rgba(255, 255, 255, 0.7)"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="1"
          />
        )}

        {/* Hover indicator */}
        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={padding.top + chartHeight}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="5"
              fill={color}
              stroke="var(--bg-primary)"
              strokeWidth="2"
            />
          </>
        )}

        {/* X-axis labels */}
        <text
          x={padding.left}
          y={height - 5}
          fill="var(--text-muted)"
          fontSize="10"
        >
          Open
        </text>
        <text
          x={padding.left + chartWidth}
          y={height - 5}
          textAnchor="end"
          fill="var(--text-muted)"
          fontSize="10"
        >
          Now
        </text>
      </svg>

      {/* Hover tooltip */}
      {hoveredPoint && (
        <div className="chart-tooltip">
          ${hoveredPoint.value.toFixed(2)}
        </div>
      )}
    </div>
  );
}
