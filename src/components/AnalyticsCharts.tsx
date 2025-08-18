"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AnalyticsData } from "~/types/analytics";

interface AnalyticsChartsProps {
  data: unknown;
  propertyName: string;
  onRefresh?: () => void;
}

interface TimeSeriesEntry {
  date: string;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  sessionDuration: number;
  count: number;
  formattedDate: string;
}

interface DeviceEntry {
  name: string;
  activeUsers: number;
  sessions: number;
}

interface CountryEntry {
  name: string;
  activeUsers: number;
  sessions: number;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

// Type guard to check if data is AnalyticsData
function isAnalyticsData(data: unknown): data is AnalyticsData {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return (
    "rows" in obj &&
    Array.isArray(obj.rows) &&
    "dimensionHeaders" in obj &&
    "metricHeaders" in obj
  );
}

export function AnalyticsCharts({
  data,
  propertyName,
  onRefresh,
}: AnalyticsChartsProps) {
  const [chartsVisible, setChartsVisible] = useState(true);

  // Process data for different chart types
  const chartData = useMemo(() => {
    if (!isAnalyticsData(data) || !data.rows || data.rows.length === 0) {
      return {
        timeSeriesData: [],
        deviceData: [],
        countryData: [],
        metricsOverview: [],
        totals: {
          activeUsers: 0,
          newUsers: 0,
          sessions: 0,
          pageviews: 0,
          bounceRate: 0,
          sessionDuration: 0,
        },
      };
    }

    // Group data by date for time series
    const timeSeriesMap = new Map<string, TimeSeriesEntry>();
    const deviceMap = new Map<string, DeviceEntry>();
    const countryMap = new Map<string, CountryEntry>();

    data.rows.forEach((row) => {
      const date = row.dimensionValues[0]?.value ?? "";
      const country = row.dimensionValues[1]?.value ?? "";
      const device = row.dimensionValues[2]?.value ?? "";

      const activeUsers = parseInt(row.metricValues[0]?.value ?? "0");
      const newUsers = parseInt(row.metricValues[1]?.value ?? "0");
      const sessions = parseInt(row.metricValues[2]?.value ?? "0");
      const screenPageViews = parseInt(row.metricValues[3]?.value ?? "0");
      const bounceRate = parseFloat(row.metricValues[4]?.value ?? "0");
      const averageSessionDuration = parseFloat(
        row.metricValues[5]?.value ?? "0",
      );

      // Time series data
      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, {
          date,
          activeUsers: 0,
          newUsers: 0,
          sessions: 0,
          pageviews: 0,
          bounceRate: 0,
          sessionDuration: 0,
          count: 0,
          formattedDate: "",
        });
      }
      const timeEntry = timeSeriesMap.get(date);
      if (timeEntry) {
        timeEntry.activeUsers += activeUsers;
        timeEntry.newUsers += newUsers;
        timeEntry.sessions += sessions;
        timeEntry.pageviews += screenPageViews;
        timeEntry.bounceRate += bounceRate;
        timeEntry.sessionDuration += averageSessionDuration;
        timeEntry.count += 1;
      }

      // Device data
      if (!deviceMap.has(device)) {
        deviceMap.set(device, { name: device, activeUsers: 0, sessions: 0 });
      }
      const deviceEntry = deviceMap.get(device);
      if (deviceEntry) {
        deviceEntry.activeUsers += activeUsers;
        deviceEntry.sessions += sessions;
      }

      // Country data
      if (!countryMap.has(country)) {
        countryMap.set(country, { name: country, activeUsers: 0, sessions: 0 });
      }
      const countryEntry = countryMap.get(country);
      if (countryEntry) {
        countryEntry.activeUsers += activeUsers;
        countryEntry.sessions += sessions;
      }
    });

    // Convert maps to arrays and calculate averages for time series
    const timeSeriesData = Array.from(timeSeriesMap.values())
      .map((entry) => ({
        ...entry,
        bounceRate: entry.count > 0 ? entry.bounceRate / entry.count : 0,
        sessionDuration:
          entry.count > 0 ? entry.sessionDuration / entry.count : 0,
        // Format date properly - GA4 returns dates in YYYYMMDD format
        formattedDate:
          entry.date.length === 8
            ? `${entry.date.slice(0, 4)}-${entry.date.slice(4, 6)}-${entry.date.slice(6, 8)}`
            : entry.date,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const deviceData = Array.from(deviceMap.values())
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 10);

    const countryData = Array.from(countryMap.values())
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 10);

    // Calculate totals from the actual data rows
    let totalActiveUsers = 0;
    let totalNewUsers = 0;
    let totalSessions = 0;
    let totalPageviews = 0;
    let totalBounceRate = 0;
    let totalSessionDuration = 0;
    let rowCount = 0;

    data.rows.forEach((row) => {
      const activeUsers = parseInt(row.metricValues[0]?.value ?? "0");
      const newUsers = parseInt(row.metricValues[1]?.value ?? "0");
      const sessions = parseInt(row.metricValues[2]?.value ?? "0");
      const pageviews = parseInt(row.metricValues[3]?.value ?? "0");
      const bounceRate = parseFloat(row.metricValues[4]?.value ?? "0");
      const sessionDuration = parseFloat(row.metricValues[5]?.value ?? "0");

      totalActiveUsers += activeUsers;
      totalNewUsers += newUsers;
      totalSessions += sessions;
      totalPageviews += pageviews;
      totalBounceRate += bounceRate;
      totalSessionDuration += sessionDuration;
      rowCount++;
    });

    const avgBounceRate = rowCount > 0 ? totalBounceRate / rowCount : 0;
    const avgSessionDuration =
      rowCount > 0 ? totalSessionDuration / rowCount : 0;

    const metricsOverview = [
      { name: "Active Users", value: totalActiveUsers },
      { name: "New Users", value: totalNewUsers },
      { name: "Sessions", value: totalSessions },
      { name: "Screen Page Views", value: totalPageviews },
    ];

    return {
      timeSeriesData,
      deviceData,
      countryData,
      metricsOverview,
      totals: {
        activeUsers: totalActiveUsers,
        newUsers: totalNewUsers,
        sessions: totalSessions,
        pageviews: totalPageviews,
        bounceRate: avgBounceRate,
        sessionDuration: avgSessionDuration,
      },
    };
  }, [data]);

