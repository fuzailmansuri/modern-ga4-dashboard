// Google Analytics API Types

export interface AnalyticsAccount {
  name: string;
  displayName: string;
  regionCode: string;
  createTime: string;
  updateTime: string;
}

export interface AnalyticsProperty {
  name: string;
  propertyId: string;
  displayName: string;
  propertyType: string;
  createTime: string;
  updateTime: string;
  parent: string;
  timeZone: string;
  currencyCode: string;
}

export interface PropertyDetails extends AnalyticsProperty {
  industryCategory: string;
  serviceLevel: string;
  dataRetentionSettings: {
    eventDataRetention: string;
    resetUserDataOnNewActivity: boolean;
  };
}

// GA4-specific types
export type GA4PropertyType =
  | "PROPERTY_TYPE_UNSPECIFIED"
  | "PROPERTY_TYPE_ORDINARY"
  | "PROPERTY_TYPE_SUBPROPERTY"
  | "PROPERTY_TYPE_ROLLUP";

export type GA4IndustryCategory =
  | "INDUSTRY_CATEGORY_UNSPECIFIED"
  | "AUTOMOTIVE"
  | "BUSINESS_AND_INDUSTRIAL_MARKETS"
  | "FINANCE"
  | "HEALTHCARE"
  | "TECHNOLOGY"
  | "TRAVEL"
  | "OTHER";

export type GA4ServiceLevel =
  | "SERVICE_LEVEL_UNSPECIFIED"
  | "GOOGLE_ANALYTICS_STANDARD"
  | "GOOGLE_ANALYTICS_360";

export type GA4DataRetention =
  | "RETENTION_DURATION_UNSPECIFIED"
  | "TWO_MONTHS"
  | "FOURTEEN_MONTHS"
  | "TWENTY_SIX_MONTHS"
  | "THIRTY_EIGHT_MONTHS"
  | "FIFTY_MONTHS";

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface AnalyticsFilterSelection {
  channelGroups: string[];
  sourceMediums: string[];
  countries: string[];
  devices: string[];
}

// Google Analytics API Response Types
export interface GoogleAnalyticsAccountsResponse {
  accounts: AnalyticsAccount[];
  nextPageToken?: string;
}

export interface GoogleAnalyticsPropertiesResponse {
  properties: AnalyticsProperty[];
  nextPageToken?: string;
}

// Analytics Data Types
export interface AnalyticsMetric {
  name: string;
  values: string[];
}

export interface AnalyticsDimension {
  name: string;
  values: string[];
}

export interface AnalyticsRow {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

export interface AnalyticsData {
  dimensionHeaders: { name: string }[];
  metricHeaders: { name: string; type: string }[];
  rows: AnalyticsRow[];
  totals: AnalyticsRow[];
  maximums: AnalyticsRow[];
  minimums: AnalyticsRow[];
  rowCount: number;
}

export interface PropertyAnalyticsData {
  propertyId: string;
  displayName: string;
  data: AnalyticsData;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Service Interface
export interface GoogleAnalyticsService {
  getAccounts(accessToken: string): Promise<AnalyticsAccount[]>;
  getProperties(
    accessToken: string,
    accountId?: string,
  ): Promise<AnalyticsProperty[]>;
  getPropertyDetails(
    accessToken: string,
    propertyId: string,
  ): Promise<PropertyDetails>;
  getAnalyticsData(
    accessToken: string,
    propertyId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AnalyticsData>;
}

// GA4 Metrics - Comprehensive list of all available metrics
export type GA4MetricName =
  // User Metrics
  | "activeUsers"
  | "newUsers"
  | "totalUsers"
  | "returningUsers"
  | "userEngagementDuration"
  | "userEngagementDurationPerSession"
  | "userEngagementDurationPerUser"
  | "userEngagementRate"
  | "userEngagementRatePerSession"
  | "userEngagementRatePerUser"

