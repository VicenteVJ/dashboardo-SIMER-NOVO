const variants = {
  default: 'metric-grid--default',
  compact: 'metric-grid--compact',
  mini: 'metric-grid--mini',
  aging: 'metric-grid--aging',
  eisenhower: 'metric-grid--eisenhower',
  pareto: 'metric-grid--pareto'
}

export default function MetricGrid({ children, variant = 'default', className = '' }) {
  return <div className={`metric-grid ${variants[variant] || variants.default} ${className}`.trim()}>{children}</div>
}