  // This component should not render if there's no data (handled by parent)
  if (!isAnalyticsData(data) || !data.rows || data.rows.length === 0) {
    return (
      <div className="space-y-6 rounded-lg bg-white p-4 shadow">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-900">
              {propertyName}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg bg-white p-4 shadow">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-900">{propertyName}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartsVisible(!chartsVisible)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs leading-4 font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              {chartsVisible ? "Hide" : "View"} Charts
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs leading-4 font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                <svg
                  className="mr-1.5 h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="text-xl font-bold text-blue-600">
              {chartData.totals.activeUsers.toLocaleString()}
            </div>
            <div className="text-xs text-blue-800">Active Users</div>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <div className="text-xl font-bold text-green-600">
              {chartData.totals.newUsers.toLocaleString()}
            </div>
            <div className="text-xs text-green-800">New Users</div>
          </div>
          <div className="rounded-lg bg-purple-50 p-3">
            <div className="text-xl font-bold text-purple-600">
              {chartData.totals.sessions.toLocaleString()}
            </div>
            <div className="text-xs text-purple-800">Sessions</div>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3">
            <div className="text-xl font-bold text-yellow-600">
              {chartData.totals.pageviews.toLocaleString()}
            </div>
            <div className="text-xs text-yellow-800">Page Views</div>
          </div>
          <div className="rounded-lg bg-orange-50 p-3">
            <div className="text-xl font-bold text-orange-600">
              {chartData.totals.bounceRate.toFixed(1)}%
            </div>
            <div className="text-xs text-orange-800">Bounce Rate</div>
          </div>
          <div className="rounded-lg bg-indigo-50 p-3">
            <div className="text-xl font-bold text-indigo-600">
              {Math.round(chartData.totals.sessionDuration)}s
            </div>
            <div className="text-xs text-indigo-800">Avg. Session</div>
          </div>
        </div>
      </div>

      {chartsVisible && (
        <>
          {/* Time Series Chart */}
          {chartData.timeSeriesData.length > 0 && (
            <div>
              <h4 className="text-sm mb-2 font-medium text-gray-900">
                Users & Sessions Over Time
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      try {
                        return new Date(String(value)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } catch {
                        return String(value);
                      }
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(value) => {
                      try {
                        return new Date(String(value)).toLocaleDateString();
                      } catch {
                        return String(value);
                      }
                    }}
                    formatter={(value: number, name: string) => [
                      typeof value === "number"
                        ? value.toLocaleString()
                        : String(value),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="activeUsers"
                    stroke="#0088FE"
                    strokeWidth={2}
                    name="Active Users"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="New Users"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#FFBB28"
                    strokeWidth={2}
                    name="Sessions"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Device Breakdown & Top Countries */}
          {(chartData.deviceData.length > 0 || chartData.countryData.length > 0) && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {chartData.deviceData.length > 0 && (
                <div>
                  <h4 className="text-sm mb-2 font-medium text-gray-900">
                    Users by Device
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chartData.deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="activeUsers"
                        fontSize={10}
                      >
                        {chartData.deviceData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => value.toLocaleString()}
                      />
                       <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartData.countryData.length > 0 && (
                <div>
                  <h4 className="text-sm mb-2 font-medium text-gray-900">
                    Top Countries
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData.countryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                      <Tooltip
                        formatter={(value: number) => value.toLocaleString()}
                      />
                      <Bar dataKey="activeUsers" fill="#0088FE" barSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}