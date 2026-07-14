// Every logo the app renders, defined once. These URLs used to be pasted
// literally into six different files (sidebar, landing, login, register, the
// PDF viewer toolbar, the watermark, plus index.html), all pointing at
// sis.materdeicollege.com — so swapping the logo meant hunting down every copy
// and the app broke if that host ever went away. Both files are now served from
// this app's own /public/images.

// The MDC Library System logo — used on every visible brand surface.
export const MDC_LOGO = '/images/mdc-library-system-logo.png'

// WATERMARK_LOGO ('/images/mdc-seal.png') used to live here for the viewer's
// overlay, which repeated the seal in each of its six cells. The overlay no
// longer draws a logo at all — the seal is stamped into the PDF itself, once,
// by the backend (WatermarkService → resources/images/mdc-logo.png), which is
// the copy that actually survives a screenshot. Nothing on the frontend needs
// the seal any more, so the export is gone rather than left dangling.
//
// public/images/mdc-seal.png is kept on disk: it is the original MDC seal and
// the backend's stamp must keep matching it.
