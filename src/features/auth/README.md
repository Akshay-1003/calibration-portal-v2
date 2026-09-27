# Production-Grade JWT Authentication System

A secure, scalable, and enterprise-ready JWT authentication system for React applications.

## 🏗️ Architecture Overview

### Security Model
- **Access Token**: Stored in-memory (React state) - XSS protection
- **Refresh Token**: Stored in HttpOnly secure cookie (backend-set) - CSRF protection
- **User Data**: Stored in localStorage (non-sensitive information only)

### Key Components

1. **Auth Store (Zustand)**: Centralized state management
2. **Axios Client**: Secure HTTP client with automatic token refresh
3. **Route Protection**: Components for route-level access control
4. **Permission System**: Fine-grained permission checking

## 📦 Installation

The authentication system is already integrated. No additional installation required.

## 🚀 Usage

### Basic Authentication

```typescript
import { useAuth } from '@/features/auth';

function MyComponent() {
  const { login, logout, isAuthenticated, user } = useAuth();

  const handleLogin = async () => {
    try {
      await login({
        email: 'user@example.com',
        password: 'password123',
        rememberMe: true,
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### Protected Routes

```typescript
import { ProtectedRoute, RequireRole, RequirePermission } from '@/features/auth';

// Protect entire route
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>

// Require specific role
<Route
  path="/admin"
  element={
    <RequireRole roles={['admin']}>
      <AdminPanel />
    </RequireRole>
  }
/>

// Require specific permission
<Route
  path="/settings"
  element={
    <RequirePermission permission="settings:access">
      <Settings />
    </RequirePermission>
  }
/>
```

### Permission-Based UI

```typescript
import { useCan, useHasRole } from '@/features/auth';

function UserManagement() {
  const canCreate = useCan('user:create');
  const isAdmin = useHasRole('admin');

  return (
    <div>
      {canCreate && (
        <button>Create User</button>
      )}
      {isAdmin && (
        <button>Delete User</button>
      )}
    </div>
  );
}
```

### Using Permission Utilities

```typescript
import { can, canAny, hasRole } from '@/features/auth/utils/permissions';

// In non-React code
if (can('user:create')) {
  // Allow action
}

if (canAny(['user:create', 'user:edit'])) {
  // Allow if user has any permission
}

if (hasRole('admin')) {
  // Allow admin actions
}
```

## 🔧 API Integration

All API calls automatically include the JWT token and handle token refresh:

```typescript
import { axiosClient } from '@/core/api/axiosClient';

// Token is automatically attached
const data = await axiosClient.get('/api/users');

// On 401, token is automatically refreshed and request is retried
const result = await axiosClient.post('/api/users', userData);
```

## 📋 API Endpoints

The backend should implement these endpoints:

- `POST /auth/login` - Login with email/password
- `POST /auth/signup` - Register new user
- `POST /auth/logout` - Logout (clears refresh token cookie)
- `POST /auth/refresh` - Refresh access token (reads refresh token from cookie)
- `GET /auth/validate` - Validate current token
- `POST /auth/google` - Google OAuth login

### Expected Response Format

```typescript
interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user' | 'viewer';
    permissions: string[];
  };
  token: string; // Access token (short-lived)
  // Refresh token is set in HttpOnly cookie by backend
}
```

## 🛡️ Security Features

1. **XSS Protection**: Access tokens stored in memory, not localStorage
2. **CSRF Protection**: Refresh tokens in HttpOnly cookies
3. **Automatic Token Refresh**: Seamless token renewal on expiry
4. **Request Queuing**: Prevents race conditions during token refresh
5. **Multi-tab Support**: Synchronized auth state across tabs

## 🔐 Permission System

### Defining Permissions

```typescript
// src/features/auth/utils/permissions.ts
export const PERMISSIONS = {
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  SETTINGS_ACCESS: 'settings:access',
} as const;
```

### Using Permissions

```typescript
// Component level
const canEdit = useCan('user:update');

// Route level
<RequirePermission permission="user:create">
  <CreateUserPage />
</RequirePermission>

// Utility functions
if (can('user:delete')) {
  // Show delete button
}
```

## 🎯 Best Practices

1. **Always use ProtectedRoute** for authenticated pages
2. **Use permission checks** for UI elements
3. **Never store tokens** in localStorage (except user data)
4. **Let Axios client handle** token attachment automatically
5. **Use permission constants** instead of magic strings

## 🐛 Troubleshooting

### Token refresh fails
- Ensure backend sets refresh token in HttpOnly cookie
- Check CORS configuration allows credentials
- Verify cookie domain and path settings

### 401 errors persist
- Check if refresh token endpoint is working
- Verify backend cookie settings
- Check network tab for cookie presence

### Permission checks not working
- Ensure user object includes permissions array
- Verify permission strings match exactly
- Check user role is set correctly

## 📚 Additional Resources

- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Axios Documentation](https://axios-http.com/)
- [React Router Documentation](https://reactrouter.com/)




