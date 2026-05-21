import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Reactive form
  loginForm: FormGroup;

  // State signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

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
   * Handle form submission
   */
  onSubmit(): void {
    // Clear previous error
    this.errorMessage.set(null);

    // Validate form
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // Set loading state
    this.isLoading.set(true);

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        // Redirect based on user role
        this.redirectByRole(response.user.role);
      },
      error: (error: Error | HttpErrorResponse) => {
        this.isLoading.set(false);

        // Handle different error types
        if (error instanceof HttpErrorResponse) {
          this.handleHttpError(error);
        } else {
          this.errorMessage.set(error.message || 'Error desconocido');
        }
      },
    });
  }

  /**
   * Redirect user based on their role, respecting returnUrl if present
   * @param role - User role
   */
  private redirectByRole(role: 'AUXILIAR' | 'ADMIN' | 'DIRECCION'): void {
    // 1. Check if there's a returnUrl in query parameters
    const urlTree = this.router.parseUrl(this.router.url);
    const returnUrl = urlTree.queryParams['returnUrl'];

    if (returnUrl && returnUrl !== '/') {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    // 2. Fallback routes if no returnUrl is present
    const roleRoutes: Record<string, string> = {
      AUXILIAR: '/asistencia/sesion',
      ADMIN: '/estudiantes',
      DIRECCION: '/asistencia/historial',
    };

    const route = roleRoutes[role] || '/';
    this.router.navigate([route]);
  }

  /**
   * Handle HTTP errors with user-friendly messages
   * @param error - HttpErrorResponse
   */
  private handleHttpError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 401:
        this.errorMessage.set(
          'Credenciales inválidas. Por favor, verifica tu usuario y contraseña.'
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
            'Ocurrió un error al iniciar sesión. Por favor, intenta nuevamente.'
        );
    }
  }

  /**
   * Check if a form field has errors and has been touched
   * @param fieldName - Name of the form field
   * @returns boolean
   */
  hasError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get error message for a specific field
   * @param fieldName - Name of the form field
   * @returns string | null
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
