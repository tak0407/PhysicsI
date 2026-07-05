const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()

type GtagArguments = [command: string, ...args: unknown[]]

declare global {
  interface Window {
    dataLayer?: GtagArguments[]
    gtag?: (...args: GtagArguments) => void
  }
}

let isGoogleAnalyticsReady = false
let lastTrackedPath = ''

function ensureGoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return false
  if (isGoogleAnalyticsReady) return true

  window.dataLayer = window.dataLayer ?? []
  window.gtag =
    window.gtag ??
    ((...args: GtagArguments) => {
      window.dataLayer?.push(args)
    })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    GA_MEASUREMENT_ID,
  )}`
  document.head.append(script)

  window.gtag('js', new Date())
  isGoogleAnalyticsReady = true
  return true
}

function getCurrentPagePath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function trackPageView(title: string) {
  if (!ensureGoogleAnalytics() || !GA_MEASUREMENT_ID) return

  const pagePath = getCurrentPagePath()
  if (pagePath === lastTrackedPath) return

  lastTrackedPath = pagePath
  window.gtag?.('config', GA_MEASUREMENT_ID, {
    page_location: window.location.href,
    page_path: pagePath,
    page_title: title,
  })
}
