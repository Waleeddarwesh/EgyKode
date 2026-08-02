"use client";

import { Check, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ApiError, auth, type Me } from "@/lib/auth";

/**
 * Profile editor: name, photo, and social accounts.
 *
 * GitHub and LinkedIn accept a full URL or a bare username — people paste URLs,
 * and rejecting them would be pedantry. The server stores the username and
 * derives the URL, so the display stays consistent either way.
 */
export interface ProfileLabels {
  name: string;
  nameAr: string;
  headline: string;
  location: string;
  bio: string;
  social: string;
  website: string;
  changePhoto: string;
  photoHint: string;
  save: string;
  saved: string;
  signedOut: string;
  networkError: string;
}

export function ProfileForm({ labels }: { labels: ProfileLabels }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    auth
      .me()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  // Object URLs leak if not revoked when the preview changes.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);

    const form = new FormData(event.currentTarget);
    // An empty file input would otherwise clear the existing avatar.
    const file = form.get("avatar");
    if (file instanceof File && file.size === 0) form.delete("avatar");

    try {
      setMe(await auth.updateProfile(form));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : labels.networkError);
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface-active" aria-busy />;
  }
  if (!me) {
    return <p className="text-content-secondary">{labels.signedOut}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ── Photo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5">
        <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface-active font-display text-xl font-semibold text-content-secondary">
          {preview || me.avatar ? (
            // A blob: preview of a just-picked file cannot go through next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview ?? me.avatar!} alt="" className="h-full w-full object-cover" />
          ) : (
            (me.name || me.handle).slice(0, 2).toUpperCase()
          )}
        </span>

        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn btn-outline h-9 px-3"
          >
            <Upload size={15} aria-hidden />
            {labels.changePhoto}
          </button>
          <p className="mt-1.5 text-xs text-content-muted">{labels.photoHint}</p>
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
        </div>
      </div>

      <Row name="name" label={labels.name} defaultValue={me.name} />
      <Row name="name_ar" label={labels.nameAr} defaultValue={me.name_ar} dir="rtl" />
      <Row name="headline" label={labels.headline} defaultValue={me.headline} />
      <Row name="location" label={labels.location} defaultValue={me.location} />

      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-content">
          {labels.bio}
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={600}
          defaultValue={me.bio}
          className="w-full rounded-md border bg-transparent px-3 py-2.5 text-sm text-content outline-none transition focus:border-primary"
        />
      </div>

      {/* ── Social accounts ───────────────────────────────────────────────── */}
      <fieldset className="space-y-4 border-t pt-6">
        <legend className="text-sm font-semibold text-content">{labels.social}</legend>
        <Row
          name="github"
          label="GitHub"
          defaultValue={me.github}
          placeholder="username"
          dir="ltr"
        />
        <Row
          name="linkedin"
          label="LinkedIn"
          defaultValue={me.linkedin}
          placeholder="your-name"
          dir="ltr"
        />
        <Row
          name="website"
          label={labels.website}
          defaultValue={me.website}
          type="url"
          placeholder="https://"
          dir="ltr"
        />
        <Row name="x_handle" label="X" defaultValue={me.x_handle} placeholder="handle" dir="ltr" />
      </fieldset>

      {error && (
        <p role="alert" className="text-sm" style={{ color: "var(--clr-danger)" }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary h-10 px-5">
          {pending && <Loader2 size={15} className="animate-spin" aria-hidden />}
          {labels.save}
        </button>
        {/* aria-live so the confirmation is announced, not just shown. */}
        <span aria-live="polite" className="text-sm text-primary">
          {saved && (
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} aria-hidden />
              {labels.saved}
            </span>
          )}
        </span>
      </div>
    </form>
  );
}

function Row({
  name,
  label,
  ...rest
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-content">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="w-full rounded-md border bg-transparent px-3 py-2.5 text-sm text-content outline-none transition focus:border-primary"
        {...rest}
      />
    </div>
  );
}
