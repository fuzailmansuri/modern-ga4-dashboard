## 🔐 Authentication & Authorization

### Google OAuth2 Setup

The application uses Google OAuth2 for authentication with the following scopes:

- `openid`, `email`, `profile` - Basic user info
- `https://www.googleapis.com/auth/analytics.readonly` - Read GA4 data
- `https://www.googleapis.com/auth/analytics.manage.users.readonly` - Read GA4 user permissions

### Environment Variables Required

```env
# Google OAuth2
AUTH_SECRET=your-auth-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Google Analytics API (Optional - for service account auth)
GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY=your-service-account-json
GOOGLE_ANALYTICS_PROPERTY_ID=your-property-id
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
GOOGLE_ANALYTICS_ACCOUNT_ID=your-account-id
```

## 📊 Google Analytics Integration

### GA4 API Service (`src/lib/google-analytics.ts`)

The core service class `GoogleAnalyticsServiceImpl` provides:

#### Key Methods:

- `getAccounts(accessToken)` - Fetch all GA4 accounts
- `getProperties(accessToken, accountId?)` - Fetch properties for accounts
- `getAnalyticsData(accessToken, propertyId, startDate, endDate)` - Get analytics data
- `getPropertyDetails(accessToken, propertyId)` - Get detailed property info

#### Authentication Methods:

- **OAuth2 Client** - Uses user's access token from Google OAuth
- **Service Account** - Uses service account credentials (fallback)

#### Data Structure:

The service fetches comprehensive GA4 metrics including:

- **User Metrics**: activeUsers, newUsers, totalUsers
- **Session Metrics**: sessions, bounceRate, averageSessionDuration
- **Page Metrics**: screenPageViews, pageViews
- **Geographic Data**: country, region, city
- **Device Data**: deviceCategory, browser, operatingSystem

### API Endpoints

#### 1. `/api/analytics/properties` (GET)

- **Purpose**: Fetch all GA4 properties for authenticated user
- **Query Params**: `accountId` (optional)
- **Response**: Array of `AnalyticsProperty` objects
- **Auth**: Requires valid OAuth2 access token

#### 2. `/api/analytics/properties/[id]/data` (GET)

- **Purpose**: Fetch analytics data for specific property
- **Query Params**: `startDate`, `endDate` (default: 30daysAgo to today)
- **Response**: GA4 analytics data with metrics and dimensions
- **Auth**: Requires valid OAuth2 access token

### Dimension filters

The property data endpoint and dashboard UI accept optional query filters that map directly to GA4 dimension names. Multiple values are provided as comma-separated lists in the request.

| Query string | GA4 dimension | UI location |
| --- | --- | --- |
| `channelGroups` | `sessionDefaultChannelGroup` | Dashboard “Channel groups” chips |
| `sourceMediums` | `sessionSourceMedium` | “Source / medium pairs” token input |
| `countries` | `country` | “Countries” token input |
| `devices` | `deviceCategory` | “Device categories” chips |

- Channel groups must use GA’s canonical labels. The UI surfaces the standard set provided in `src/lib/analytics-filter-utils.ts` (e.g. `Organic Search`, `Paid Social`, `Direct`, `(Other)`).
- Device category filters accept the GA4 values `desktop`, `mobile`, and `tablet`.
- Source/medium and country filters are case-sensitive; enter the exact strings returned by GA4 to receive matches.

All active filters are applied consistently to the time-series charts, table exports, activity probe, and the channel breakdown report.

## 🎨 Frontend Components

### Main Components

#### 1. `PropertyAnalyticsDashboard` (`src/components/PropertyAnalyticsDashboard.tsx`)

- **Purpose**: Main dashboard container for multiple properties
- **Features**:
  - Date range selection (1 day to 1 year)
  - Global refresh functionality
  - Hide/show failed dashboards toggle
  - Individual property analytics cards

#### 2. `AnalyticsCharts` (`src/components/AnalyticsCharts.tsx`)

- **Purpose**: Data visualization component
- **Charts**:
  - **Time Series Line Chart**: Users and sessions over time
  - **Device Pie Chart**: Active users by device category
  - **Country Bar Chart**: Top countries by active users
  - **Metrics Overview Cards**: Key metrics summary

#### 3. `JsonViewer` (`src/components/JsonViewer.tsx`)

- **Purpose**: Raw JSON data display for debugging
- **Features**: Collapsible JSON tree view

### Data Flow

1. **Authentication** → User signs in with Google OAuth2
2. **Property Fetching** → Dashboard loads user's GA4 properties
3. **Data Fetching** → SWR fetches analytics data for each property
4. **Data Processing** → Raw GA4 data is processed for charts
5. **Visualization** → Recharts renders interactive charts

## 📈 Analytics Data Processing

### Data Transformation Pipeline

1. **Raw GA4 Response** → Google Analytics API response
2. **Data Validation** → TypeScript type checking
3. **Data Aggregation** → Group by date, device, country
4. **Chart Preparation** → Format for Recharts components
5. **Error Handling** → Graceful fallbacks for missing data

### Key Metrics Tracked