  // Session Metrics
  | "sessions"
  | "sessionsPerUser"
  | "averageSessionDuration"
  | "bounceRate"
  | "sessionEngagementRate"
  | "sessionConversionRate"

  // Page/Screen Metrics
  | "screenPageViews"
  | "screenPageViewsPerSession"
  | "screenPageViewsPerUser"
  | "uniquePageviews"
  | "uniquePageviewsPerSession"
  | "uniquePageviewsPerUser"
  | "pageViews"
  | "pageViewsPerSession"
  | "pageViewsPerUser"

  // Event Metrics
  | "eventCount"
  | "eventCountPerSession"
  | "eventCountPerUser"
  | "uniqueEvents"
  | "uniqueEventsPerSession"
  | "uniqueEventsPerUser"

  // E-commerce Metrics
  | "transactions"
  | "transactionsPerSession"
  | "transactionsPerUser"
  | "transactionRevenue"
  | "transactionRevenuePerSession"
  | "transactionRevenuePerUser"
  | "averageOrderValue"
  | "itemsViewed"
  | "itemsViewedPerSession"
  | "itemsViewedPerUser"
  | "itemsPurchased"
  | "itemsPurchasedPerSession"
  | "itemsPurchasedPerUser"
  | "itemRevenue"
  | "itemRevenuePerSession"
  | "itemRevenuePerUser"
  | "itemViewEvents"
  | "itemViewEventsPerSession"
  | "itemViewEventsPerUser"
  | "itemPurchaseEvents"
  | "itemPurchaseEventsPerSession"
  | "itemPurchaseEventsPerUser"

  // Conversion Metrics
  | "conversions"
  | "conversionsPerSession"
  | "conversionsPerUser"
  | "conversionRate"
  | "conversionRatePerSession"
  | "conversionRatePerUser"
  | "conversionValue"
  | "conversionValuePerSession"
  | "conversionValuePerUser"

  // Engagement Metrics
  | "engagementRate"
  | "engagementRatePerSession"
  | "engagementRatePerUser"
  | "engagementTime"
  | "engagementTimePerSession"
  | "engagementTimePerUser"

  // Traffic Source Metrics
  | "sessionsPerUserBySessionSource"
  | "sessionsPerUserBySessionMedium"
  | "sessionsPerUserBySessionCampaign"
  | "sessionsPerUserBySessionSourceMedium"
  | "sessionsPerUserBySessionCampaignSource"
  | "sessionsPerUserBySessionCampaignMedium"
  | "sessionsPerUserBySessionCampaignSourceMedium"

  // Geographic Metrics
  | "sessionsPerUserByCountry"
  | "sessionsPerUserByRegion"
  | "sessionsPerUserByCity"

  // Device Metrics
  | "sessionsPerUserByDeviceCategory"
  | "sessionsPerUserByBrowser"
  | "sessionsPerUserByOperatingSystem"
  | "sessionsPerUserByDeviceModel"

  // Content Metrics
  | "sessionsPerUserByPagePath"
  | "sessionsPerUserByPageTitle"
  | "sessionsPerUserByPagePathPlusQueryString"
  | "sessionsPerUserByPagePathLevel1"
  | "sessionsPerUserByPagePathLevel2"
  | "sessionsPerUserByPagePathLevel3"
  | "sessionsPerUserByPagePathLevel4"

  // Custom Metrics (if configured)
  | "customEvent:custom_metric_1"
  | "customEvent:custom_metric_2"
  | "customEvent:custom_metric_3"
  | "customEvent:custom_metric_4"
  | "customEvent:custom_metric_5"

  // Audience Metrics
  | "audienceName"
  | "audienceId"
  | "audienceDescription"
  | "audienceMembershipDuration"
  | "audienceActiveUsers"
  | "audienceNewUsers"
  | "audienceReturningUsers"

  // Cohort Metrics
  | "cohortActiveUsers"
  | "cohortTotalUsers"
  | "cohortRetentionRate"
  | "cohortReturningUsers"
  | "cohortNewUsers"

