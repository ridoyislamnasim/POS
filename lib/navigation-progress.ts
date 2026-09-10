export type NavigationProgressState = {
  active: boolean;
  visible: boolean;
  value: number;
};

type Listener = (state: NavigationProgressState) => void;

const MIN_VISIBLE_MS = 280;
const HIDE_MS = 220;
const TRICKLE_MS = 320;
const SAFETY_MS = 10_000;

const listeners = new Set<Listener>();

let value = 0;
let active = false;
let visible = false;
let finishing = false;
let inflight = 0;
let generation = 0;
let startedAt = 0;
let locationKey = "";
let trickleTimer: ReturnType<typeof setInterval> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;
let fetchPatched = false;

function emit() {
  const snapshot: NavigationProgressState = { active, visible, value };
  listeners.forEach((fn) => fn(snapshot));
}

function stopTrickle() {
  if (trickleTimer) {
    clearInterval(trickleTimer);
    trickleTimer = null;
  }
}

function stopSafety() {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

function stopFinish() {
  if (finishTimer) {
    clearTimeout(finishTimer);
    finishTimer = null;
  }
}

function currentLocationKey() {
  return window.location.pathname + window.location.search;
}

function syncLocationKey() {
  if (typeof window !== "undefined") locationKey = currentLocationKey();
}

function trickle() {
  if (!active || finishing || value >= 88) return;
  const rest = 88 - value;
  value = Math.min(88, value + Math.max(0.6, rest * 0.07));
  emit();
}

export function getNavigationProgress(): NavigationProgressState {
  return { active, visible, value };
}

export function subscribeNavigationProgress(listener: Listener) {
  listeners.add(listener);
  listener(getNavigationProgress());
  return () => {
    listeners.delete(listener);
  };
}

export function startNavigationProgress() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  stopFinish();
  finishing = false;
  generation += 1;
  const gen = generation;

  if (!active) {
    active = true;
    visible = true;
    value = 12;
    startedAt = Date.now();
  } else if (value < 72) {
    value = Math.min(72, value + 6);
  }

  emit();
  stopTrickle();
  trickleTimer = setInterval(trickle, TRICKLE_MS);
  stopSafety();
  safetyTimer = setTimeout(() => {
    if (gen === generation) done();
  }, SAFETY_MS);
}

export function done() {
  if (!active && !visible) return;
  if (finishing) return;

  const gen = generation;
  inflight = 0;
  stopTrickle();
  stopSafety();
  finishing = true;
  active = false;
  syncLocationKey();

  const elapsed = Date.now() - startedAt;
  const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

  stopFinish();
  finishTimer = setTimeout(() => {
    if (gen !== generation) return;
    value = 100;
    visible = true;
    emit();
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (gen !== generation) return;
      visible = false;
      value = 0;
      finishing = false;
      emit();
      hideTimer = null;
    }, HIDE_MS);
  }, wait);
}

export function onRouteSettled() {
  syncLocationKey();
  if (inflight > 0) return;
  if (!active && !visible) return;
  done();
}

function beginRequest() {
  inflight += 1;
  startNavigationProgress();
}

function endRequest() {
  inflight = Math.max(0, inflight - 1);
  if (inflight === 0) done();
}

function headerValue(headers: Headers, name: string) {
  return headers.get(name) ?? headers.get(name.toLowerCase());
}

function readHeaders(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof Request !== "undefined" && input instanceof Request) {
    const headers = new Headers(input.headers);
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    return headers;
  }
  return new Headers(init?.headers);
}

function readUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return String(input);
}

function readMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function isPrefetch(headers: Headers) {
  const prefetch = headerValue(headers, "Next-Router-Prefetch");
  if (prefetch === "1" || prefetch === "true") return true;
  const purpose = headerValue(headers, "Purpose") ?? headerValue(headers, "Sec-Purpose");
  return purpose?.toLowerCase().includes("prefetch") ?? false;
}

function isTrackedNavigation(input: RequestInfo | URL, init?: RequestInit) {
  if (readMethod(input, init) !== "GET") return false;
  const headers = readHeaders(input, init);
  if (isPrefetch(headers)) return false;

  const rsc = headerValue(headers, "RSC") === "1" || headerValue(headers, "Next-Router-State-Tree") != null;
  let url: URL;
  try {
    url = new URL(readUrl(input), window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) return false;
  const flight = rsc || url.searchParams.has("_rsc");
  if (!flight) return false;
  return url.pathname !== window.location.pathname;
}

function patchFetch() {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const track = isTrackedNavigation(input, init);
    if (track) beginRequest();
    const request = original(input, init);
    if (!track) return request;
    const settle = () => endRequest();
    request.then(settle, settle);
    return request;
  }) as typeof fetch;
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldTrackAnchor(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || isModifiedClick(event)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  return url.pathname !== window.location.pathname;
}

export function attachNavigationProgress() {
  patchFetch();
  syncLocationKey();

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a");
    if (!anchor || !shouldTrackAnchor(anchor, event)) return;
    startNavigationProgress();
  };

  const onPopState = () => {
    const nextKey = currentLocationKey();
    if (nextKey === locationKey) return;
    locationKey = nextKey;
    startNavigationProgress();
  };

  document.addEventListener("click", onClick, true);
  window.addEventListener("popstate", onPopState);

  return () => {
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("popstate", onPopState);
  };
}
