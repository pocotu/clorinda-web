import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Reactive form
  loginForm: FormGroup;

  // State signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  loginStep = signal<'identifier' | 'password' | 'google' | 'recovery'>('identifier');
  supportEmail = signal<string>(environment.supportEmail);

  constructor() {
    // Initialize form with validators
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    effect(() => {
      if (this.isLoading()) {
        this.loginForm.disable();
      } else {
        this.loginForm.enable();
      }
    });
  }

  /**
   * Prefetch support email dynamically on component load
   */
  ngOnInit(): void {
    this.authService.checkLoginMethod('').subscribe({
      next: (res) => {
        if (res.supportEmail) {
          this.supportEmail.set(res.supportEmail);
        }
      },
      error: () => {
        // Silent fallback to default value
      },
    });
  }

  /**
   * Handle first step: check login method
   */
  onContinue(): void {
    this.errorMessage.set(null);

    const usernameField = this.loginForm.get('username');
    if (!usernameField || usernameField.invalid) {
      usernameField?.markAsTouched();
      return;
    }

    this.isLoading.set(true);
    const username = usernameField.value;

    this.authService.checkLoginMethod(username).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.supportEmail) {
          this.supportEmail.set(res.supportEmail);
        }
        if (res.method === 'google') {
          this.loginStep.set('google');
        } else {
          this.loginStep.set('password');
        }
      },
      error: (error: Error | HttpErrorResponse) => {
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse) {
          this.handleHttpError(error);
        } else {
          this.errorMessage.set(error.message || 'Error al verificar usuario');
        }
      },
    });
  }

  /**
   * Handle traditional password form submission
   */
  onSubmit(): void {
    this.errorMessage.set(null);

    // Validate form
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.redirectByRole(response.user.role);
      },
      error: (error: Error | HttpErrorResponse) => {
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse) {
          this.handleHttpError(error);
        } else {
          this.errorMessage.set(error.message || 'Error desconocido');
        }
      },
    });
  }

  /**
   * Handle Google Login
   */
  onGoogleLogin(): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    const username = this.loginForm.get('username')?.value || '';
    // Simulated/mock token includes typed username to retrieve the matching email dynamically
    const mockToken = `google-oauth-mock-token-admin:${username}`;

    this.authService.loginWithGoogle(mockToken).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.redirectByRole(response.user.role);
      },
      error: (error: Error | HttpErrorResponse) => {
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse) {
          this.handleHttpError(error);
        } else {
          this.errorMessage.set(error.message || 'Error al iniciar sesión con Google');
        }
      },
    });
  }

  /**
   * Navigate back to first step
   */
  goBack(): void {
    this.errorMessage.set(null);
    this.loginStep.set('identifier');
    this.loginForm.get('password')?.setValue('');
  }

  /**
   * Show recovery instruction screen
   */
  showRecovery(): void {
    this.errorMessage.set(null);
    this.loginStep.set('recovery');
  }

  /**
   * Redirect user based on their role, respecting returnUrl if present
   */
  private redirectByRole(role: 'AUXILIAR' | 'ADMIN' | 'DIRECCION'): void {
    const urlTree = this.router.parseUrl(this.router.url);
    const returnUrl = urlTree.queryParams['returnUrl'];

    if (returnUrl && returnUrl !== '/') {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    const roleRoutes: Record<'AUXILIAR' | 'ADMIN' | 'DIRECCION', string> = {
      AUXILIAR: '/asistencia/sesion',
      ADMIN: '/inicio',
      DIRECCION: '/asistencia/historial',
    };

    const route = roleRoutes[role] || '/';
    this.router.navigate([route]);
  }

  /**
   * Handle HTTP errors with user-friendly messages
   */
  private handleHttpError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 401:
        this.errorMessage.set(
          'Credenciales inválidas o usuario no afiliado. Por favor, verifica tus datos.'
        );
        break;
      case 403:
        this.errorMessage.set('Acceso denegado. Tu cuenta no tiene permisos para acceder.');
        break;
      case 0:
        this.errorMessage.set(
          'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.'
        );
        break;
      case 500:
      case 502:
      case 503:
        this.errorMessage.set(
          'El servidor no está disponible en este momento. Por favor, intenta más tarde.'
        );
        break;
      default:
        this.errorMessage.set(
          error.error?.error?.message ||
            'Ocurrió un error en el servidor. Por favor, intenta nuevamente.'
        );
    }
  }

  /**
   * Check if a form field has errors and has been touched
   */
  hasError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get error message for a specific field
   */
  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);

    if (!field || !field.errors || !field.touched) {
      return null;
    }

    if (field.errors['required']) {
      return `El campo ${fieldName === 'username' ? 'usuario' : 'contraseña'} es requerido`;
    }

    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `Debe tener al menos ${minLength} caracteres`;
    }

    return null;
  }
}