- **Active Users**: Users who engaged with the site
- **New Users**: First-time visitors
- **Sessions**: User interactions with the site
- **Screen Page Views**: Total page views
- **Bounce Rate**: Single-page sessions percentage
- **Average Session Duration**: Time spent per session

## 🛠️ Development Guidelines

### Code Style & Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with Next.js config
- **Prettier**: Code formatting with Tailwind plugin
- **Import Aliases**: Uses `~` for `src/` directory

### File Naming Conventions

- **Components**: PascalCase (e.g., `AnalyticsCharts.tsx`)
- **Pages**: kebab-case (e.g., `analytics-data/page.tsx`)
- **API Routes**: kebab-case (e.g., `[id]/data/route.ts`)
- **Types**: camelCase (e.g., `analytics.ts`)

### Error Handling Strategy

1. **API Level**: Proper HTTP status codes and error messages
2. **Component Level**: Loading states and error boundaries
3. **User Level**: User-friendly error messages and retry options
4. **Authentication**: Token refresh and re-authentication flows

### Performance Optimizations

- **SWR Caching**: Client-side data caching
- **Lazy Loading**: Component-level code splitting
- **Image Optimization**: Next.js Image component
- **Bundle Optimization**: Tree shaking and code splitting

## 🚀 Deployment

### Environment Setup

1. **Google Cloud Console**:
   - Create OAuth2 credentials
   - Enable Google Analytics API
   - Set up service account (optional)

2. **Environment Variables**:
   - Copy `.env.example` to `.env.local`
   - Fill in all required variables

3. **Build & Deploy**:
   ```bash
   npm run build
   npm start
   ```

### Deployment Platforms

- **Vercel**: Recommended for Next.js apps
- **Netlify**: Alternative with good Next.js support
- **Docker**: Containerized deployment

## 🔧 Maintenance & Updates

### Adding New Metrics

1. **Update Types** (`src/types/analytics.ts`):
   - Add new metric to `GA4MetricName` type
   - Update `AnalyticsData` interface if needed

2. **Update Service** (`src/lib/google-analytics.ts`):
   - Add metric to `getAnalyticsData` method
   - Update metrics array in API call

3. **Update Components** (`src/components/AnalyticsCharts.tsx`):
   - Add new metric to data processing
   - Create new chart or update existing ones

### Adding New Chart Types

1. **Import Recharts Components**:

   ```typescript
   import { AreaChart, Area } from "recharts";
   ```

2. **Add Data Processing**:

   ```typescript
   const newChartData = processDataForNewChart(data);
   ```

3. **Render Chart**:
   ```typescript
   <ResponsiveContainer width="100%" height={300}>
     <AreaChart data={newChartData}>
       {/* Chart configuration */}
     </AreaChart>
   </ResponsiveContainer>
   ```

### Error Handling Updates

1. **API Errors**: Add specific error types in `src/types/analytics.ts`
2. **Component Errors**: Update error boundaries and fallbacks
3. **User Feedback**: Improve error messages and recovery options

## 🐛 Troubleshooting

### Common Issues

#### 1. Authentication Errors

- **Issue**: "No valid access token found"
- **Solution**: Check OAuth2 credentials and scopes
- **Debug**: Verify `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`

#### 2. API Rate Limits

- **Issue**: "Quota exceeded" errors
- **Solution**: Implement request throttling
- **Debug**: Check Google Cloud Console quotas

#### 3. Missing Data

- **Issue**: Empty charts or "No data available"
- **Solution**: Verify property has data for selected date range
- **Debug**: Check GA4 property settings and data retention

#### 4. TypeScript Errors

- **Issue**: Type mismatches in API responses
- **Solution**: Update type definitions in `src/types/analytics.ts`
- **Debug**: Check Google Analytics API documentation

### Debug Tools

- **JsonViewer Component**: View raw API responses
- **Browser DevTools**: Network tab for API calls
- **Console Logs**: Detailed error logging
- **SWR DevTools**: Data fetching debugging

## �� API Reference

### Google Analytics API

- **Base URL**: `https://analyticsdata.googleapis.com/v1beta`
- **Authentication**: OAuth2 access token
- **Rate Limits**: 100 requests per 100 seconds per user
- **Data Retention**: Up to 14 months (GA4 Standard)

### NextAuth.js

- **Strategy**: JWT with refresh token rotation
- **Session**: Server-side session validation
- **Callbacks**: Custom JWT and session callbacks

### SWR Configuration

- **Caching**: Automatic request deduplication
- **Revalidation**: Manual refresh only
- **Error Handling**: Retry disabled for analytics data

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** feature branch
3. **Implement** changes with proper types
4. **Test** with real GA4 data
5. **Submit** pull request

### Code Review Checklist

- [ ] TypeScript types are correct
- [ ] Error handling is implemented
- [ ] Performance impact is considered
- [ ] User experience is maintained
- [ ] Documentation is updated

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review Google Analytics API documentation
3. Check NextAuth.js documentation
4. Open an issue with detailed error information

---

**Last Updated**: December 2024
**Version**: 0.1.0
**Maintainer**: Farhan Mansuri
