/**
 * Dynamic imports for heavy libraries to reduce initial bundle size.
 *
 * These utilities allow lazy-loading of large dependencies only when needed.
 * The views that use these libraries are already code-split via React.lazy()
 * in page.tsx, but these helpers are available for any component that needs
 * to conditionally load a heavy dependency at runtime.
 */

// Recharts — ~450KB minified. Only load when a chart is rendered.
export const loadRecharts = () => import('recharts')

// Framer Motion — ~150KB minified. Only load when animations are needed.
// Note: framer-motion is imported eagerly in most views for <motion.*>,
// but this can be used for advanced lazy-loading patterns.
export const loadFramerMotion = () => import('framer-motion')

// Individual recharts components for more granular imports
export const loadRechartsArea = () => import('recharts').then(m => ({
  AreaChart: m.AreaChart,
  Area: m.Area,
  ResponsiveContainer: m.ResponsiveContainer,
  Tooltip: m.Tooltip,
}))

export const loadRechartsLine = () => import('recharts').then(m => ({
  LineChart: m.LineChart,
  Line: m.Line,
  ResponsiveContainer: m.ResponsiveContainer,
  Tooltip: m.Tooltip,
  XAxis: m.XAxis,
  YAxis: m.YAxis,
}))
