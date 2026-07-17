/**
 * Google Analytics 4 loader.
 *
 * 1. Create a GA4 property + web data stream (see README, "Google Analytics").
 * 2. Paste your Measurement ID below (looks like "G-XXXXXXXXXX").
 *
 * Leave it empty and nothing loads — no tracking, no errors.
 * Kept in its own file so the Content-Security-Policy can stay strict
 * (no inline scripts anywhere on the site).
 */
const GA_MEASUREMENT_ID = 'G-53406JLEX4'; // e.g. 'G-XXXXXXXXXX'

if (GA_MEASUREMENT_ID) {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
}
