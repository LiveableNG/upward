Act as a Senior Frontend Performance Engineer specializing in Chrome DevTools, networking, React/Next.js applications, and modern web performance.

Your task is to perform a complete performance and networking audit of this application using all available DevTools information.

Do NOT stop after identifying one issue. Continue investigating until every potential bottleneck has been examined.

Audit the following areas:

## 1. Network Requests
- Slow requests
- Duplicate requests
- Unnecessary API calls
- Waterfall dependencies
- Sequential requests that could be parallelized
- Large payloads
- Large response headers
- Excessive redirects
- High TTFB
- Slow download times
- Slow DNS lookup
- Slow SSL negotiation
- Slow connection setup
- HTTP/1 vs HTTP/2/HTTP/3 usage
- Compression (gzip/brotli)
- Missing keep-alive
- Missing CDN usage
- Cache-control headers
- ETag usage
- Last-Modified headers
- Cache misses
- Uncached static assets

## 2. Data Fetching
Inspect whether the application:
- Refetches unnecessarily
- Makes duplicate API calls
- Refetches on every render
- Has race conditions
- Performs unnecessary polling
- Fetches data that is never used
- Overfetches data
- Underfetches causing waterfalls
- Uses N+1 request patterns
- Loads resources that could be prefetched
- Misses opportunities for request batching

If React Query, SWR, Apollo, RTK Query or similar is detected:
- Evaluate staleTime
- cacheTime
- deduplication
- invalidation
- background refetches
- optimistic updates
- cache hit ratio

## 3. Caching
Identify:
- Browser cache issues
- Memory cache usage
- Disk cache usage
- Service Worker caching
- CDN caching
- API response caching
- Missing immutable assets
- Assets changing hashes unnecessarily
- Cache busting problems

## 4. Images
Inspect:
- Oversized images
- Missing lazy loading
- Missing responsive images
- Missing WebP/AVIF
- Images downloaded but not visible
- Duplicate downloads
- Incorrect cache headers

## 5. JavaScript
Identify:
- Large bundles
- Unused JavaScript
- Long parse times
- Long execution times
- Blocking scripts
- Third-party scripts slowing startup
- Code splitting opportunities
- Dynamic import opportunities

## 6. CSS
Check for:
- Unused CSS
- Render blocking CSS
- Excessive CSS size
- Layout shifts caused by CSS

## 7. Rendering
Inspect:
- Long Tasks
- Main thread blocking
- Layout thrashing
- Forced synchronous layouts
- Excessive reflows
- Excessive paints
- Large DOM
- Hydration issues
- React unnecessary renders

## 8. Core Web Vitals
Evaluate:
- LCP
- CLS
- INP
- FCP
- TTFB

Identify exactly what contributes to each metric.

## 9. Resource Loading
Check:
- preload usage
- prefetch usage
- preconnect
- dns-prefetch
- priority hints
- blocking fonts
- blocking CSS
- blocking JS

## 10. API Design
Look for:
- Endpoints returning excessive data
- Missing pagination
- Missing compression
- Slow endpoints
- Missing indexing hints inferred from response times
- Opportunities for batching

## 11. React
If this is React or Next.js:
- unnecessary rerenders
- unstable dependencies
- useEffect loops
- unnecessary state updates
- prop drilling causing rerenders
- expensive components
- memoization opportunities
- Suspense opportunities
- Server Components opportunities (Next.js)

## 12. Security Headers Affecting Performance
Inspect:
- CORS preflight frequency
- unnecessary OPTIONS requests
- cookie size
- authentication headers
- repeated token refreshes

## 13. Third-party Resources
Evaluate:
- analytics
- fonts
- tracking scripts
- chat widgets
- external SDKs
- embedded iframes

Determine whether any are blocking rendering or network performance.

## 14. DevTools Performance Timeline
Inspect:
- CPU bottlenecks
- idle time
- scripting time
- rendering time
- painting time
- garbage collection spikes
- memory growth

## 15. Technical Debt
Identify architectural issues that may not be immediate bugs but could affect scalability, including:
- duplicate fetch logic
- inconsistent caching
- repeated serializers
- excessive client-side work
- poor loading strategies
- lack of request deduplication
- missing error handling
- retry storms
- network chatter

For every issue found provide:

Severity:
- Critical
- High
- Medium
- Low

Evidence:
- The exact request, asset, component or operation responsible.

Root Cause:
- Explain why it happens.

Impact:
- Estimate the user impact.

Recommendation:
- Give a concrete implementation-level fix.

Expected Improvement:
- Estimate the likely improvement in latency, bandwidth, CPU usage or Core Web Vitals.

Finally produce:

1. Executive Summary
2. Top 10 highest-impact optimizations
3. Quick Wins (<30 minutes)
4. Medium Effort Improvements
5. Long-term Architectural Improvements
6. Estimated overall performance gain if all recommendations are implemented.