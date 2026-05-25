import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * MenuItem interface
 */
interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

/**
 * SidebarComponent
 *
 * Sidebar de navegación para el área autenticada.
 *
 * Características:
 * - Menú dinámico según rol del usuario
 * - Colapsable (muestra solo iconos cuando está colapsado)
 * - Indicador visual de ruta activa
 * - Responsive: se oculta en móvil y se muestra como overlay
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private authService = inject(AuthService);

  @Input() collapsed = false;
  @Output() itemSelected = new EventEmitter<void>();

  // Menú completo con todos los items
  private allMenuItems: MenuItem[] = [
    {
      label: 'Asistencia',
      icon: 'bi-clipboard-check',
      route: '/asistencia/sesion',
      roles: ['AUXILIAR', 'DIRECCION'],
    },
    {
      label: 'Historial',
      icon: 'bi-clock-history',
      route: '/asistencia/historial',
      roles: ['AUXILIAR', 'ADMIN', 'DIRECCION'],
    },
    {
      label: 'Estudiantes',
      icon: 'bi-people',
      route: '/estudiantes',
      roles: ['ADMIN', 'DIRECCION'],
    },
    {
      label: 'Importación',
      icon: 'bi-file-earmark-arrow-up',
      route: '/estudiantes/importar',
      roles: ['ADMIN'],
    },
    {
      label: 'Landing',
      icon: 'bi-newspaper',
      route: '/admin/landing',
      roles: ['ADMIN', 'DIRECCION'],
    },
    {
      label: 'Exalumnas',
      icon: 'bi-mortarboard',
      route: '/admin/exalumnas',
      roles: ['ADMIN', 'DIRECCION'],
    },
    {
      label: 'Usuarios',
      icon: 'bi-person-gear',
      route: '/admin/usuarios',
      roles: ['ADMIN'],
    },
  ];

  // Menú filtrado según rol del usuario
  menuItems = computed(() => {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return [];
    }

    return this.allMenuItems.filter((item) => item.roles.includes(user.role));
  });

  /**
   * Manejar selección de item del menú
   */
  onItemClick(): void {
    this.itemSelected.emit();
  }
}
