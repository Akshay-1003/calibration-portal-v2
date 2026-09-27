/**
 * Auth Token Accessor
 * Safe way to access auth token without circular imports
 */

let getAccessToken: (() => string | null) | null = null;

/**
 * Register the auth token getter function
 * This should be called by the auth store during initialization
 */
export const registerAccessTokenGetter = (getter: () => string | null) => {
  getAccessToken = getter;
};

/**
 * Get the current access token safely
 * Returns null if no getter is registered
 */
export const getCurrentAccessToken = (): string | null => {
  return getAccessToken ? getAccessToken() : null;
};
