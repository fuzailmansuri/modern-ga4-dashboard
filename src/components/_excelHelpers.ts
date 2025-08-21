export const defaultMetrics = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'bounceRate', 'averageSessionDuration'];

export const getMetricColors = (metricKey: string) => {
  switch (metricKey) {
    case 'sessions': return { number: 'text-green-700 dark:text-green-400', label: 'text-green-500 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/50', border: 'border-green-200 dark:border-green-800' };
    case 'activeUsers': return { number: 'text-blue-700 dark:text-blue-400', label: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-800' };
    case 'newUsers': return { number: 'text-indigo-700 dark:text-indigo-400', label: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-200 dark:border-indigo-800' };
    case 'screenPageViews': return { number: 'text-teal-700 dark:text-teal-400', label: 'text-teal-500 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/50', border: 'border-teal-200 dark:border-teal-800' };
    case 'bounceRate': return { number: 'text-orange-700 dark:text-orange-400', label: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50', border: 'border-orange-200 dark:border-orange-800' };
    case 'averageSessionDuration': return { number: 'text-purple-700 dark:text-purple-400', label: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-200 dark:border-purple-800' };
    default: return { number: 'text-foreground', label: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
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
