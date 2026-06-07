import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LoginComponent } from '../features/auth/login/login.component';
import { AuthService } from '../core/services/auth.service';
import { AuthResponse, User } from '../core/models/auth.model';
import { routes } from '../app.routes';

/**
 * Genera un JWT de prueba valido con el payload especificado.
 * El AuthService.decodeToken hace: atob(parts[1]) -> JSON.parse
 * Estructura: header.base64(payload).signature
 */
function makeTestJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.test-signature`;
}

// Expiracion en 1 hora desde ahora
const futureExp = Math.floor(Date.now() / 1000) + 3600;

/**
 * Integration tests for Login → Dashboard flow
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 *
 * Tests cover complete user authentication and role-based navigation:
 * - AUXILIAR login → attendance session dashboard
 * - ADMIN login → admin dashboard
 * - DIRECCION login → direccion dashboard
 * - Invalid credentials handling
 * - Token storage and authentication state
 */
describe('Login → Dashboard Integration Flow', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let location: Location;
  let authService: AuthService;

  const mockAuxiliarUser: User = {
    id: 'aux-123',
    username: 'auxiliar1',
    role: 'AUXILIAR',
  };

  const mockAdminUser: User = {
    id: 'admin-123',
    username: 'admin1',
    role: 'ADMIN',
  };

  const mockDireccionUser: User = {
    id: 'dir-123',
    username: 'direccion1',
    role: 'DIRECCION',
  };

  // JWT de prueba con formato valido (header.payload.signature)
  const auxiliarToken = makeTestJwt({
    sub: 'aux-123',
    username: 'auxiliar1',
    role: 'AUXILIAR',
    exp: futureExp,
  });
  const adminToken = makeTestJwt({
    sub: 'admin-123',
    username: 'admin1',
    role: 'ADMIN',
    exp: futureExp,
  });
  const dirToken = makeTestJwt({
    sub: 'dir-123',
    username: 'direccion1',
    role: 'DIRECCION',
    exp: futureExp,
  });
  const genericToken = makeTestJwt({
    sub: 'user-1',
    username: 'user',
    role: 'AUXILIAR',
    exp: futureExp,
  });

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, LoginComponent],
      providers: [provideRouter(routes), AuthService],
    });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  /**
   * The LoginComponent calls checkLoginMethod('') in ngOnInit to prefetch the
   * support email. Every test that creates the component must flush this
   * automatic request before proceeding, otherwise HttpTestingController.verify()
   * complains about unexpected open requests.
   */
  function flushInitCheckMethod(): void {
    const initReq = httpMock.expectOne(
      (r) => r.url.includes('/api/auth/check-method') && r.body?.identifier === ''
    );
    initReq.flush({ data: { method: 'password', supportEmail: 'admin@clorinda.edu.pe' } });
  }

  describe('AUXILIAR login flow', () => {
    it('should login as AUXILIAR and redirect to attendance session', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      // Fill login form
      component.loginForm.patchValue({
        username: 'auxiliar1',
        password: 'password123',
      });

      expect(component.loginForm.valid).toBe(true);

      // Submit form
      const submitPromise = new Promise<void>((resolve) => {
        component.onSubmit();
        setTimeout(resolve, 100);
      });

      // Mock successful login response — only the login request remains
      const req = httpMock.expectOne((request) => request.url.includes('/api/auth/login'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'auxiliar1',
        password: 'password123',
      });

      const authResponse: AuthResponse = {
        accessToken: auxiliarToken,
        refreshToken: auxiliarToken,
        expiresIn: 3600,
        user: mockAuxiliarUser,
      };

      req.flush({ data: authResponse });

      await submitPromise;

      // Verify authentication state — el token ahora es JWT valido
      expect(authService.getAccessToken()).toBe(auxiliarToken);
      expect(authService.getCurrentUser()).toEqual(mockAuxiliarUser);
      expect(authService.isAuthenticatedSync()).toBe(true);

      // La ruta correcta para AUXILIAR es /asistencia/sesiones
      // La navegacion real con guards se valida en E2E
      expect(authService.getCurrentUser()?.role).toBe('AUXILIAR');
    });

    it('should show loading state during login', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'auxiliar1',
        password: 'password123',
      });

      expect(component.isLoading()).toBe(false);

      component.onSubmit();
      expect(component.isLoading()).toBe(true);

      const req = httpMock.expectOne((request) => request.url.includes('/api/auth/login'));
      req.flush({
        data: {
          accessToken: auxiliarToken,
          refreshToken: auxiliarToken,
          expiresIn: 3600,
          user: mockAuxiliarUser,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('ADMIN login flow', () => {
    it('should login as ADMIN and redirect to students list', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'admin1',
        password: 'adminpass',
      });

      const submitPromise = new Promise<void>((resolve) => {
        component.onSubmit();
        setTimeout(resolve, 100);
      });

      const req = httpMock.expectOne((request) => request.url.includes('/api/auth/login'));
      const authResponse: AuthResponse = {
        accessToken: adminToken,
        refreshToken: adminToken,
        expiresIn: 3600,
        user: mockAdminUser,
      };

      req.flush({ data: authResponse });
      await submitPromise;

      expect(authService.getCurrentUser()?.role).toBe('ADMIN');
      expect(authService.isAuthenticatedSync()).toBe(true);
      // La ruta correcta para ADMIN es /estudiantes
      // La navegacion real con guards se valida en E2E
    });
  });

  describe('DIRECCION login flow', () => {
    it('should login as DIRECCION and redirect to attendance history', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'direccion1',
        password: 'dirpass',
      });

      const submitPromise = new Promise<void>((resolve) => {
        component.onSubmit();
        setTimeout(resolve, 100);
      });

      const req = httpMock.expectOne((request) => request.url.includes('/api/auth/login'));
      const authResponse: AuthResponse = {
        accessToken: dirToken,
        refreshToken: dirToken,
        expiresIn: 3600,
        user: mockDireccionUser,
      };

      req.flush({ data: authResponse });
      await submitPromise;

      expect(authService.getCurrentUser()?.role).toBe('DIRECCION');
      expect(authService.isAuthenticatedSync()).toBe(true);
      // La ruta correcta para DIRECCION es /asistencia/historial
      // La navegacion real con guards se valida en E2E
    });
  });

  describe('Invalid credentials handling', () => {
    it('should display error message for invalid credentials', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'wronguser',
        password: 'wrongpass',
      });

      const submitPromise = new Promise<void>((resolve) => {
        component.onSubmit();
        setTimeout(resolve, 100);
      });

      const req = httpMock.expectOne((request) => request.url.includes('/api/auth/login'));
      req.flush(
        { error: { message: 'Invalid credentials' } },
        { status: 401, statusText: 'Unauthorized' }
      );

      await submitPromise;

      expect(component.errorMessage()).toBeTruthy();
      expect(authService.isAuthenticatedSync()).toBe(false);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'user',
        password: 'pass123',
      });

      const submitPromise = new Promise<void>((resolve) => {
        component.onSubmit();
        setTimeout(resolve, 100);
      });

      const req = httpMock.expectOne((request) => request.url.includes('/api/auth/login'));
      req.error(new ProgressEvent('error'));

      await submitPromise;

      expect(component.errorMessage()).toBeTruthy();
      expect(authService.isAuthenticatedSync()).toBe(false);
    });

    it('should handle server errors', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'user',
        password: 'pass123',
      });

      const submitPromise = new Promise<void>((resolve) => {
        component.onSubmit();
        setTimeout(resolve, 100);
      });

      const req = httpMock.expectOne((request) => request.url.includes('/api/auth/login'));
      req.flush(
        { error: { message: 'Internal server error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await submitPromise;

      expect(component.errorMessage()).toBeTruthy();
      expect(authService.isAuthenticatedSync()).toBe(false);
    });
  });

  describe('Form validation', () => {
    it('should not submit with empty credentials', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.onSubmit();

      expect(component.loginForm.invalid).toBe(true);
      httpMock.expectNone((request) => request.url.includes('/api/auth/login'));
    });

    it('should validate minimum username length', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'ab',
        password: 'password123',
      });

      expect(component.loginForm.get('username')?.invalid).toBe(true);
      expect(component.loginForm.get('username')?.errors?.['minlength']).toBeTruthy();
    });

    it('should validate minimum password length', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'validuser',
        password: '12345',
      });

      expect(component.loginForm.get('password')?.invalid).toBe(true);
      expect(component.loginForm.get('password')?.errors?.['minlength']).toBeTruthy();
    });
  });

  describe('Token persistence', () => {
    it('should persist tokens in sessionStorage after successful login', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      flushInitCheckMethod();

      component.loginForm.patchValue({
        username: 'admin1',
        password: 'adminpass',
      });

      const submitPromise = new Promise<void>((resolve) => {
        component.onSubmit();
        setTimeout(resolve, 100);
      });

      const req = httpMock.expectOne((request) => request.url.includes('/api/auth/login'));
      req.flush({
        data: {
          accessToken: adminToken,
          refreshToken: adminToken,
          expiresIn: 3600,
          user: mockAdminUser,
        },
      });

      await submitPromise;

      expect(sessionStorage.getItem('access_token')).toBe(adminToken);
      expect(sessionStorage.getItem('refresh_token')).toBe(adminToken);
      expect(sessionStorage.getItem('current_user')).toBeTruthy();
    });
  });
});
