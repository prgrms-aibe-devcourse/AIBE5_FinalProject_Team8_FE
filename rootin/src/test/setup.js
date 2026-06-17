import '@testing-library/jest-dom';
import { vi } from 'vitest';

function createMemoryStorage() {
  let store = {};

  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn(key => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn(index => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
}

if (typeof window.localStorage?.clear !== 'function') {
  const storage = createMemoryStorage();

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
  });

  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
}

// framer-motion의 viewport 기능(useInView/whileInView)이 사용 — jsdom 미구현 폴리필
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver = IntersectionObserver;
  window.IntersectionObserver = IntersectionObserver;
}

// ResizeObserver — 랜딩 모니터가 내부 높이 측정에 사용 (jsdom 미구현)
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserver;
  window.ResizeObserver = ResizeObserver;
}

window.alert = vi.fn();
