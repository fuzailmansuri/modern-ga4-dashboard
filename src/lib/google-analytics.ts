/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { google } from "googleapis";
import { env } from "../env.js";
// Avoid importing googleapis types (not available). Use `any` for type positions to preserve runtime behavior.
import type { AnalyticsAccount, AnalyticsProperty, PropertyDetails, AnalyticsData } from "../types/analytics";

/**
 * Google Analytics Service Implementation
 * Handles all interactions with the Google Analytics API (GA4)
 */
export class GoogleAnalyticsServiceImpl {
  private analyticsAdmin;
  private analyticsData;
  private auth: any;

  constructor() {
    this.analyticsAdmin = google.analyticsadmin("v1beta");
    this.analyticsData = google.analyticsdata("v1beta");
    this.auth = this.createAuthClient();
  }

  /**
   * Creates an authenticated client.
   * Prioritizes Service Account credentials if available, otherwise falls back to OAuth2.
   */
  private createAuthClient() {
    if (env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY) {
      try {
        const raw = env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY;
        let credentials: any;
        try {
          credentials = JSON.parse(raw);
        } catch (e) {
          // Not JSON: might be PEM private key content. If so, construct minimal credentials
          if (typeof raw === 'string' && raw.includes('-----BEGIN') && env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            credentials = {
              type: 'service_account',
              private_key: raw,
              client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            };
          } else {
            throw e;
          }
        }

        return new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        });
      } catch (error) {
        // Provide a clear Error object so callers can handle it and satisfy lint rules
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to parse Service Account credentials: ${msg}`);
      }
    }

    return new google.auth.OAuth2();
  }
  
  /**
   * Gets the appropriate authentication object for a request.
   */
  private getAuth(accessToken?: string) {
    // If a user OAuth access token is provided, prefer it to fetch
    // resources the signed-in user can access.
    if (accessToken) {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      return auth;
    }

    // Fall back to service account only when no user token is available.
    if (this.auth instanceof google.auth.GoogleAuth) {
      return this.auth;
    }

    throw new Error("No authentication available: missing user access token and service account credentials.");
  }


  /**
   * Get all Analytics accounts accessible to the user
   */
  async getAccounts(accessToken: string): Promise<AnalyticsAccount[]> {
    try {
      const response = await this.analyticsAdmin.accounts.list({
        auth: this.getAuth(accessToken),
      });

      if (!response.data.accounts) return [];
  return response.data.accounts.map((account: any) => ({
        name: account.name ?? "",
        displayName: account.displayName ?? "",
        regionCode: account.regionCode ?? "",
        createTime: account.createTime ?? "",
        updateTime: account.updateTime ?? "",
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch Analytics accounts: ${errorMessage}`);
    }
  }

  /**
   * Get all properties for the user's accounts
   */
  async getProperties(accessToken: string): Promise<AnalyticsProperty[]> {
    try {
      const accounts = await this.getAccounts(accessToken);
  const properties: AnalyticsProperty[] = [];

      for (const account of accounts) {
        const response = await this.analyticsAdmin.properties.list({
          auth: this.getAuth(accessToken),
          filter: `parent:${account.name}`,
        });

        if (response.data.properties) {
          properties.push(
            ...response.data.properties.map((property: any) => ({
              name: property.name ?? "",
              propertyId: property.name?.split("/").pop() ?? "",
              displayName: property.displayName ?? "",
              propertyType: property.propertyType ?? "",
              createTime: property.createTime ?? "",
              updateTime: property.updateTime ?? "",
              parent: property.parent ?? "",
              timeZone: property.timeZone ?? "",
              currencyCode: property.currencyCode ?? "",
            })),
          );
        }
      }
      return properties;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch Analytics properties: ${errorMessage}`);
    }
  }

  /**
   * Get detailed information about a specific property
   */
  async getPropertyDetails(accessToken: string, propertyId: string): Promise<PropertyDetails> {
    try {
      const name = `properties/${propertyId}`;
      const response = await this.analyticsAdmin.properties.get({
        auth: this.getAuth(accessToken),
        name,
      });

      const p = response.data ?? {} as any;
      return {
        name: p.name ?? name,
        propertyId: p.name?.split("/").pop() ?? propertyId,
        displayName: p.displayName ?? "",
        propertyType: p.propertyType ?? "",
        createTime: p.createTime ?? "",
        updateTime: p.updateTime ?? "",
        parent: p.parent ?? "",
        timeZone: p.timeZone ?? "",
        currencyCode: p.currencyCode ?? "",
        industryCategory: p.industryCategory ?? "",
        serviceLevel: p.serviceLevel ?? "",
        dataRetentionSettings: {
          eventDataRetention: (p as any).dataRetentionSettings?.eventDataRetention ?? "",
          resetUserDataOnNewActivity: (p as any).dataRetentionSettings?.resetUserDataOnNewActivity ?? false,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch property details for ${propertyId}: ${errorMessage}`);
    }
  }

  /**
   * Generic GA4 runReport wrapper for flexible queries
   */
  async runReport(
    accessToken: string,
    propertyId: string,
    params: {
      startDate: string;
      endDate: string;
      dimensions: string[];
      metrics: string[];
  dimensionFilter?: any;
  limit?: number;
  orderBys?: any[];
    },
  ): Promise<AnalyticsData> {
    try {
      const propertyName = `properties/${propertyId}`;
      const response = await this.analyticsData.properties.runReport({
        auth: this.getAuth(accessToken),
        property: propertyName,
        requestBody: {
          dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
          dimensions: params.dimensions.map((name) => ({ name })),
          metrics: params.metrics.map((name) => ({ name })),
          dimensionFilter: params.dimensionFilter,
          limit: params.limit !== undefined ? String(params.limit) : undefined,
          orderBys: params.orderBys,
        },
      }, { timeout: 30000 });

      const d: any = response.data as any;
      return {
        dimensionHeaders: (d.dimensionHeaders ?? []).map((h: any) => ({ name: h.name ?? "" })),
        metricHeaders: (d.metricHeaders ?? []).map((h: any) => ({ name: h.name ?? "", type: h.type ?? "" })),
        rows: (d.rows ?? []).map((row: any) => ({
          dimensionValues: (row.dimensionValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
          metricValues: (row.metricValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
        })),
        totals: (d.totals ?? []).map((row: any) => ({
          dimensionValues: (row.dimensionValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
          metricValues: (row.metricValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
        })),
        maximums: (d.maximums ?? []).map((row: any) => ({
          dimensionValues: (row.dimensionValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
          metricValues: (row.metricValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
        })),
        minimums: (d.minimums ?? []).map((row: any) => ({
          dimensionValues: (row.dimensionValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
          metricValues: (row.metricValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
        })),
        rowCount: d.rowCount ?? 0,
      };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timed out for property ${propertyId}.`);
      }
      // Log rich error details for diagnostics (do not include sensitive tokens)
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data = (error?.response?.data) as any;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.error('[GA4 runReport] Failed:', {
          propertyId,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          errorMessage: error?.message,
          apiError: data?.error || data,
        });
      } catch {}
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`GA4 runReport failed for property ${propertyId}: ${errorMessage}`);
    }
  }

  /**
   * Get analytics data for a specific property
   */
  async getAnalyticsData(
    accessToken: string,
    propertyId: string,
    startDate = "7daysAgo",
    endDate = "today",
    customMetrics?: string[],
  dimensionFilter?: any,
  ): Promise<AnalyticsData> {
    try {
      const propertyName = `properties/${propertyId}`;
      // Default metrics
      const defaultMetrics = [
        "activeUsers",
        "newUsers",
        "sessions",
        "screenPageViews",
        "bounceRate",
        "averageSessionDuration",
      ];
      const metrics = (customMetrics && customMetrics.length > 0
        ? customMetrics
        : defaultMetrics
      ).map((name) => ({ name }));

      const response = await this.analyticsData.properties.runReport({
        auth: this.getAuth(accessToken),
        property: propertyName,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          // Include dimensions expected by the charts component: date, country, deviceCategory
          dimensions: [{ name: "date" }, { name: "country" }, { name: "deviceCategory" }],
          metrics,
          // Optional dimension filter (e.g., Organic only)
          dimensionFilter,
        },
      }, {
        timeout: 30000, // 30 seconds
      });

      // Map the response to AnalyticsData type
      const d = response.data;
      return {
        dimensionHeaders: (d.dimensionHeaders ?? []).map((h: any) => ({ name: h.name ?? "" })),
        metricHeaders: (d.metricHeaders ?? []).map((h: any) => ({ name: h.name ?? "", type: h.type ?? "" })),
        rows: (d.rows ?? []).map((row: any) => ({
          dimensionValues: (row.dimensionValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
          metricValues: (row.metricValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
        })),
        totals: (d.totals ?? []).map((row: any) => ({
          dimensionValues: (row.dimensionValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
          metricValues: (row.metricValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
        })),
        maximums: (d.maximums ?? []).map((row: any) => ({
          dimensionValues: (row.dimensionValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
          metricValues: (row.metricValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
        })),
        minimums: (d.minimums ?? []).map((row: any) => ({
          dimensionValues: (row.dimensionValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
          metricValues: (row.metricValues ?? []).map((v: any) => ({ value: v.value ?? "" })),
        })),
        rowCount: d.rowCount ?? 0,
      };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timed out for property ${propertyId}.`);
      }
      // Avoid logging sensitive data
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data = (error?.response?.data) as any;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.error('[GA4 getAnalyticsData] Failed:', {
          propertyId,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          errorMessage: error?.message,
          apiError: data?.error || data,
        });
      } catch {}
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch analytics data for property ${propertyId}: ${errorMessage}`);
    }
  }
}

// Export singleton instance
export const googleAnalyticsService = new GoogleAnalyticsServiceImpl();