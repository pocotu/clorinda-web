import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { InternalNavbarComponent } from '../internal-navbar/internal-navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

/**
 * MainLayoutComponent
 *
 * Layout principal para el área autenticada de la aplicación.
 * Incluye navbar superior, sidebar colapsable y breadcrumbs.
 *
 * Características:
 * - Navbar superior con logo, nombre del colegio y menú de usuario
 * - Sidebar colapsable con navegación basada en rol
 * - Breadcrumbs para indicar ruta actual
 * - Responsive: sidebar se colapsa en móvil
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    InternalNavbarComponent,
    SidebarComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  // Estado del sidebar (colapsado o expandido)
  sidebarCollapsed = signal(false);

  /**
   * Toggle del estado del sidebar
   */
  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  /**
   * Colapsar sidebar (útil para móvil cuando se selecciona un item)
   */
  collapseSidebar(): void {
    this.sidebarCollapsed.set(true);
  }
}
