import posthog from "posthog-js";

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

export function initPostHog() {
  if (!key || !host) {
    return;
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    enableExceptionAutocapture: true,
  });
}

export { posthog };
