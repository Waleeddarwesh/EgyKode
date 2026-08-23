/**
 * Registers the service worker from an inline script in `<head>`.
 *
 * It was a React effect in a client component, which worked — the registration
 * shipped and ran — but had two faults worth fixing.
 *
 * It only ran under the locale layout, so `/privacy/` and `/offline/` never
 * registered anything. And it waited for hydration *and* the `load` event, so
 * anything analysing the page without executing a full React render concluded
 * the site had no service worker at all. PWABuilder reported exactly that while
 * the registration was demonstrably live in the deployed chunk.
 *
 * Inline and framework-free, it is in the HTML source, runs on every page, and
 * registers a fraction of a second sooner — which means the first navigation
 * after install is already being cached.
 *
 * Still deferred to `load`: registration competes for bandwidth with the
 * page's own assets, and the point of the cache is the *next* visit.
 *
 * Guarded so a browser without service workers, or a page opened from
 * `file://`, fails silently rather than throwing into the console.
 */
export const SW_REGISTER_SCRIPT = `(function(){try{
if(!('serviceWorker' in navigator))return;
addEventListener('load',function(){
navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){});
});
}catch(e){}})();`;
