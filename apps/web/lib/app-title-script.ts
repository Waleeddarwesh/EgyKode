/**
 * Trims the window title when running as an installed app.
 *
 * Edge composes a PWA's title bar as `manifest.name` + the document title. The
 * manifest name is "EgyKode — Learn Cloud & DevOps" and page titles are built
 * from the template `%s · EgyKode`, so a chapter came out as:
 *
 *   EgyKode — Learn Cloud & DevOps - Containerization (Docker) · EgyKode
 *
 * — the brand three times in one strip of chrome, and the part the reader cares
 * about buried in the middle of it.
 *
 * The suffix is not wrong; it is wrong *here*. In a browser tab, "· EgyKode"
 * is what tells someone which of forty tabs this is, and search results and
 * bookmarks want it too. In an installed window the app's name is already on
 * screen, so the same characters that help in a tab are noise. Hence the
 * display-mode guard rather than changing the template: the fix belongs to the
 * window, not to the document.
 *
 * Both edits are mechanical string surgery rather than a lookup table, so they
 * behave the same in Arabic as in English — nothing here invents a label in the
 * wrong language.
 *
 *   Containerization (Docker) · EgyKode                    → Containerization (Docker)
 *   EgyKode — Open-Source Cloud & DevOps Learning Platform → Open-Source Cloud & DevOps Learning Platform
 *
 * The observer watches `document.head` rather than the `<title>` element:
 * Next replaces that element on navigation, so an observer bound to the node
 * itself stops firing after the first client-side route change — the case that
 * matters most, since that is how the app is actually read.
 */
export const APP_TITLE_SCRIPT = `(function(){try{
var m=window.matchMedia;
if(!m)return;
var app=m('(display-mode: standalone)').matches||m('(display-mode: window-controls-overlay)').matches||m('(display-mode: minimal-ui)').matches;
if(!app)return;
var trim=function(){
var t=document.title;
if(!t)return;
var n=t.replace(/\\s*[·\\-—|]\\s*EgyKode\\s*$/,'').replace(/^\\s*EgyKode\\s*[·\\-—|]\\s*/,'');
if(n&&n!==t)document.title=n;
};
trim();
if(window.MutationObserver&&document.head){
new MutationObserver(trim).observe(document.head,{childList:true,subtree:true,characterData:true});
}
}catch(e){}})();`;
