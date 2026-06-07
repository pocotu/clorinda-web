import { Component, inject, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
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
  private usersService = inject(UsersService);
  private router = inject(Router);

  @Output() toggleSidebar = new EventEmitter<void>();

  // Estado del dropdown de usuario
  userMenuOpen = false;

  // Estado del modal de cambio de correo (solo para admin)
  isModalOpen = signal(false);
  emailValue = signal('');
  emailError = signal<string | null>(null);
  isSaving = signal(false);
  modalErrorMessage = signal<string | null>(null);
  modalSuccessMessage = signal<string | null>(null);

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

  /**
   * Abrir modal para configurar el correo electrónico de Google
   */
  openChangeEmailModal(): void {
    this.closeUserMenu();
    this.modalErrorMessage.set(null);
    this.modalSuccessMessage.set(null);
    this.emailError.set(null);
    this.isSaving.set(true);
    this.isModalOpen.set(true);

    // Fetch the list of users to find the current user's email
    this.usersService.getUsers().subscribe({
      next: (res) => {
        this.isSaving.set(false);
        const me = res.data.find((u) => u.id === this.currentUser?.id);
        this.emailValue.set(me?.email || '');
      },
      error: (error) => {
        this.isSaving.set(false);
        this.modalErrorMessage.set('Error al cargar la información actual del usuario');
        console.error(error);
      },
    });
  }

  /**
   * Cerrar modal de cambio de correo
   */
  closeChangeEmailModal(): void {
    if (this.isSaving()) {
      return;
    }
    this.isModalOpen.set(false);
  }

  /**
   * Manejar input de correo y validar formato
   */
  onEmailInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.emailValue.set(value);

    if (!value) {
      this.emailError.set('El correo es requerido');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      this.emailError.set('Formato de correo electrónico inválido');
    } else {
      this.emailError.set(null);
    }
  }

  /**
   * Guardar el correo electrónico del administrador en el servidor
   */
  saveEmail(): void {
    const email = this.emailValue().trim();
    if (!email) {
      this.emailError.set('El correo es requerido');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.emailError.set('Formato de correo electrónico inválido');
      return;
    }

    const userId = this.currentUser?.id;
    if (!userId) {
      return;
    }

    this.isSaving.set(true);
    this.modalErrorMessage.set(null);
    this.modalSuccessMessage.set(null);

    this.usersService.updateEmail(userId, email).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.modalSuccessMessage.set('Correo electrónico de Google guardado correctamente');
        setTimeout(() => {
          this.closeChangeEmailModal();
        }, 1500);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.modalErrorMessage.set(err.message || 'Error al actualizar el correo electrónico');
      },
    });
  }
}
