import { Injectable, Logger } from '@nestjs/common'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

@Injectable()
export class GoogleAnalyticsService {
  private readonly logger = new Logger(GoogleAnalyticsService.name)
  private client: BetaAnalyticsDataClient | null = null
  private propertyId: string | null = null

  constructor() {
    this.propertyId = process.env.GA_PROPERTY_ID || null
    const credentialsEnv = process.env.GA_CREDENTIALS_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS

    if (this.propertyId) {
      try {
        if (credentialsEnv && credentialsEnv.trim().startsWith('{')) {
          const credentials = JSON.parse(credentialsEnv)
          this.client = new BetaAnalyticsDataClient({ credentials })
          this.logger.log('Google Analytics 4 Data Client initialized via inline credentials JSON string.')
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          this.client = new BetaAnalyticsDataClient()
          this.logger.log('Google Analytics 4 Data Client initialized via credentials file path.')
        }
      } catch (err) {
        this.logger.error('Failed to initialize GA4 Client', err)
      }
    }

    if (!this.client) {
      this.logger.warn(
        'Google Analytics configuration is missing or invalid. Dashboard traffic section will show as unavailable.',
      )
    }
  }

  async getDashboardStats() {
    if (!this.client || !this.propertyId) {
      this.logger.debug('Google Analytics is not configured.')
      return {
        status: 'unavailable',
        reason: 'Google Analytics is not configured. Please set GA_PROPERTY_ID and GOOGLE_APPLICATION_CREDENTIALS in your environment.',
      }
    }

    try {
      // 1. Overall Metrics: Active Users, Sessions, Page Views, Bounce Rate, Average Session Duration
      const [overviewReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' }
        ]
      })

