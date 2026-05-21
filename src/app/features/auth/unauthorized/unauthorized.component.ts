import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card shadow">
            <div class="card-body text-center p-5">
              <div class="mb-4">
                <i class="bi bi-shield-exclamation text-warning" style="font-size: 4rem;"></i>
              </div>

              <h2 class="card-title mb-3">Acceso No Autorizado</h2>

              <p class="card-text text-muted mb-4">
                No tienes permisos para acceder a esta página.
                @if (currentUser) {
                  <br />
                  <small
                    >Tu rol actual:
                    <strong>{{ getRoleDisplayName(currentUser.role) }}</strong></small
                  >
                }
              </p>

              <div class="d-grid gap-2">
                <button type="button" class="btn btn-primary" (click)="goToHome()">
                  <i class="bi bi-house-door me-2"></i>
                  Ir al Inicio
                </button>

                @if (currentUser) {
                  <button type="button" class="btn btn-outline-secondary" (click)="logout()">
                    <i class="bi bi-box-arrow-right me-2"></i>
                    Cerrar Sesión
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background-color: #f8f9fa;
      }

      .card {
        border: none;
        border-radius: 1rem;
      }

      .bi {
        line-height: 1;
      }
    `,
  ],
})
export class UnauthorizedComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  currentUser = this.authService.getCurrentUser();

  /**
   * Navigate to home page
   */
  goToHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * Logout and redirect to login page
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if logout fails, redirect to login
        this.router.navigate(['/login']);
      },
    });
  }

  /**
   * Get display name for role
   */
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      AUXILIAR: 'Auxiliar',
      ADMIN: 'Administrador',
      DIRECCION: 'Dirección',
    };
    return roleNames[role] || role;
  }
}
