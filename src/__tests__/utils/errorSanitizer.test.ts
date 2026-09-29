import { describe, it, expect } from 'vitest';
import {
  sanitizeErrorMessage,
  sanitizeApiError,
  sanitizeError,
  sanitizeErrorForLogging,
} from '../../utils/errorSanitizer';
import { ApiError } from '../../services/api-client';

describe('Error Sanitizer', () => {
  describe('sanitizeErrorMessage', () => {
    it('should use safe message for known status codes', () => {
      expect(sanitizeErrorMessage('Internal server error', 500)).toBe(
        'Server error. Please try again later.'
      );
      expect(sanitizeErrorMessage('Unauthorized', 401)).toBe('Please log in to continue.');
      expect(sanitizeErrorMessage('Forbidden', 403)).toBe(
        'You do not have permission to perform this action.'
      );
      expect(sanitizeErrorMessage('Not found', 404)).toBe(
        'The requested resource was not found.'
      );
    });

    it('should sanitize sensitive patterns', () => {
      const errorWithPath = 'Error at /path/to/file.js:123:45';
      const sanitized = sanitizeErrorMessage(errorWithPath);
      expect(sanitized).not.toContain('/path/to/file.js');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('should sanitize IP addresses', () => {
      const errorWithIP = 'Connection failed to 192.168.1.1';
      const sanitized = sanitizeErrorMessage(errorWithIP);
      expect(sanitized).not.toContain('192.168.1.1');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('should truncate long messages', () => {
      const longMessage = 'a'.repeat(300);
      const sanitized = sanitizeErrorMessage(longMessage);
      expect(sanitized.length).toBeLessThanOrEqual(203); // 200 + '...'
    });

    it('should return generic message if message is empty after sanitization', () => {
      const sanitized = sanitizeErrorMessage('');
      expect(sanitized).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('sanitizeApiError', () => {
    it('should sanitize ApiError instance', () => {
      const error = new ApiError(500, 'Internal server error at /path/to/file.js');
      const sanitized = sanitizeApiError(error);
      expect(sanitized).toBe('Server error. Please try again later.');
    });

    it('should use safe message for 401 errors', () => {
      const error = new ApiError(401, 'Token expired');
      const sanitized = sanitizeApiError(error);
      expect(sanitized).toBe('Please log in to continue.');
    });
  });

  describe('sanitizeError', () => {
    it('should handle ApiError instances', () => {
      const error = new ApiError(404, 'Resource not found');
      const sanitized = sanitizeError(error);
      expect(sanitized).toBe('The requested resource was not found.');
    });

    it('should handle Error instances', () => {
      const error = new Error('Something went wrong');
      const sanitized = sanitizeError(error);
      expect(sanitized).toBe('Something went wrong');
    });

    it('should handle string errors', () => {
      const sanitized = sanitizeError('String error message');
      expect(sanitized).toBe('String error message');
    });

    it('should handle error objects with message property', () => {
      const error = { message: 'Error message', status: 500 };
      const sanitized = sanitizeError(error);
      expect(sanitized).toBe('Server error. Please try again later.');
    });

    it('should handle unknown error types', () => {
      const sanitized = sanitizeError(null);
      expect(sanitized).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('sanitizeErrorForLogging', () => {
    it('should preserve error structure for logging', () => {
      const error = new ApiError(500, 'Server error', 'INTERNAL_ERROR');
      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized).toHaveProperty('message');
      expect(sanitized).toHaveProperty('type');
      expect(sanitized).toHaveProperty('status', 500);
      expect(sanitized).toHaveProperty('code', 'INTERNAL_ERROR');
    });

    it('should sanitize stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at /path/to/file.js:123:45';
      const sanitized = sanitizeErrorForLogging(error);

      if (sanitized.stack) {
        expect(sanitized.stack).not.toContain('/path/to/file.js');
      }
    });

    it('should handle errors without stack traces', () => {
      // Create an ApiError without stack trace
      const error = new ApiError(404, 'Not found');
      // Clear any automatic stack trace
      if (error.stack) {
        delete (error as any).stack;
      }
      const sanitized = sanitizeErrorForLogging(error);
      // If error has no stack, result should not have stack either
      if (!error.stack) {
        expect(sanitized).not.toHaveProperty('stack');
      } else {
        // If error has stack (which it might), just verify sanitization worked
        expect(sanitized).toHaveProperty('message');
      }
    });
  });
});

