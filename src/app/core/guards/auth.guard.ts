import { inject } from '@angular/core';
import {
  Router,
  CanActivateFn,
  CanActivateChildFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard - Protects routes requiring authentication
 *
 * Verifies that:
 * 1. User is authenticated (has valid token)
 * 2. User has required role (if specified in route data)
 *
 * If authentication fails, redirects to /login
 * If authorization fails (wrong role), redirects to /unauthorized
 *
 * Usage in routes:
 * ```typescript
 * {
 *   path: 'admin',
 *   canActivate: [authGuard],
 *   data: { roles: ['ADMIN', 'DIRECCION'] }
 * }
 * ```
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticatedSync()) {
    console.warn('AuthGuard: User not authenticated, redirecting to /login');

    // Store the attempted URL for redirecting after login
    const returnUrl = state.url;
    router.navigate(['/login'], {
      queryParams: { returnUrl },
      replaceUrl: true,
    });

    return false;
  }

  // Check role-based authorization if roles are specified in route data
  const requiredRoles = route.data['roles'] as string[] | undefined;

  if (requiredRoles && requiredRoles.length > 0) {
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      console.warn('AuthGuard: No current user found, redirecting to /login');
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
        replaceUrl: true,
      });
      return false;
    }

    // Check if user's role is in the list of required roles
    const hasRequiredRole = requiredRoles.includes(currentUser.role);

    if (!hasRequiredRole) {
      console.warn(
        `AuthGuard: User role '${currentUser.role}' not authorized. Required roles: ${requiredRoles.join(', ')}`
      );

      // Redirect to unauthorized page
      router.navigate(['/unauthorized'], {
        replaceUrl: true,
      });

      return false;
    }
  }

  // User is authenticated and authorized
  return true;
};

/**
 * Auth Guard for Child Routes
 *
 * Protects child routes with the same authentication and authorization logic
 * as the parent authGuard.
 *
 * Usage in routes:
 * ```typescript
 * {
 *   path: 'admin',
 *   canActivate: [authGuard],
 *   canActivateChild: [authGuardChild],
 *   children: [
 *     { path: 'users', component: UsersComponent },
 *     { path: 'settings', component: SettingsComponent }
 *   ]
 * }
 * ```
 */
export const authGuardChild: CanActivateChildFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  // Reuse the same logic as authGuard
  return authGuard(route, state);
};
