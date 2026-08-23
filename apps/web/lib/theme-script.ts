/**
 * The inline script that sets the theme before first paint.
 *
 * Extracted so the locale layout and the standalone layout share one
 * definition. Two copies would drift the first time theme handling changed, and
 * the symptom would be a flash of the wrong theme on exactly the pages nobody
 * looks at twice.
 *
 * It must stay inline and synchronous: anything deferred runs after the first
 * frame has painted in the wrong theme, which is the flash that makes a site
 * feel unfinished.
 */
export const THEME_SCRIPT = `(function(){try{
var p=localStorage.getItem('egykode_theme');
var t=p||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
var d=document.documentElement;
d.setAttribute('data-theme',t);
d.setAttribute('data-theme-pref',p||'system');
d.style.colorScheme=t;
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
