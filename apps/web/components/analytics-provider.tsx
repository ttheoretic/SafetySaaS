'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

/** Derive Sentry's Loader Script URL from a DSN (https://<key>@<host>/<id>). */
function sentryLoaderSrc(dsn: string): string | null {
  try {
    const u = new URL(dsn)
    return `https://js.sentry-cdn.com/${u.username}.min.js`
  } catch {
    return null
  }
}

const POSTHOG_SNIPPET = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);`

/**
 * Loads PostHog (product analytics + session recording) and Sentry (error
 * monitoring) when their keys are configured. Both are entirely optional: with
 * no env keys this is a no-op and the app is unaffected. Once configured, the
 * shared track() helper starts flowing to PostHog automatically.
 *
 * Scripts are injected directly into <head> (no next/script) so this stays
 * robust across Next/TS versions.
 */
export function AnalyticsProvider() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  // One-time loader injection (guarded against double-insert).
  useEffect(() => {
    if (POSTHOG_KEY && !document.getElementById('riscly-posthog')) {
      const s = document.createElement('script')
      s.id = 'riscly-posthog'
      s.text = `${POSTHOG_SNIPPET}posthog.init(${JSON.stringify(POSTHOG_KEY)},{api_host:${JSON.stringify(
        POSTHOG_HOST,
      )},person_profiles:'identified_only',capture_pageview:false});`
      document.head.appendChild(s)
    }
    const sentrySrc = SENTRY_DSN ? sentryLoaderSrc(SENTRY_DSN) : null
    if (sentrySrc && !document.getElementById('riscly-sentry')) {
      const s = document.createElement('script')
      s.id = 'riscly-sentry'
      s.src = sentrySrc
      s.async = true
      s.crossOrigin = 'anonymous'
      document.head.appendChild(s)
    }
  }, [])

  // Emit canonical page events + a PostHog pageview on navigation.
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    const ph = (window as unknown as { posthog?: { capture: (e: string) => void } }).posthog
    ph?.capture('$pageview')
    if (pathname === '/') track('landing_viewed')
    else if (pathname === '/pricing') track('pricing_viewed')
  }, [pathname])

  return null
}
