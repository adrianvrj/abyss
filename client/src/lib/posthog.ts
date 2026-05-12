import posthog from "posthog-js";

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

export function isPosthogConfigured(): boolean {
  return Boolean(key && host);
}

export type AbyssAnalyticsProps = Record<string, unknown>;

export function abyssProps(extra: AbyssAnalyticsProps = {}): Record<string, unknown> {
  const merged: Record<string, unknown> = { app: "abyss-client", ...extra };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) continue;
    out[k] = typeof v === "bigint" ? v.toString() : v;
  }
  return out;
}

/** No-ops when PostHog env vars are missing. */
export function captureAbyss(event: string, props?: AbyssAnalyticsProps) {
  if (!isPosthogConfigured()) {
    return;
  }
  posthog.capture(event, abyssProps(props ?? {}));
}

export function captureSpaPageview() {
  if (!isPosthogConfigured() || typeof window === "undefined") {
    return;
  }
  posthog.capture("$pageview", {
    $current_url: window.location.href,
  });
}

export function initPostHog() {
  if (!key || !host) {
    return;
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    capture_exceptions: true,
  });
  posthog.register(abyssProps());
}

export { posthog };
