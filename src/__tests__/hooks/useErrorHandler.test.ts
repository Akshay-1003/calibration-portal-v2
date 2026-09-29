import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ApiError } from '../../services/api-client';
import * as toast from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('handleError', () => {
    it('should handle ApiError instances', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new ApiError(404, 'Not found', 'NOT_FOUND', undefined, false);

      act(() => {
        result.current.handleError(error);
      });

      expect(toast.toast.error).toHaveBeenCalled();
    });

    it('should handle Error instances', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Generic error');

      act(() => {
        result.current.handleError(error);
      });

      expect(toast.toast.error).toHaveBeenCalled();
    });

    it('should handle string errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('String error');
      });

      expect(toast.toast.error).toHaveBeenCalled();
    });

    it('should not show toast when showToast is false', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Error');

      act(() => {
        result.current.handleError(error, { showToast: false });
      });

      expect(toast.toast.error).not.toHaveBeenCalled();
    });
  });

  describe('handleApiError', () => {
    it('should map status codes to safe messages', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new ApiError(401, 'Unauthorized');

      act(() => {
        result.current.handleApiError(error);
      });

      expect(toast.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Please log in')
      );
    });

    it('should show warning for 429 status', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new ApiError(429, 'Too many requests');

      act(() => {
        result.current.handleApiError(error);
      });

      expect(toast.toast.warning).toHaveBeenCalled();
    });
  });

  describe('handleNetworkError', () => {
    it('should handle network errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Failed to fetch');

      act(() => {
        result.current.handleNetworkError(error);
      });

      expect(toast.toast.error).toHaveBeenCalled();
      expect(result.current.handleNetworkError(error).retryable).toBe(true);
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const errors = {
        email: ['Invalid email format'],
        password: ['Password too short'],
      };

      act(() => {
        result.current.handleValidationError(errors);
      });

      expect(toast.toast.error).toHaveBeenCalled();
      expect(result.current.handleValidationError(errors).retryable).toBe(false);
    });
  });
});







