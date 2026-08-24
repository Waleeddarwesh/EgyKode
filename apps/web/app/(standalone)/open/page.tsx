import Link from "next/link";

export const metadata = {
  title: "Opening… — EgyKode",
  robots: { index: false, follow: false },
};

/**
 * Handles `web+egykode://` links.
 *
 * The manifest cannot send a protocol link straight to its destination, which
 * is easy to get wrong: `%s` in a `protocol_handlers` url is replaced with the
 * **entire escaped URL**, not the path. A template of `/%s` therefore resolves
 * `web+egykode://en/learn/docker/docker/` to
 * `/web%2Begykode%3A%2F%2Fen%2Flearn%2Fdocker%2Fdocker%2F` — a 404 on every
 * link, every time. That is exactly what the first Windows build did, and it
 * was only visible by launching the installed app through the protocol and
 * seeing the 404 page.
 *
 * So the manifest points here with `/open/?target=%s`, and this page unwraps
 * the URL and forwards to the real one.
 *
 * It matters more than an ordinary bug because `protocol_handlers` is one of
 * only two manifest members baked into the MSIX at package time. Getting it
 * wrong costs a Store resubmission rather than a deploy.
 *
 * Redirects from an inline script rather than a client component: this page is
 * a waypoint nobody should ever see, and waiting for React to hydrate before
 * forwarding puts a visible flash in the middle of what should feel like one
 * navigation. The markup below is the fallback for when the script cannot run
 * or the link is malformed.
 */
const FORWARD_SCRIPT = `(function(){try{
var raw=new URLSearchParams(location.search).get('target');
if(!raw)return;
var decoded=decodeURIComponent(raw);
var m=decoded.match(/^web\\+egykode:(?:\\/\\/)?(.*)$/i);
if(!m)return;
var path='/'+m[1].replace(/^\\/+/,'');
/* Only a same-origin path may be forwarded to. Leading slashes are stripped
   and exactly one re-added, so "//evil.com" becomes the path "/evil.com"
   rather than a protocol-relative jump to another host, and ':' is excluded
   so "javascript:" can never be reached. */
if(!/^\\/[A-Za-z0-9._~\\-\\/?#=&%]*$/.test(path))return;
location.replace(path);
}catch(e){}})();`;

export default function OpenProtocolLink() {
  return (
    <main className="mx-auto flex min-h-screen max-w-content flex-col items-start justify-center px-4 py-24 sm:px-6 lg:px-8">
      <script dangerouslySetInnerHTML={{ __html: FORWARD_SCRIPT }} />

      <p className="font-mono text-sm text-content-muted">Opening</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-content">Taking you there…</h1>
      <p className="mt-3 max-w-md text-content-secondary">
        If nothing happens, the link was not one EgyKode understands.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/en/" className="btn btn-primary h-11 px-5">
          Go home
        </Link>
        <Link href="/en/learn/" className="btn h-11 px-5">
          Browse chapters
        </Link>
      </div>
    </main>
  );
}
