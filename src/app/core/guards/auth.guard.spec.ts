import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard, authGuardChild } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.model';

describe('AuthGuard', () => {
  let authService: any;
  let router: any;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    // Create mock objects
    authService = {
      isAuthenticatedSync: jasmine.createSpy('isAuthenticatedSync'),
      getCurrentUser: jasmine.createSpy('getCurrentUser'),
    };

    router = {
      navigate: jasmine.createSpy('navigate'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    // Create mock route and state
    mockRoute = {
      data: {},
      params: {},
      queryParams: {},
      url: [],
      fragment: null,
      outlet: 'primary',
      component: null,
      routeConfig: null,
      root: {} as any,
      parent: null,
      firstChild: null,
      children: [],
      pathFromRoot: [],
      paramMap: {} as any,
      queryParamMap: {} as any,
      title: undefined,
    };

    mockState = {
      url: '/test-route',
      root: {} as any,
    };
  });

  describe('authGuard', () => {
    it('should allow access when user is authenticated and no roles required', () => {
      authService.isAuthenticatedSync.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to /login when user is not authenticated', () => {
      authService.isAuthenticatedSync.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/test-route' },
        replaceUrl: true,
      });
    });

    it('should allow access when user has required role', () => {
      const mockUser: User = {
        id: '123',
        username: 'admin',
        role: 'ADMIN',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['ADMIN', 'DIRECCION'] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to /unauthorized when user does not have required role', () => {
      const mockUser: User = {
        id: '123',
        username: 'auxiliar',
        role: 'AUXILIAR',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['ADMIN', 'DIRECCION'] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], { replaceUrl: true });
    });

    it('should redirect to /login when authenticated but no current user found', () => {
      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(null);
      mockRoute.data = { roles: ['ADMIN'] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/test-route' },
        replaceUrl: true,
      });
    });

    it('should allow access when user role matches one of multiple required roles', () => {
      const mockUser: User = {
        id: '123',
        username: 'direccion',
        role: 'DIRECCION',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['ADMIN', 'DIRECCION'] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should allow access when roles array is empty', () => {
      authService.isAuthenticatedSync.and.returnValue(true);
      mockRoute.data = { roles: [] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should handle AUXILIAR role correctly', () => {
      const mockUser: User = {
        id: '123',
        username: 'auxiliar1',
        role: 'AUXILIAR',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['AUXILIAR'] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should preserve returnUrl in query params when redirecting to login', () => {
      authService.isAuthenticatedSync.and.returnValue(false);
      mockState.url = '/admin/dashboard';

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/admin/dashboard' },
        replaceUrl: true,
      });
    });
  });

  describe('authGuardChild', () => {
    it('should use the same logic as authGuard for child routes', () => {
      authService.isAuthenticatedSync.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() => authGuardChild(mockRoute, mockState));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to /login when user is not authenticated (child route)', () => {
      authService.isAuthenticatedSync.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() => authGuardChild(mockRoute, mockState));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/test-route' },
        replaceUrl: true,
      });
    });

    it('should check roles for child routes', () => {
      const mockUser: User = {
        id: '123',
        username: 'admin',
        role: 'ADMIN',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['ADMIN'] };

      const result = TestBed.runInInjectionContext(() => authGuardChild(mockRoute, mockState));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to /unauthorized when child route requires different role', () => {
      const mockUser: User = {
        id: '123',
        username: 'auxiliar',
        role: 'AUXILIAR',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['ADMIN', 'DIRECCION'] };

      const result = TestBed.runInInjectionContext(() => authGuardChild(mockRoute, mockState));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], { replaceUrl: true });
    });
  });

  describe('Role-based authorization scenarios', () => {
    it('should allow ADMIN to access admin-only routes', () => {
      const mockUser: User = {
        id: '123',
        username: 'admin',
        role: 'ADMIN',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['ADMIN'] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
    });

    it('should allow DIRECCION to access direccion-only routes', () => {
      const mockUser: User = {
        id: '123',
        username: 'direccion',
        role: 'DIRECCION',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['DIRECCION'] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
    });

    it('should block AUXILIAR from accessing admin routes', () => {
      const mockUser: User = {
        id: '123',
        username: 'auxiliar',
        role: 'AUXILIAR',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = { roles: ['ADMIN', 'DIRECCION'] };

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], { replaceUrl: true });
    });

    it('should allow any authenticated user when no roles specified', () => {
      const mockUser: User = {
        id: '123',
        username: 'auxiliar',
        role: 'AUXILIAR',
      };

      authService.isAuthenticatedSync.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);
      mockRoute.data = {};

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
    });
  });
});