  // Lifetime Value Metrics
  | "lifetimeValue"
  | "lifetimeValuePerUser"
  | "lifetimeValuePerSession"

  // Search Metrics
  | "searchSessions"
  | "searchSessionsPerUser"
  | "searchUniques"
  | "searchUniquesPerUser"
  | "searchResultViews"
  | "searchResultViewsPerUser"
  | "searchResultViewsPerSession"

  // App Metrics (for mobile apps)
  | "appInstalls"
  | "appInstallsPerUser"
  | "appUninstalls"
  | "appUninstallsPerUser"
  | "appCrashes"
  | "appCrashesPerUser"
  | "appSessions"
  | "appSessionsPerUser"

  // Video Metrics (if video tracking is enabled)
  | "videoViews"
  | "videoViewsPerUser"
  | "videoViewsPerSession"
  | "videoEngagementRate"
  | "videoAverageWatchTime"
  | "videoWatchTime"

  // Social Metrics
  | "socialInteractions"
  | "socialInteractionsPerUser"
  | "socialInteractionsPerSession"
  | "socialShares"
  | "socialSharesPerUser"
  | "socialSharesPerSession"

  // Form Metrics
  | "formSubmissions"
  | "formSubmissionsPerUser"
  | "formSubmissionsPerSession"
  | "formViews"
  | "formViewsPerUser"
  | "formViewsPerSession"
  | "formConversionRate"

  // Scroll Metrics
  | "scrollDepth"
  | "scrollDepthPerUser"
  | "scrollDepthPerSession"

  // Click Metrics
  | "clicks"
  | "clicksPerUser"
  | "clicksPerSession"
  | "clickThroughRate"

  // Impression Metrics
  | "impressions"
  | "impressionsPerUser"
  | "impressionsPerSession"

  // Error Metrics
  | "errors"
  | "errorsPerUser"
  | "errorsPerSession"
  | "errorRate"

  // Performance Metrics
  | "pageLoadTime"
  | "pageLoadTimePerUser"
  | "pageLoadTimePerSession"
  | "serverResponseTime"
  | "serverResponseTimePerUser"
  | "serverResponseTimePerSession"

  // Custom Dimensions (if configured)
  | "customEvent:custom_dimension_1"
  | "customEvent:custom_dimension_2"
  | "customEvent:custom_dimension_3"
  | "customEvent:custom_dimension_4"
  | "customEvent:custom_dimension_5";

// GA4 Dimensions - Comprehensive list of all available dimensions
export type GA4DimensionName =
  // Time Dimensions
  | "date"
  | "dateHour"
  | "dateHourMinute"
  | "dateMinute"
  | "dateWeek"
  | "dateMonth"
  | "dateQuarter"
  | "dateYear"
  | "dateHourMinuteSecond"
  | "dateMinuteSecond"
  | "dateSecond"

  // User Dimensions
  | "userId"
  | "userPseudoId"
  | "userFirstTouchChannel"
  | "userFirstTouchSource"
  | "userFirstTouchMedium"
  | "userFirstTouchCampaign"
  | "userFirstTouchAdContent"
  | "userFirstTouchKeyword"
  | "userFirstTouchPlacement"
  | "userFirstTouchSite"
  | "userFirstTouchCreative"
  | "userFirstTouchAdGroup"
  | "userFirstTouchAdNetwork"
  | "userFirstTouchAdNetworkType"
  | "userFirstTouchAdNetworkPlacement"
  | "userFirstTouchAdNetworkCreative"
  | "userFirstTouchAdNetworkAdGroup"
  | "userFirstTouchAdNetworkCampaign"
  | "userFirstTouchAdNetworkSite"

