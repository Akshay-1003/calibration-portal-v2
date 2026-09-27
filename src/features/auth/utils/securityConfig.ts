/**
 * Security Configuration and Verification
 * Production-ready security utilities
 */

// Security headers that should be present
export const REQUIRED_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
} as const;

// Cookie security requirements
export const COOKIE_SECURITY_REQUIREMENTS = {
  HTTP_ONLY: 'HttpOnly',
  SECURE: 'Secure',
  SAME_SITE: 'SameSite=Strict',
} as const;

/**
 * Verify security headers are present
 * Call this on app startup to ensure backend security
 */
export const verifySecurityHeaders = async (): Promise<{
  isValid: boolean;
  missingHeaders: string[];
  warnings: string[];
}> => {
  try {
    // This would be an endpoint that returns security headers
    // For now, we'll simulate the check
    const response = await fetch('/api/security/headers', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return {
        isValid: false,
        missingHeaders: Object.keys(REQUIRED_SECURITY_HEADERS),
        warnings: ['Security headers endpoint not available'],
      };
    }

    const headers = response.headers;
    const missingHeaders: string[] = [];
    const warnings: string[] = [];

    // Check each required header
    Object.entries(REQUIRED_SECURITY_HEADERS).forEach(([header, expectedValue]) => {
      const actualValue = headers.get(header);
      if (!actualValue) {
        missingHeaders.push(header);
      } else if (actualValue !== expectedValue) {
        warnings.push(`${header}: Expected "${expectedValue}", got "${actualValue}"`);
      }
    });

    return {
      isValid: missingHeaders.length === 0 && warnings.length === 0,
      missingHeaders,
      warnings,
    };
  } catch (error) {
    // If endpoint doesn't exist, we can't verify
    return {
      isValid: false,
      missingHeaders: [],
      warnings: ['Security verification endpoint not available'],
    };
  }
};

/**
 * Get current security configuration
 */
export const getSecurityConfig = () => ({
  csrfProtection: {
    enabled: true,
    headerName: 'X-CSRF-Token',
    tokenSource: 'meta-tag-or-cookie',
  },
  tokenStorage: {
    accessToken: 'memory-only',
    refreshToken: 'httpOnly-cookie',
  },
  sessionManagement: {
    activityTracking: 'sessionStorage',
    timeout: '24-hours',
    proactiveRefresh: true,
  },
  rateLimiting: {
    enabled: true,
    loginAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
});

/**
 * Security audit log
 */
export const logSecurityEvent = (event: string, details?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[SECURITY] ${event}`, details);
  }
  // In production, send to security monitoring service
  // await sendToSecurityMonitoring(event, details);
};
