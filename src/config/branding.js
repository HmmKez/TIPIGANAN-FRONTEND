// Every logo the app renders, defined once. These URLs used to be pasted
// literally into six different files (sidebar, landing, login, register, the
// PDF viewer toolbar, the watermark, plus index.html), all pointing at
// sis.materdeicollege.com — so swapping the logo meant hunting down every copy
// and the app broke if that host ever went away. Both files are now served from
// this app's own /public/images.

// The MDC Library System logo — used on every visible brand surface.
export const MDC_LOGO = '/images/mdc-library-system-logo.png'

// The original MDC seal, kept DELIBERATELY for the PDF viewer's watermark and
// nowhere else. The backend stamps the very same seal into the served PDF
// (WatermarkService → resources/images/mdc-logo.png); if this diverged, the
// on-screen overlay and the stamped page would show two different marks on the
// same document. Change these two together or not at all.
export const WATERMARK_LOGO = '/images/mdc-seal.png'
