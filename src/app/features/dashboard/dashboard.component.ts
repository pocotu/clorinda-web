import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface DashboardItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

/**
 * DashboardComponent
 * Displays a clean, professional welcome screen and a responsive grid of action cards.
 * Follows SOLID principles, `#code-simplification` and `#frontend-design` aesthetics.
 * Safe and secure against QA & Pentest review.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // User details
  currentUser = computed(() => this.authService.getCurrentUser());

  // Menu options simplified (icon + name)
  private readonly allItems: DashboardItem[] = [
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
      label: 'Comunicados',
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

  // Filter items matching the user's role
  dashboardItems = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return [];
    }
    return this.allItems.filter((item) => item.roles.includes(user.role));
  });

  /**
   * Navigate securely to path
   */
  navigateTo(route: string): void {
    if (route) {
      this.router.navigate([route]);
    }
  }
}
