import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * HTTP Interceptor for JWT Authentication
 *
 * Responsibilities:
 * - Add Authorization header with Bearer token to all requests
 * - Handle 401 (Unauthorized) responses by attempting token refresh
 * - Handle 403 (Forbidden) responses with appropriate error messages
 * - Redirect to login on authentication failures
 *
 * Requirements: 1.1, 1.4, 2.4
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip auth handling for auth endpoints and public resources.
  if (isAuthEndpoint(req.url) || isPublicEndpoint(req.url)) {
    return next(req);
  }

  // Get access token from AuthService
  const accessToken = authService.getAccessToken();

  // Clone request and add Authorization header if token exists
  const authReq = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : req;

  // Send request and handle errors
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired - attempt refresh
        return handleUnauthorized(authService, router, req, next);
      } else if (error.status === 403) {
        // Forbidden - user doesn't have permission
        return handleForbidden(error);
      }

      // Other errors - pass through
      return throwError(() => error);
    })
  );
};

/**
 * Check if the request URL is an authentication endpoint
 * @param url - Request URL
 * @returns boolean - true if auth endpoint
 */
function isAuthEndpoint(url: string): boolean {
  const authEndpoints = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];
  return authEndpoints.some((endpoint) => url.includes(endpoint));
}

function isPublicEndpoint(url: string): boolean {
  const publicEndpoints = ['/api/public/', '/api/landing/public/'];
  return publicEndpoints.some((endpoint) => url.includes(endpoint));
}

/**
 * Handle 401 Unauthorized responses
 * Attempts to refresh the access token and retry the original request
 * If refresh fails, clears auth data and redirects to login
 *
 * @param authService - AuthService instance
 * @param router - Router instance
 * @param req - Original HTTP request
 * @param next - HTTP handler function
 * @returns Observable
 */
function handleUnauthorized(
  authService: AuthService,
  router: Router,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) {
  // Attempt to refresh the token
  return authService.refresh().pipe(
    switchMap(() => {
      // Refresh successful - retry original request with new token
      const newToken = authService.getAccessToken();

      if (!newToken) {
        // No token after refresh - redirect to login
        router.navigate(['/login']);
        return throwError(() => new Error('Authentication failed'));
      }

      // Clone original request with new token
      const retryReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${newToken}`,
        },
      });

      // Retry the original request
      return next(retryReq);
    }),
    catchError((refreshError) => {
      // Refresh failed - clear auth data and redirect to login
      console.error('Token refresh failed:', refreshError);

      // Navigate to login page
      router.navigate(['/login'], {
        queryParams: { returnUrl: router.url, reason: 'session-expired' },
      });

      return throwError(() => new Error('Session expired. Please login again.'));
    })
  );
}

/**
 * Handle 403 Forbidden responses
 * Shows appropriate error message and optionally redirects
 *
 * @param error - HttpErrorResponse
 * @returns Observable<never>
 */
function handleForbidden(error: HttpErrorResponse) {
  console.error('Access forbidden:', error);

  // Extract error message from response
  const errorMessage =
    error.error?.error?.message || 'You do not have permission to access this resource.';

  // Create user-friendly error
  const forbiddenError = new Error(errorMessage);
  (forbiddenError as any).status = 403;
  (forbiddenError as any).originalError = error;

  // Note: We don't redirect on 403 - the component should handle displaying the error
  // The user is authenticated but doesn't have permission for this specific action

  return throwError(() => forbiddenError);
}