  // Session Dimensions
  | "sessionId"
  | "sessionDefaultChannelGroup"
  | "sessionDefaultChannelGrouping"
  | "sessionSource"
  | "sessionMedium"
  | "sessionCampaign"
  | "sessionCampaignId"
  | "sessionCampaignAdContent"
  | "sessionCampaignKeyword"
  | "sessionCampaignPlacement"
  | "sessionCampaignSite"
  | "sessionCampaignCreative"
  | "sessionCampaignAdGroup"
  | "sessionCampaignAdNetwork"
  | "sessionCampaignAdNetworkType"
  | "sessionCampaignAdNetworkPlacement"
  | "sessionCampaignAdNetworkCreative"
  | "sessionCampaignAdNetworkAdGroup"
  | "sessionCampaignAdNetworkCampaign"
  | "sessionCampaignAdNetworkSite"

  // Geographic Dimensions
  | "country"
  | "region"
  | "city"
  | "continent"
  | "subContinent"
  | "metro"
  | "cityId"
  | "regionId"
  | "countryId"
  | "continentId"
  | "subContinentId"
  | "metroId"

  // Device Dimensions
  | "deviceCategory"
  | "deviceBrand"
  | "deviceModel"
  | "deviceOperatingSystem"
  | "deviceOperatingSystemVersion"
  | "deviceVendor"
  | "deviceScreenResolution"
  | "deviceScreenColors"
  | "deviceScreenSize"
  | "deviceScreenWidth"
  | "deviceScreenHeight"
  | "deviceScreenDensity"
  | "deviceScreenDensityBucket"
  | "deviceScreenDensityBucketId"
  | "deviceScreenDensityBucketName"
  | "deviceScreenDensityBucketDescription"
  | "deviceScreenDensityBucketExample"
  | "deviceScreenDensityBucketExampleId"
  | "deviceScreenDensityBucketExampleName"
  | "deviceScreenDensityBucketExampleDescription"

  // Browser Dimensions
  | "browser"
  | "browserVersion"
  | "browserEngine"
  | "browserEngineVersion"

  // Platform Dimensions
  | "platform"
  | "platformVersion"
  | "platformDeviceCategory"

  // Content Dimensions
  | "pagePath"
  | "pageTitle"
  | "pagePathPlusQueryString"
  | "pagePathLevel1"
  | "pagePathLevel2"
  | "pagePathLevel3"
  | "pagePathLevel4"
  | "pageReferrer"
  | "pageReferrerCategory"
  | "pageReferrerSource"
  | "pageReferrerMedium"
  | "pageReferrerCampaign"
  | "pageReferrerCampaignId"
  | "pageReferrerCampaignAdContent"
  | "pageReferrerCampaignKeyword"
  | "pageReferrerCampaignPlacement"
  | "pageReferrerCampaignSite"
  | "pageReferrerCampaignCreative"
  | "pageReferrerCampaignAdGroup"
  | "pageReferrerCampaignAdNetwork"
  | "pageReferrerCampaignAdNetworkType"
  | "pageReferrerCampaignAdNetworkPlacement"
  | "pageReferrerCampaignAdNetworkCreative"
  | "pageReferrerCampaignAdNetworkAdGroup"
  | "pageReferrerCampaignAdNetworkCampaign"
  | "pageReferrerCampaignAdNetworkSite"

  // Event Dimensions
  | "eventName"
  | "eventCount"
  | "eventValue"
  | "eventValueInUsd"
  | "eventValueInCurrency"
  | "eventCurrency"
  | "eventBundleSequenceId"
  | "eventServerTimestampOffset"
  | "eventTimestampMicros"
  | "eventTimestamp"
  | "eventDate"
  | "eventDateHour"
  | "eventDateHourMinute"
  | "eventDateMinute"
  | "eventDateWeek"
  | "eventDateMonth"
  | "eventDateQuarter"
  | "eventDateYear"
  | "eventDateHourMinuteSecond"
  | "eventDateMinuteSecond"
  | "eventDateSecond"

