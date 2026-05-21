import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AuthResponse, User } from '../models/auth.model';

/**
 * Unit tests for AuthService
 * **Validates: Requirements 1.1, 1.2, 1.4**
 *
 * Tests cover:
 * - Login functionality
 * - Logout functionality
 * - Token refresh
 * - Authentication state management
 */
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    role: 'ADMIN',
  };

  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    user: mockUser,
  };

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store auth data', async () => {
      const username = 'testuser';
      const password = 'password123';

      const loginPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.login(username, password).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username, password });
      req.flush({ data: mockAuthResponse });

      const response = await loginPromise;
      expect(response).toEqual(mockAuthResponse);
      expect(service.getAccessToken()).toBe(mockAuthResponse.accessToken);
      expect(service.getRefreshToken()).toBe(mockAuthResponse.refreshToken);
      expect(service.getCurrentUser()).toEqual(mockUser);
    });

    it('should handle login error', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';

      const loginPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.login(username, password).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush(
        { error: { message: 'Invalid credentials' } },
        { status: 401, statusText: 'Unauthorized' }
      );

      await expectAsync(loginPromise).toBeRejected();
      expect(service.isAuthenticatedSync()).toBe(false);
    });

    it('should update user signal and observable on login', async () => {
      const username = 'testuser';
      const password = 'password123';

      let userFromObservable: User | null = null;
      service.currentUser$.subscribe((user) => {
        userFromObservable = user;
      });

      const loginPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.login(username, password).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ data: mockAuthResponse });

      await loginPromise;
      expect(service.getCurrentUser()).toEqual(mockUser);
      expect(userFromObservable!).toEqual(mockUser);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Setup authenticated state
      sessionStorage.setItem('access_token', mockAuthResponse.accessToken);
      sessionStorage.setItem('refresh_token', mockAuthResponse.refreshToken);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
    });

    it('should logout successfully and clear auth data', async () => {
      const logoutPromise = new Promise<void>((resolve, reject) => {
        service.logout().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/logout');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: mockAuthResponse.refreshToken });
      req.flush({});

      await logoutPromise;
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
      expect(service.isAuthenticatedSync()).toBe(false);
    });

    it('should clear auth data even if logout request fails', async () => {
      const logoutPromise = new Promise<void>((resolve, reject) => {
        service.logout().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/logout');
      req.flush(
        { error: { message: 'Server error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await expectAsync(logoutPromise).toBeRejected();
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      sessionStorage.setItem('refresh_token', mockAuthResponse.refreshToken);
    });

    it('should refresh token successfully', async () => {
      const newAuthResponse: AuthResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token',
      };

      const refreshPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.refresh().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/refresh');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: mockAuthResponse.refreshToken });
      req.flush({ data: newAuthResponse });

      const response = await refreshPromise;
      expect(response).toEqual(newAuthResponse);
      expect(service.getAccessToken()).toBe('new-access-token');
    });

    it('should return error if no refresh token available', async () => {
      sessionStorage.removeItem('refresh_token');

      const refreshPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.refresh().subscribe({
          next: resolve,
          error: reject,
        });
      });

      await expectAsync(refreshPromise).toBeRejectedWithError(Error, 'No refresh token available');
    });

    it('should clear auth data if refresh fails', async () => {
      sessionStorage.setItem('access_token', mockAuthResponse.accessToken);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      const refreshPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.refresh().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/refresh');
      req.flush(
        { error: { message: 'Invalid refresh token' } },
        { status: 401, statusText: 'Unauthorized' }
      );

      await expectAsync(refreshPromise).toBeRejected();
      expect(service.getAccessToken()).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('isAuthenticatedSync', () => {
    it('should return false when no token exists', () => {
      expect(service.isAuthenticatedSync()).toBe(false);
    });

    it('should return false when no user exists', () => {
      sessionStorage.setItem('access_token', 'some-token');
      expect(service.isAuthenticatedSync()).toBe(false);
    });

    it('should return true when valid token and user exist', () => {
      // Create a valid token (not expired)
      const payload = {
        sub: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;

      sessionStorage.setItem('access_token', token);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      // Reset TestBed to create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService],
      });

      const newService = TestBed.inject(AuthService);

      expect(newService.isAuthenticatedSync()).toBe(true);
    });

    it('should return false when token is expired', () => {
      // Create an expired token
      const payload = {
        sub: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;

      sessionStorage.setItem('access_token', token);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      expect(service.isAuthenticatedSync()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is stored', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should return user when stored in session storage', () => {
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      // Reset TestBed to create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService],
      });

      const newService = TestBed.inject(AuthService);

      expect(newService.getCurrentUser()).toEqual(mockUser);
    });
  });

  describe('getAccessToken', () => {
    it('should return null when no token exists', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('should return token when stored', () => {
      sessionStorage.setItem('access_token', 'test-token');
      expect(service.getAccessToken()).toBe('test-token');
    });
  });

  describe('getRefreshToken', () => {
    it('should return null when no refresh token exists', () => {
      expect(service.getRefreshToken()).toBeNull();
    });

    it('should return refresh token when stored', () => {
      sessionStorage.setItem('refresh_token', 'test-refresh-token');
      expect(service.getRefreshToken()).toBe('test-refresh-token');
    });
  });

  describe('token expiration', () => {
    it('should correctly identify expired tokens', () => {
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 100,
      };
      const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`;

      sessionStorage.setItem('access_token', expiredToken);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      // Reset TestBed to create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService],
      });

      const newService = TestBed.inject(AuthService);

      expect(newService.isAuthenticatedSync()).toBe(false);
    });

    it('should correctly identify valid tokens', () => {
      const validPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;

      sessionStorage.setItem('access_token', validToken);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      // Reset TestBed to create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService],
      });

      const newService = TestBed.inject(AuthService);

      expect(newService.isAuthenticatedSync()).toBe(true);
    });

    it('should handle malformed tokens gracefully', () => {
      sessionStorage.setItem('access_token', 'malformed-token');
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      // Reset TestBed to create a new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService],
      });

      const newService = TestBed.inject(AuthService);

      expect(newService.isAuthenticatedSync()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const loginPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.login('user', 'pass').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.error(new ProgressEvent('error'));

      await expectAsync(loginPromise).toBeRejected();
    });

    it('should handle server errors with custom messages', async () => {
      const loginPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.login('user', 'pass').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush(
        { error: { message: 'Custom error message' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await expectAsync(loginPromise).toBeRejected();
    });
  });
});
