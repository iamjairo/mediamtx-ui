import { getMockResponse, isMockFallbackEnabled } from './mockData.js';

// Single shared FetchManager instance for the whole app. Mirrors the vanilla
// fetch_manager.js semantics: abort control, 401 redirect, mock fallback on failure.
class FetchManager {
  constructor({ onUnauthorized = null } = {}) {
    this.onUnauthorized = onUnauthorized;
    this._unauthorizedFired = false;
    this.requests = new Set();
  }

  async fetch(url, options = {}) {
    const controller = new AbortController();
    const entry = { controller };
    this.requests.add(entry);

    let response;
    try {
      response = await fetch(url, { ...options, credentials: 'include', signal: controller.signal });
    } catch (err) {
      this.requests.delete(entry);
      if (isMockFallbackEnabled() && !controller.signal.aborted) {
        const mock = getMockResponse(url);
        if (mock) return mock;
      }
      throw err;
    }

    if (response.status === 401) {
      this.requests.delete(entry);
      // If mock fallback is on AND we have a mock for this URL, prefer mock over
      // bouncing the user to login. Useful during development / demos when there
      // is no Express session established yet (e.g. running Vite directly).
      if (isMockFallbackEnabled()) {
        const mock = getMockResponse(url);
        if (mock) return mock;
      }
      if (!this._unauthorizedFired) {
        this._unauthorizedFired = true;
        this.abortAll('unauthorized');
        this.onUnauthorized?.(response);
      }
      throw new Error('Unauthorized (401)');
    }

    if (response.status >= 500 && isMockFallbackEnabled()) {
      const mock = getMockResponse(url);
      if (mock) {
        this.requests.delete(entry);
        return mock;
      }
    }

    this.requests.delete(entry);
    return response;
  }

  abortAll(reason = 'aborted') {
    for (const entry of this.requests) {
      try { entry.controller.abort(reason); } catch {}
    }
    this.requests.clear();
  }
}

export const fm = new FetchManager({
  onUnauthorized: () => {
    // Send the user to the login page; preserves the vanilla behavior.
    window.location.href = '/';
  },
});
