import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../models/auth.model';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: any;
  let router: any;

  const mockAuthResponse: AuthResponse = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 3600,
    user: {
      id: '123',
      username: 'testuser',
      role: 'ADMIN',
    },
  };

  beforeEach(() => {
    authService = {
      getAccessToken: jasmine.createSpy('getAccessToken'),
      getRefreshToken: jasmine.createSpy('getRefreshToken'),
      refresh: jasmine.createSpy('refresh'),
    };

    router = {
      navigate: jasmine.createSpy('navigate'),
      url: '/test',
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('Authorization Header', () => {
    it('should add Authorization header with Bearer token to requests', () => {
      return new Promise<void>((resolve, reject) => {
        const testToken = 'test-access-token';
        authService.getAccessToken.and.returnValue(testToken);

        httpClient.get('/api/internal/students').subscribe({
          next: () => resolve(),
          error: reject,
        });

        const req = httpTestingController.expectOne('/api/internal/students');
        expect(req.request.headers.has('Authorization')).toBe(true);
        expect(req.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
        req.flush({});
      });
    });

    it('should not add Authorization header if no token exists', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue(null);

        httpClient.get('/api/internal/students').subscribe({
          next: () => resolve(),
          error: reject,
        });

        const req = httpTestingController.expectOne('/api/internal/students');
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush({});
      });
    });

    it('should not add Authorization header to login endpoint', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('test-token');

        httpClient.post('/api/auth/login', { username: 'test', password: 'test' }).subscribe({
          next: () => resolve(),
          error: reject,
        });

        const req = httpTestingController.expectOne('/api/auth/login');
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush({});
      });
    });

    it('should not add Authorization header to refresh endpoint', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('test-token');

        httpClient.post('/api/auth/refresh', { refreshToken: 'refresh-token' }).subscribe({
          next: () => resolve(),
          error: reject,
        });

        const req = httpTestingController.expectOne('/api/auth/refresh');
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush({});
      });
    });

    it('should not add Authorization header to logout endpoint', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('test-token');

        httpClient.post('/api/auth/logout', { refreshToken: 'refresh-token' }).subscribe({
          next: () => resolve(),
          error: reject,
        });

        const req = httpTestingController.expectOne('/api/auth/logout');
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush({});
      });
    });
  });

  describe('401 Unauthorized Handling', () => {
    it('should attempt token refresh on 401 response', () => {
      return new Promise<void>((resolve, reject) => {
        const oldToken = 'expired-token';
        const newToken = 'new-access-token';

        authService.getAccessToken.and.returnValues(oldToken, newToken);
        authService.refresh.and.returnValue(of(mockAuthResponse));

        httpClient.get('/api/internal/students').subscribe({
          next: () => {
            expect(authService.refresh).toHaveBeenCalled();
            resolve();
          },
          error: reject,
        });

        // First request with expired token
        const req1 = httpTestingController.expectOne('/api/internal/students');
        expect(req1.request.headers.get('Authorization')).toBe(`Bearer ${oldToken}`);
        req1.flush(
          { error: { message: 'Token expired' } },
          { status: 401, statusText: 'Unauthorized' }
        );

        // Retry request with new token
        const req2 = httpTestingController.expectOne('/api/internal/students');
        expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
        req2.flush({ data: [] });
      });
    });

    it('should redirect to login if token refresh fails', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('expired-token');
        authService.refresh.and.returnValue(throwError(() => new Error('Refresh failed')));

        httpClient.get('/api/internal/students').subscribe({
          next: () => reject(new Error('Should have failed')),
          error: (error) => {
            expect(authService.refresh).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['/login'], {
              queryParams: { returnUrl: '/test', reason: 'session-expired' },
            });
            expect(error.message).toBe('Session expired. Please login again.');
            resolve();
          },
        });

        const req = httpTestingController.expectOne('/api/internal/students');
        req.flush(
          { error: { message: 'Token expired' } },
          { status: 401, statusText: 'Unauthorized' }
        );
      });
    });

    it('should redirect to login if no token after refresh', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValues('expired-token', null);
        authService.refresh.and.returnValue(of(mockAuthResponse));

        httpClient.get('/api/internal/students').subscribe({
          next: () => reject(new Error('Should have failed')),
          error: (error) => {
            expect(router.navigate).toHaveBeenCalledWith(['/login']);
            // The error message will be from the refresh failure, not "Authentication failed"
            // because the switchMap catches the error from the missing token
            resolve();
          },
        });

        const req = httpTestingController.expectOne('/api/internal/students');
        req.flush(
          { error: { message: 'Token expired' } },
          { status: 401, statusText: 'Unauthorized' }
        );
      });
    });
  });

  describe('403 Forbidden Handling', () => {
    it('should handle 403 response with error message', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('valid-token');

        httpClient.get('/api/internal/students').subscribe({
          next: () => reject(new Error('Should have failed')),
          error: (error) => {
            expect(error.message).toBe('You do not have permission to access this resource.');
            expect((error as any).status).toBe(403);
            resolve();
          },
        });

        const req = httpTestingController.expectOne('/api/internal/students');
        req.flush(
          { error: { message: 'You do not have permission to access this resource.' } },
          { status: 403, statusText: 'Forbidden' }
        );
      });
    });

    it('should extract custom error message from 403 response', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('valid-token');
        const customMessage = 'Only ADMIN users can access this endpoint';

        httpClient.delete('/api/internal/students/123').subscribe({
          next: () => reject(new Error('Should have failed')),
          error: (error) => {
            expect(error.message).toBe(customMessage);
            expect((error as any).status).toBe(403);
            resolve();
          },
        });

        const req = httpTestingController.expectOne('/api/internal/students/123');
        req.flush({ error: { message: customMessage } }, { status: 403, statusText: 'Forbidden' });
      });
    });

    it('should not redirect on 403 response', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('valid-token');

        httpClient.get('/api/internal/students').subscribe({
          next: () => reject(new Error('Should have failed')),
          error: () => {
            expect(router.navigate).not.toHaveBeenCalled();
            resolve();
          },
        });

        const req = httpTestingController.expectOne('/api/internal/students');
        req.flush({ error: { message: 'Forbidden' } }, { status: 403, statusText: 'Forbidden' });
      });
    });
  });

  describe('Other Error Handling', () => {
    it('should pass through 404 errors without modification', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('valid-token');

        httpClient.get('/api/internal/students/999').subscribe({
          next: () => reject(new Error('Should have failed')),
          error: (error) => {
            expect(error.status).toBe(404);
            expect(router.navigate).not.toHaveBeenCalled();
            expect(authService.refresh).not.toHaveBeenCalled();
            resolve();
          },
        });

        const req = httpTestingController.expectOne('/api/internal/students/999');
        req.flush(
          { error: { message: 'Student not found' } },
          { status: 404, statusText: 'Not Found' }
        );
      });
    });

    it('should pass through 500 errors without modification', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('valid-token');

        httpClient.get('/api/internal/students').subscribe({
          next: () => reject(new Error('Should have failed')),
          error: (error) => {
            expect(error.status).toBe(500);
            expect(router.navigate).not.toHaveBeenCalled();
            expect(authService.refresh).not.toHaveBeenCalled();
            resolve();
          },
        });

        const req = httpTestingController.expectOne('/api/internal/students');
        req.flush(
          { error: { message: 'Internal server error' } },
          { status: 500, statusText: 'Internal Server Error' }
        );
      });
    });

    it('should pass through 400 errors without modification', () => {
      return new Promise<void>((resolve, reject) => {
        authService.getAccessToken.and.returnValue('valid-token');

        httpClient.post('/api/internal/students', { invalidData: true }).subscribe({
          next: () => reject(new Error('Should have failed')),
          error: (error) => {
            expect(error.status).toBe(400);
            expect(router.navigate).not.toHaveBeenCalled();
            expect(authService.refresh).not.toHaveBeenCalled();
            resolve();
          },
        });

        const req = httpTestingController.expectOne('/api/internal/students');
        req.flush(
          { error: { message: 'Invalid request data' } },
          { status: 400, statusText: 'Bad Request' }
        );
      });
    });
  });

  describe('Multiple Requests', () => {
    it('should add Authorization header to multiple concurrent requests', () => {
      return new Promise<void>((resolve, reject) => {
        const testToken = 'test-access-token';
        authService.getAccessToken.and.returnValue(testToken);

        let completedRequests = 0;
        const checkDone = () => {
          completedRequests++;
          if (completedRequests === 3) {
            resolve();
          }
        };

        httpClient.get('/api/internal/students').subscribe({ next: checkDone, error: reject });
        httpClient
          .get('/api/internal/attendance/sessions')
          .subscribe({ next: checkDone, error: reject });
        httpClient.get('/api/internal/params').subscribe({ next: checkDone, error: reject });

        const req1 = httpTestingController.expectOne('/api/internal/students');
        const req2 = httpTestingController.expectOne('/api/internal/attendance/sessions');
        const req3 = httpTestingController.expectOne('/api/internal/params');

        expect(req1.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
        expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
        expect(req3.request.headers.get('Authorization')).toBe(`Bearer ${testToken}`);

        req1.flush({});
        req2.flush({});
        req3.flush({});
      });
    });
  });
});
