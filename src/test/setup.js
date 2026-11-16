import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })) });
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();
