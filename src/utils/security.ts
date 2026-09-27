// Security utilities for input sanitization and validation

// XSS Prevention
export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

export const escapeHtml = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (s) => map[s]);
};

// SQL Injection Prevention (for client-side validation)
export const sanitizeSqlInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/['"]/g, '') // Remove quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/union/gi, '') // Remove UNION keyword
    .replace(/select/gi, '') // Remove SELECT keyword
    .replace(/insert/gi, '') // Remove INSERT keyword
    .replace(/update/gi, '') // Remove UPDATE keyword
    .replace(/delete/gi, '') // Remove DELETE keyword
    .replace(/drop/gi, '') // Remove DROP keyword
    .replace(/create/gi, '') // Remove CREATE keyword
    .replace(/alter/gi, '') // Remove ALTER keyword
    .replace(/exec/gi, '') // Remove EXEC keyword
    .replace(/execute/gi, '') // Remove EXECUTE keyword
    .trim();
};

// CSRF Token Management (HTTP Only Cookie Architecture)
// CSRF tokens should be handled by backend via HttpOnly cookies or meta tags

export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const getCSRFToken = (): string | null => {
  // Try meta tag first (recommended approach)
  const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
  if (metaTag?.content) {
    return metaTag.content;
  }

  // Fallback to cookie (backend should set HttpOnly CSRF cookie)
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith('csrf-token=')
  );
  return csrfCookie ? csrfCookie.split('=')[1] : null;
};

export const setCSRFToken = (_token: string): void => {
  // CSRF tokens should be set by backend via HttpOnly cookies
  // This method is deprecated in HTTP Only Cookie architecture
  console.warn('setCSRFToken is deprecated - use HttpOnly cookies from backend');
};

export const validateCSRFToken = (token: string): boolean => {
  const storedToken = getCSRFToken();
  return storedToken === token;
};

// Rate Limiting (Client-side)
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  getResetTime(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...validRequests);
    return oldestRequest + this.windowMs;
  }
}

// Content Security Policy helpers
export const createCSPNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

// Input validation for security
export const validateInput = (input: any, type: 'string' | 'number' | 'email' | 'url'): boolean => {
  if (input === null || input === undefined) return false;
  
  switch (type) {
    case 'string':
      return typeof input === 'string' && input.length > 0;
    case 'number':
      return typeof input === 'number' && !isNaN(input);
    case 'email':
      return typeof input === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    case 'url':
      try {
        new URL(input);
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
};

// File upload security
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase();
};

// Password strength validation
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    feedback.push('Password must contain at least one special character (@$!%*?&)');
  } else {
    score += 1;
  }
  
  if (password.length >= 12) {
    score += 1;
  }
  
  return {
    isValid: score >= 4,
    score,
    feedback,
  };
};

// Session security
export const generateSessionId = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const isSessionValid = (sessionId: string): boolean => {
  try {
    const storedSessionId = localStorage.getItem('sessionId');
    return storedSessionId === sessionId;
  } catch {
    return false;
  }
};

// Data encryption (client-side, for sensitive data)
export const encryptData = async (data: string, key: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const keyBuffer = encoder.encode(key);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBuffer
    );
    
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

export const decryptData = async (encryptedData: string, key: string): Promise<string> => {
  try {
    const decoder = new TextDecoder();
    const keyBuffer = new TextEncoder().encode(key);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Export all security utilities
export const SecurityUtils = {
  sanitizeHtml,
  escapeHtml,
  sanitizeSqlInput,
  generateCSRFToken,
  getCSRFToken,
  setCSRFToken,
  validateCSRFToken,
  validateInput,
  validateFileType,
  validateFileSize,
  sanitizeFileName,
  validatePasswordStrength,
  generateSessionId,
  isSessionValid,
  encryptData,
  decryptData,
};
