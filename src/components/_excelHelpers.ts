export const defaultMetrics = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'bounceRate', 'averageSessionDuration'];

export const getMetricColors = (metricKey: string) => {
  switch (metricKey) {
    case 'sessions': return { number: 'text-green-700', label: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' };
    case 'activeUsers': return { number: 'text-blue-700', label: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' };
    case 'newUsers': return { number: 'text-indigo-700', label: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' };
    case 'screenPageViews': return { number: 'text-teal-700', label: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-200' };
    case 'bounceRate': return { number: 'text-orange-700', label: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' };
    case 'averageSessionDuration': return { number: 'text-purple-700', label: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' };
    default: return { number: 'text-gray-900', label: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
};

export const getMetricLabel = (key: string) => {
  const labels: Record<string, string> = {
    activeUsers: 'Active Users',
    newUsers: 'New Users',
    sessions: 'Sessions',
    screenPageViews: 'Pageviews',
    bounceRate: 'Bounce Rate',
    averageSessionDuration: 'Avg. Session Duration'
  };
  return labels[key] ?? key;
};

export function formatValue(metric: string, value: number): string {
  switch (metric) {
    case 'bounceRate': return `${value.toFixed(1)}%`;
    case 'revenue': return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    default: return value.toLocaleString();
  }
}
