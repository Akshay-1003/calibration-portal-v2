/**
 * Debug utility for refresh token issues
 * Helps diagnose why refresh token works locally but not in upper environments
 */

export const debugRefreshToken = {
  /**
   * Log detailed information about the refresh token request
   */
  logRefreshAttempt: (environment: string) => {
    console.group(`🔄 [Refresh Token Debug] Environment: ${environment}`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Current URL:', window.location.href);
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
    console.log('Cookies available:', document.cookie ? 'Yes (but HttpOnly not visible)' : 'No visible cookies');
    console.log('withCredentials:', 'true (enabled)');
    console.groupEnd();
  },

  /**
   * Log refresh token response
   */
  logRefreshResponse: (success: boolean, error?: any) => {
    console.group(`🔄 [Refresh Token Response]`);
    console.log('Success:', success);
    if (error) {
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
      
      // Check for common issues
      if (error.response?.status === 401) {
        console.warn('❌ 401 Unauthorized - Refresh token cookie missing or invalid');
      } else if (error.response?.status === 405) {
        console.warn('❌ 405 Method Not Allowed - Refresh endpoint does not exist');
      } else if (error.response?.status === 403) {
        console.warn('❌ 403 Forbidden - CORS or credentials issue');
      } else if (!error.response) {
        console.warn('❌ Network Error - Cannot reach backend');
      }
    }
    console.groupEnd();
  },

  /**
   * Check if cookies can be sent cross-origin
   */
  checkCookiePolicy: () => {
    console.group('🍪 [Cookie Policy Check]');
    console.log('Protocol:', window.location.protocol);
    console.log('Is HTTPS:', window.location.protocol === 'https:');
    console.log('Domain:', window.location.hostname);
    
    // Check if running in secure context
    const isSecureContext = window.isSecureContext;
    console.log('Secure Context:', isSecureContext);
    
    if (!isSecureContext && window.location.hostname !== 'localhost') {
      console.warn('⚠️ Not a secure context - HttpOnly cookies with Secure flag will be blocked');
    }
    
    console.groupEnd();
  },

  /**
   * Test if refresh endpoint is reachable
   */
  testRefreshEndpoint: async (baseUrl: string): Promise<boolean> => {
    console.group('🔍 [Refresh Endpoint Test]');
    const refreshUrl = `${baseUrl}/auth/refresh`;
    console.log('Testing URL:', refreshUrl);
    
    try {
      const response = await fetch(refreshUrl, {
        method: 'OPTIONS',
        credentials: 'include',
      });
      
      console.log('OPTIONS Response Status:', response.status);
      console.log('CORS Headers:', {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      });
      
      const allowsCredentials = response.headers.get('Access-Control-Allow-Credentials') === 'true';
      if (!allowsCredentials) {
        console.error('❌ Backend does not allow credentials - cookies will be blocked');
      }
      
      console.groupEnd();
      return response.ok;
    } catch (error) {
      console.error('❌ Endpoint test failed:', error);
      console.groupEnd();
      return false;
    }
  },
};