      // 2. Device Breakdown
      const [deviceReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }]
      })

      // 3. Top Pages
      const [pagesReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 50
      })

      // 4. Traffic Sources Breakdown
      const [sourcesReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'activeUsers' }]
      })

      // 5. Referring Websites (Referrals only)
      const [referralsReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'activeUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionMedium',
            stringFilter: {
              matchType: 'EXACT',
              value: 'referral'
            }
          }
        },
        limit: 10
      })

      // 6. Chronological 30-Day Trend
      const [trendReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ]
      })

      // 7. Geographic Cities Breakdown
      const [geoReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 10
      })

      // 8. Granular Source / Medium Breakdown
      const [granularSourcesReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSourceMedium' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 10
      })

      // 9. Custom Funnel Events Count
      const [eventsReport] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['signup_started', 'signup_completed', 'payment_initiated', 'payment_success']
            }
          }
        }
      })

      // 10. Real-time Active Users (last 30 mins)
      let realtimeActiveUsers = 0
      try {
        const [realtimeResponse] = await this.client.runRealtimeReport({
          property: `properties/${this.propertyId}`,
          metrics: [{ name: 'activeUsers' }]
        })
        realtimeActiveUsers = parseInt(realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10)
      } catch (realtimeErr) {
        this.logger.warn('Failed to fetch real-time report, defaulting to 0', realtimeErr)
      }

      let activeUsers = 0
      let sessions = 0
      let pageViews = 0
      let bounceRate = 0
      let averageSessionDuration = 0

      if (overviewReport.rows?.[0]) {
        activeUsers = parseInt(overviewReport.rows[0].metricValues?.[0]?.value || '0', 10)
        sessions = parseInt(overviewReport.rows[0].metricValues?.[1]?.value || '0', 10)
        pageViews = parseInt(overviewReport.rows[0].metricValues?.[2]?.value || '0', 10)
        bounceRate = parseFloat(overviewReport.rows[0].metricValues?.[3]?.value || '0')
        averageSessionDuration = parseFloat(overviewReport.rows[0].metricValues?.[4]?.value || '0')
      }

      const devices = { mobile: 0, desktop: 0, tablet: 0 }
      if (deviceReport.rows) {
        for (const row of deviceReport.rows) {
          const dev = row.dimensionValues?.[0]?.value?.toLowerCase() || ''
          const count = parseInt(row.metricValues?.[0]?.value || '0', 10)
          if (dev.includes('mobile')) devices.mobile += count
          else if (dev.includes('desktop')) devices.desktop += count
          else if (dev.includes('tablet')) devices.tablet += count
        }
      }

      const trafficSources: Record<string, number> = {}
      if (sourcesReport.rows) {
        for (const row of sourcesReport.rows) {
          const source = row.dimensionValues?.[0]?.value || 'Direct'
          const count = parseInt(row.metricValues?.[0]?.value || '0', 10)
          trafficSources[source] = count
        }
      }

      const topReferrals: Array<{ source: string; count: number }> = []
      if (referralsReport.rows) {
        for (const row of referralsReport.rows) {
          const src = row.dimensionValues?.[0]?.value || 'Unknown'
          const count = parseInt(row.metricValues?.[0]?.value || '0', 10)
          topReferrals.push({ source: src, count })
        }
      }

      const dailyTrend: Array<{ date: string; activeUsers: number; sessions: number; pageViews: number }> = []
      if (trendReport.rows) {
        for (const row of trendReport.rows) {
          const dateVal = row.dimensionValues?.[0]?.value || ''
          const activeUsersCount = parseInt(row.metricValues?.[0]?.value || '0', 10)
          const sessionsCount = parseInt(row.metricValues?.[1]?.value || '0', 10)
          const pageViewsCount = parseInt(row.metricValues?.[2]?.value || '0', 10)
          dailyTrend.push({
            date: dateVal,
            activeUsers: activeUsersCount,
            sessions: sessionsCount,
            pageViews: pageViewsCount
          })
        }
        dailyTrend.sort((a, b) => a.date.localeCompare(b.date))
      }

      const topCities: Array<{ city: string; count: number }> = []
      if (geoReport.rows) {
        for (const row of geoReport.rows) {
          const city = row.dimensionValues?.[0]?.value || 'Unknown'
          if (city !== '(not set)') {
            const count = parseInt(row.metricValues?.[0]?.value || '0', 10)
            topCities.push({ city, count })
          }
        }
      }

      const granularSources: Array<{ sourceMedium: string; count: number }> = []
      if (granularSourcesReport.rows) {
        for (const row of granularSourcesReport.rows) {
          const sourceMedium = row.dimensionValues?.[0]?.value || 'Unknown'
          const count = parseInt(row.metricValues?.[0]?.value || '0', 10)
          granularSources.push({ sourceMedium, count })
        }
      }

      const funnelEvents: Record<string, number> = {
        signup_started: 0,
        signup_completed: 0,
        payment_initiated: 0,
        payment_success: 0
      }
      if (eventsReport.rows) {
        for (const row of eventsReport.rows) {
          const eventName = row.dimensionValues?.[0]?.value || ''
          const count = parseInt(row.metricValues?.[0]?.value || '0', 10)
          if (eventName in funnelEvents) {
            funnelEvents[eventName] = count
          }
        }
      }

      const topPages: Array<{ path: string; views: number }> = []
      if (pagesReport.rows) {
        for (const row of pagesReport.rows) {
          topPages.push({
            path: row.dimensionValues?.[0]?.value || '/',
            views: parseInt(row.metricValues?.[0]?.value || '0', 10)
          })
        }
      }

      // If active users are 0 (e.g. brand new property ID)
      if (activeUsers === 0 && pageViews === 0) {
        return {
          status: 'unavailable',
          reason: 'No active traffic data has been recorded for this Google Analytics property ID yet.',
        }
      }

      return {
        status: 'success',
        activeUsers,
        sessions,
        pageViews,
        bounceRate,
        averageSessionDuration,
        devices,
        trafficSources,
        topPages,
        topReferrals,
        realtimeActiveUsers,
        dailyTrend,
        topCities,
        granularSources,
        funnelEvents
      }
    } catch (err) {
      this.logger.error('Failed to run GA4 report', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown network error'
      return {
        status: 'unavailable',
        reason: `Failed to connect to Google Analytics: ${errorMessage}.`,
      }
    }
  }
}
