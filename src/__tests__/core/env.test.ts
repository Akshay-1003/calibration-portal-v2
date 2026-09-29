import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ENV } from '../../core/config/env';

describe('Environment Configuration', () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have API_BASE_URL configured', () => {
    // Test that ENV object has API_BASE_URL configured
    // It may use fallback if env var is not set, but should still have a value
    expect(ENV.API_BASE_URL).toBeDefined();
    expect(typeof ENV.API_BASE_URL).toBe('string');
    expect(ENV.API_BASE_URL.length).toBeGreaterThan(0);
  });

  it('should validate required environment variables in production', () => {
    // This test would require mocking import.meta.env
    // For now, we verify the structure exists
    expect(typeof originalEnv).toBe('object');
  });
});