  // E-commerce Dimensions
  | "transactionId"
  | "transactionRevenue"
  | "transactionRevenueInUsd"
  | "transactionRevenueInCurrency"
  | "transactionCurrency"
  | "transactionTax"
  | "transactionTaxInUsd"
  | "transactionTaxInCurrency"
  | "transactionShipping"
  | "transactionShippingInUsd"
  | "transactionShippingInCurrency"
  | "transactionCouponCode"
  | "transactionCouponCodeId"
  | "transactionCouponCodeName"
  | "transactionCouponCodeDescription"
  | "transactionCouponCodeExample"
  | "transactionCouponCodeExampleId"
  | "transactionCouponCodeExampleName"
  | "transactionCouponCodeExampleDescription"
  | "transactionAffiliation"
  | "transactionAffiliationId"
  | "transactionAffiliationName"
  | "transactionAffiliationDescription"
  | "transactionAffiliationExample"
  | "transactionAffiliationExampleId"
  | "transactionAffiliationExampleName"
  | "transactionAffiliationExampleDescription"

  // Item Dimensions
  | "itemId"
  | "itemName"
  | "itemCategory"
  | "itemCategory2"
  | "itemCategory3"
  | "itemCategory4"
  | "itemCategory5"
  | "itemVariant"
  | "itemBrand"
  | "itemCouponCode"
  | "itemAffiliation"
  | "itemListId"
  | "itemListName"
  | "itemListIndex"
  | "itemPromotionId"
  | "itemPromotionName"
  | "itemCreativeSlot"
  | "itemCreativeName"
  | "itemLocationId"
  | "itemLocationName"
  | "itemDiscount"
  | "itemDiscountInUsd"
  | "itemDiscountInCurrency"
  | "itemRevenue"
  | "itemRevenueInUsd"
  | "itemRevenueInCurrency"
  | "itemQuantity"
  | "itemCurrency"
  | "itemPrice"
  | "itemPriceInUsd"
  | "itemPriceInCurrency"

  // Custom Dimensions (if configured)
  | "customEvent:custom_dimension_1"
  | "customEvent:custom_dimension_2"
  | "customEvent:custom_dimension_3"
  | "customEvent:custom_dimension_4"
  | "customEvent:custom_dimension_5"
  | "customEvent:custom_dimension_6"
  | "customEvent:custom_dimension_7"
  | "customEvent:custom_dimension_8"
  | "customEvent:custom_dimension_9"
  | "customEvent:custom_dimension_10"
  | "customEvent:custom_dimension_11"
  | "customEvent:custom_dimension_12"
  | "customEvent:custom_dimension_13"
  | "customEvent:custom_dimension_14"
  | "customEvent:custom_dimension_15"
  | "customEvent:custom_dimension_16"
  | "customEvent:custom_dimension_17"
  | "customEvent:custom_dimension_18"
  | "customEvent:custom_dimension_19"
  | "customEvent:custom_dimension_20"
  | "customEvent:custom_dimension_21"
  | "customEvent:custom_dimension_22"
  | "customEvent:custom_dimension_23"
  | "customEvent:custom_dimension_24"
  | "customEvent:custom_dimension_25"
  | "customEvent:custom_dimension_26"
  | "customEvent:custom_dimension_27"
  | "customEvent:custom_dimension_28"
  | "customEvent:custom_dimension_29"
  | "customEvent:custom_dimension_30"
  | "customEvent:custom_dimension_31"
  | "customEvent:custom_dimension_32"
  | "customEvent:custom_dimension_33"
  | "customEvent:custom_dimension_34"
  | "customEvent:custom_dimension_35"
  | "customEvent:custom_dimension_36"
  | "customEvent:custom_dimension_37"
  | "customEvent:custom_dimension_38"
  | "customEvent:custom_dimension_39"
  | "customEvent:custom_dimension_40"
  | "customEvent:custom_dimension_41"
  | "customEvent:custom_dimension_42"
  | "customEvent:custom_dimension_43"
  | "customEvent:custom_dimension_44"
  | "customEvent:custom_dimension_45"
  | "customEvent:custom_dimension_46"
  | "customEvent:custom_dimension_47"
  | "customEvent:custom_dimension_48"
  | "customEvent:custom_dimension_49"
  | "customEvent:custom_dimension_50";
