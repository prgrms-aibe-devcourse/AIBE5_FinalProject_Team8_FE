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

window.alert = vi.fn();
