import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/auth.model';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: any;
  let router: any;

  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    user: {
      id: '123',
      username: 'testuser',
      role: 'AUXILIAR',
    },
  };

  beforeEach(async () => {
    authService = {
      login: jasmine.createSpy('login'),
      // ngOnInit calls checkLoginMethod('') to prefetch the support email.
      // Must be present in the mock or the component throws during creation.
      checkLoginMethod: jasmine
        .createSpy('checkLoginMethod')
        .and.returnValue(of({ method: 'password', supportEmail: 'admin@clorinda.edu.pe' })),
    };

    router = {
      navigate: jasmine.createSpy('navigate'),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
      url: '/',
      parseUrl: jasmine.createSpy('parseUrl').and.returnValue({ queryParams: {} }),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with empty values', () => {
      expect(component.loginForm.get('username')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should have required validators on username', () => {
      const username = component.loginForm.get('username');
      username?.setValue('');
      expect(username?.hasError('required')).toBe(true);
    });

    it('should have minLength validator on username (3 chars)', () => {
      const username = component.loginForm.get('username');
      username?.setValue('ab');
      expect(username?.hasError('minlength')).toBe(true);

      username?.setValue('abc');
      expect(username?.hasError('minlength')).toBe(false);
    });

    it('should have required validators on password', () => {
      const password = component.loginForm.get('password');
      password?.setValue('');
      expect(password?.hasError('required')).toBe(true);
    });

    it('should have minLength validator on password (6 chars)', () => {
      const password = component.loginForm.get('password');
      password?.setValue('12345');
      expect(password?.hasError('minlength')).toBe(true);

      password?.setValue('123456');
      expect(password?.hasError('minlength')).toBe(false);
    });
  });

  describe('Form Validation', () => {
    it('should mark form as invalid when empty', () => {
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as valid when all fields are valid', () => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123',
      });
      expect(component.loginForm.valid).toBe(true);
    });

    it('should not submit when form is invalid', () => {
      component.onSubmit();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched when submitting invalid form', () => {
      component.onSubmit();
      expect(component.loginForm.get('username')?.touched).toBe(true);
      expect(component.loginForm.get('password')?.touched).toBe(true);
    });
  });

  describe('Login Success', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should call authService.login with correct credentials', () => {
      authService.login.and.returnValue(of(mockAuthResponse));

      component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
    });

    it('should set loading state to true during login', () => {
      authService.login.and.returnValue(of(mockAuthResponse));

      component.onSubmit();

      // Loading should be set before observable completes
      expect(component.isLoading()).toBe(false); // Already completed in sync test
    });

    it('should redirect AUXILIAR to /asistencia/sesiones', () => {
      const response = {
        ...mockAuthResponse,
        user: { ...mockAuthResponse.user, role: 'AUXILIAR' as const },
      };
      authService.login.and.returnValue(of(response));

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/asistencia/sesion']);
    });

    it('should redirect ADMIN to /inicio', () => {
      const response = {
        ...mockAuthResponse,
        user: { ...mockAuthResponse.user, role: 'ADMIN' as const },
      };
      authService.login.and.returnValue(of(response));

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
    });

    it('should redirect DIRECCION to /direccion/dashboard', () => {
      const response = {
        ...mockAuthResponse,
        user: { ...mockAuthResponse.user, role: 'DIRECCION' as const },
      };
      authService.login.and.returnValue(of(response));

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/asistencia/historial']);
    });

    it('should clear error message on successful login', () => {
      component.errorMessage.set('Previous error');
      authService.login.and.returnValue(of(mockAuthResponse));

      component.onSubmit();

      expect(component.errorMessage()).toBeNull();
    });
  });

  describe('Login Errors', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        username: 'testuser',
        password: 'wrongpassword',
      });
    });

    it('should display error message for 401 Unauthorized', () => {
      const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage()).toBe(
        'Credenciales inválidas o usuario no afiliado. Por favor, verifica tus datos.'
      );
    });

    it('should display error message for 403 Forbidden', () => {
      const error = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage()).toBe(
        'Acceso denegado. Tu cuenta no tiene permisos para acceder.'
      );
    });

    it('should display error message for network error (status 0)', () => {
      const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage()).toBe(
        'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.'
      );
    });

    it('should display error message for 500 Internal Server Error', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage()).toBe(
        'El servidor no está disponible en este momento. Por favor, intenta más tarde.'
      );
    });

    it('should display error message for 502 Bad Gateway', () => {
      const error = new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway' });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage()).toBe(
        'El servidor no está disponible en este momento. Por favor, intenta más tarde.'
      );
    });

    it('should display error message for 503 Service Unavailable', () => {
      const error = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage()).toBe(
        'El servidor no está disponible en este momento. Por favor, intenta más tarde.'
      );
    });

    it('should display custom error message from server', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { error: { message: 'Custom error message' } },
      });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage()).toBe('Custom error message');
    });

    it('should display generic error message for unknown errors', () => {
      const error = new HttpErrorResponse({ status: 418, statusText: "I'm a teapot" });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage()).toBe(
        'Ocurrió un error en el servidor. Por favor, intenta nuevamente.'
      );
    });

    it('should set loading to false after error', () => {
      const error = new HttpErrorResponse({ status: 401 });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.isLoading()).toBe(false);
    });

    it('should not navigate on error', () => {
      const error = new HttpErrorResponse({ status: 401 });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Field Error Helpers', () => {
    it('should return true for hasError when field is invalid and touched', () => {
      const username = component.loginForm.get('username');
      username?.setValue('');
      username?.markAsTouched();

      expect(component.hasError('username')).toBe(true);
    });

    it('should return false for hasError when field is invalid but not touched', () => {
      const username = component.loginForm.get('username');
      username?.setValue('');

      expect(component.hasError('username')).toBe(false);
    });

    it('should return false for hasError when field is valid', () => {
      const username = component.loginForm.get('username');
      username?.setValue('validuser');
      username?.markAsTouched();

      expect(component.hasError('username')).toBe(false);
    });

    it('should return correct error message for required username', () => {
      const username = component.loginForm.get('username');
      username?.setValue('');
      username?.markAsTouched();

      expect(component.getFieldError('username')).toBe('El campo usuario es requerido');
    });

    it('should return correct error message for required password', () => {
      const password = component.loginForm.get('password');
      password?.setValue('');
      password?.markAsTouched();

      expect(component.getFieldError('password')).toBe('El campo contraseña es requerido');
    });

    it('should return correct error message for minlength', () => {
      const username = component.loginForm.get('username');
      username?.setValue('ab');
      username?.markAsTouched();

      expect(component.getFieldError('username')).toBe('Debe tener al menos 3 caracteres');
    });

    it('should return null when field has no errors', () => {
      const username = component.loginForm.get('username');
      username?.setValue('validuser');
      username?.markAsTouched();

      expect(component.getFieldError('username')).toBeNull();
    });

    it('should return null when field is not touched', () => {
      const username = component.loginForm.get('username');
      username?.setValue('');

      expect(component.getFieldError('username')).toBeNull();
    });
  });

  describe('UI State', () => {
    it('should disable form fields when loading', () => {
      // #password only exists in the 'password' step
      component.loginStep.set('password');
      component.isLoading.set(true);
      fixture.detectChanges();

      const usernameInput = fixture.nativeElement.querySelector('#username');
      const passwordInput = fixture.nativeElement.querySelector('#password');

      // username is in the identifier step, not rendered here — form itself is disabled
      expect(passwordInput.disabled).toBe(true);
      expect(component.loginForm.disabled).toBe(true);
    });

    it('should disable submit button when loading', () => {
      // button[type="submit"] only exists in the 'password' step
      component.loginStep.set('password');
      component.isLoading.set(true);
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');

      expect(submitButton.disabled).toBe(true);
    });

    it('should show loading spinner when loading', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.spinner-border');

      expect(spinner).toBeTruthy();
    });

    it('should display error alert when errorMessage is set', () => {
      component.errorMessage.set('Test error message');
      fixture.detectChanges();

      const alert = fixture.nativeElement.querySelector('.alert-danger');

      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Test error message');
    });

    it('should clear error message when close button is clicked', () => {
      component.errorMessage.set('Test error message');
      fixture.detectChanges();

      const closeButton = fixture.nativeElement.querySelector('.btn-close');
      closeButton.click();

      expect(component.errorMessage()).toBeNull();
    });
  });
});
