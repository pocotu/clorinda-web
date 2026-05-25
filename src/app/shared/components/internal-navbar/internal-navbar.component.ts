import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

/**
 * InternalNavbarComponent
 *
 * Navbar superior para el área autenticada.
 *
 * Características:
 * - Logo y nombre del colegio
 * - Botón hamburguesa para toggle del sidebar
 * - Menú de usuario con nombre y rol
 * - Opción de logout
 */
@Component({
  selector: 'app-internal-navbar',
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective],
  templateUrl: './internal-navbar.component.html',
  styleUrl: './internal-navbar.component.css',
})
export class InternalNavbarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Output() toggleSidebar = new EventEmitter<void>();

  // Estado del dropdown de usuario
  userMenuOpen = false;

  // Usuario actual
  get currentUser() {
    return this.authService.getCurrentUser();
  }

  // Nombre para mostrar del rol
  get roleName(): string {
    const role = this.currentUser?.role;
    switch (role) {
      case 'AUXILIAR':
        return 'Auxiliar';
      case 'ADMIN':
        return 'Administrador';
      case 'DIRECCION':
        return 'Dirección';
      default:
        return '';
    }
  }

  /**
   * Toggle del sidebar
   */
  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  /**
   * Toggle del menú de usuario
   */
  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  /**
   * Cerrar menú de usuario
   */
  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  /**
   * Navegar a la ruta de inicio según el rol del usuario
   */
  navigateToHome(event: Event): void {
    event.preventDefault();
    const role = this.currentUser?.role;
    let route = '/login';
    if (role === 'AUXILIAR' || role === 'DIRECCION') {
      route = '/asistencia/sesion';
    } else if (role === 'ADMIN') {
      route = '/estudiantes';
    }
    this.router.navigate([route]);
  }

  /**
   * Logout del usuario
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error during logout:', error);
        // Navegar a login incluso si hay error
        this.router.navigate(['/login']);
      },
    });
  }
}
