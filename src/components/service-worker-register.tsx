"use client";

import { useEffect } from "react";

// Registers the app-shell service worker (public/sw.js) so "Add to Home Screen" installs
// reliably on both platforms — Android's install prompt and Chrome's PWA criteria expect an
// active service worker, not just a manifest; iOS Safari doesn't require one to install but
// benefits from it for a faster, less blank-feeling relaunch. Deliberately does nothing beyond
// registration here — the worker itself decides caching strategy (public/sw.js).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app works fully without it, just without install/offline polish.
    });
  }, []);

  return null;
}
