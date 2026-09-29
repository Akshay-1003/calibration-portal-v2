import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../../utils/logger';

describe('Logger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('log', () => {
    it('should log in development', () => {
      import.meta.env.DEV = true;
      logger.log('Test message', { data: 'test' });
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should info log in development', () => {
      import.meta.env.DEV = true;
      logger.info('Info message');
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should warn log in development', () => {
      import.meta.env.DEV = true;
      logger.warn('Warning message');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should always log errors', () => {
      logger.error('Error message', new Error('test'));
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle Error instances', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] Error occurred',
        error
      );
    });

    it('should handle non-Error objects', () => {
      logger.error('Error occurred', { code: 500 });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should debug log in development', () => {
      import.meta.env.DEV = true;
      logger.debug('Debug message');
      expect(console.debug).toHaveBeenCalled();
    });

    it('should not debug log in production', () => {
      import.meta.env.DEV = false;
      import.meta.env.PROD = true;
      logger.debug('Debug message');
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('group', () => {
    it('should create console group in development', () => {
      import.meta.env.DEV = true;
      vi.spyOn(console, 'group').mockImplementation(() => {});
      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      logger.group('Test Group', () => {});

      expect(console.group).toHaveBeenCalledWith('Test Group');
      expect(console.groupEnd).toHaveBeenCalled();
    });
  });

  describe('table', () => {
    it('should log table in development', () => {
      import.meta.env.DEV = true;
      vi.spyOn(console, 'table').mockImplementation(() => {});

      logger.table([{ id: 1, name: 'Test' }]);

      expect(console.table).toHaveBeenCalled();
    });
  });
});

