/* Day or night, decided before the first paint.

   This file exists for one reason: a reader who has CHOSEN a theme that
   differs from their device's. `prefers-color-scheme` already serves
   everybody else with no JavaScript at all, which is why the stylesheet
   does the work and this only ever writes an override.

   It has to run in <head>, blocking, because applying the class from
   common.js — which is one parser-blocking script at the END of <body> —
   would paint the wrong theme first and then correct it. A reader who
   asked for night and gets a flash of cream has been given exactly the
   thing they asked not to have.

   It is a FILE rather than two inline lines because the pages carry
   `script-src 'self'` with no 'unsafe-inline'. That is the policy doing
   its job, and the cost is one small same-origin request that caches.

   Nothing here waits on anything, reads the network, or touches the DOM
   beyond one attribute. If storage is unreadable — private mode, a
   refused origin — the reader simply follows their device, which is the
   correct answer rather than a failure. */
(function () {
  try {
    var chosen = localStorage.getItem('site-theme');
    /* Only 'light' and 'dark' are written as an override. Anything else,
       including the absence of a key, means follow the device — and that
       must leave the attribute OFF, because `:root[data-theme]` is what
       the stylesheet keys the override on. */
    if (chosen === 'light' || chosen === 'dark') {
      document.documentElement.setAttribute('data-theme', chosen);
    }
  } catch (error) { /* storage refused: the device decides, which is fine */ }
})();
