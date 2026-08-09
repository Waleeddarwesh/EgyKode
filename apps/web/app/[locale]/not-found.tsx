import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-content flex-col items-start px-4 py-24 sm:px-6 lg:px-8">
      <p className="font-mono text-sm text-content-muted">404</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-content">Page not found</h1>
      <p className="mt-3 max-w-md text-content-secondary">
        That page does not exist, or it has moved.
      </p>
      <Link href="/" className="btn btn-primary mt-8 h-11 px-5">
        Go home
      </Link>
    </div>
  );
}
