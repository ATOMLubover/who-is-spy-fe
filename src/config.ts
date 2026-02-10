// API Configuration
// Preferred: set `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` in your .env for overrides.
// Defaults:
// - Local development: http://127.0.0.1:8888/api/v1 and ws://127.0.0.1:8888/api/v1/ws
// - Production (same origin): /api/v1 and ws(s) using current origin

const envApi = import.meta.env.VITE_API_BASE_URL;
const envWs = import.meta.env.VITE_WS_BASE_URL;

function defaultApiBase() {
  // If running in production build without explicit env, assume same-origin proxy
  if (import.meta.env.MODE === "production") {
    return "/api/v1";
  }
  // Local dev default
  return "http://127.0.0.1:8888/api/v1";
}

export const API_BASE_URL = envApi || defaultApiBase();

function defaultWsBase() {
  if (envApi) {
    try {
      const u = new URL(envApi);
      const scheme = u.protocol === "https:" ? "wss:" : "ws:";
      return `${scheme}//${u.host}${u.pathname.replace(/\/+$/, "")}/ws`;
    } catch {
      // fallthrough
    }
  }

  if (import.meta.env.MODE === "production") {
    // same-origin websocket path
    const scheme = location.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${location.host}/api/v1/ws`;
  }

  return "ws://127.0.0.1:8888/api/v1/ws";
}

export const WS_BASE_URL = envWs || defaultWsBase();
