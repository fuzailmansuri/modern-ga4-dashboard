# Migration from Universal Analytics to GA4

This document outlines the changes made to migrate from Universal Analytics (UA) to Google Analytics 4 (GA4).

## What Changed

### API Changes
- **Old**: Universal Analytics Management API v3 (`google.analytics('v3')`)
- **New**: GA4 Admin API v1beta (`google.analyticsadmin('v1beta')`) and GA4 Data API v1beta (`google.analyticsdata('v1beta')`)

### Data Structure Changes

#### Accounts
- **Old**: `account.id` for account identifier
- **New**: `account.name` for account identifier (format: `accounts/{accountId}`)

#### Properties
- **Old**: Web Properties with `property.id` as identifier
- **New**: GA4 Properties with `property.name` as identifier (format: `properties/{propertyId}`)

#### Property Types
- **Old**: `level` field with values like 'STANDARD'
- **New**: `propertyType` field with values like 'PROPERTY_TYPE_ORDINARY'

### Environment Variables
The environment variables remain the same, but their usage has been updated:

- `GOOGLE_ANALYTICS_PROPERTY_ID`: Now expects a GA4 property ID (numeric)
- `GOOGLE_ANALYTICS_ACCOUNT_ID`: Now expects format `accounts/{accountId}`

## Required Actions

### 1. Update Google Cloud Console Setup

1. **Enable GA4 APIs**:
   - Go to Google Cloud Console
   - Enable "Google Analytics Admin API"
   - Enable "Google Analytics Data API"

2. **Update Service Account Permissions**:
   - Ensure your service account has access to GA4 properties
   - Grant "Viewer" role on GA4 properties you want to access

### 2. Update Environment Variables

Update your `.env` file with GA4 property IDs:

```bash
# Old UA Property ID format
GOOGLE_ANALYTICS_PROPERTY_ID="UA-123456789-1"

# New GA4 Property ID format (numeric only)
GOOGLE_ANALYTICS_PROPERTY_ID="123456789"
```

### 3. OAuth Scopes
The OAuth scopes remain the same:
- `https://www.googleapis.com/auth/analytics.readonly`
- `https://www.googleapis.com/auth/analytics.manage.users.readonly`

## Key Differences

### Property Identification
- **UA**: Properties identified by tracking ID (e.g., "UA-123456789-1")
- **GA4**: Properties identified by numeric ID (e.g., "123456789")

### Data Retention
- **UA**: Fixed data retention policies
- **GA4**: Configurable data retention (2, 14, 26, 38, or 50 months)

### Property Types
- **UA**: Standard vs Premium (360)
- **GA4**: Ordinary, Subproperty, or Rollup properties

## Testing the Migration

1. Ensure your GA4 properties are properly set up in Google Analytics
2. Update your environment variables
3. Test the API endpoints:
   - `/api/analytics/accounts` - Should return GA4 accounts
   - `/api/analytics/properties` - Should return GA4 properties
   - `/api/analytics/properties/[id]` - Should return GA4 property details

## Troubleshooting

### Common Issues

1. **"Property not found" errors**:
   - Ensure you're using the numeric GA4 property ID, not the UA tracking ID
   - Verify the service account has access to the GA4 property

2. **Permission errors**:
   - Check that the GA4 Admin API is enabled in Google Cloud Console
   - Verify service account permissions in GA4 property settings

3. **Empty results**:
   - GA4 properties may not appear if they don't have data or are newly created
   - Check property sharing settings in GA4

### Migration Checklist

- [ ] GA4 Admin API enabled in Google Cloud Console
- [ ] GA4 Data API enabled in Google Cloud Console
- [ ] Service account has access to GA4 properties
- [ ] Environment variables updated with GA4 property IDs
- [ ] Test all API endpoints
- [ ] Verify data is displaying correctly in the dashboard

## Resources

- [GA4 Admin API Documentation](https://developers.google.com/analytics/devguides/config/admin/v1)
- [GA4 Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [GA4 Migration Guide](https://support.google.com/analytics/answer/9744165)