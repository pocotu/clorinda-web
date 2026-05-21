import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router';
import { filter, map, distinctUntilChanged } from 'rxjs/operators';

/**
 * Breadcrumb interface
 */
interface Breadcrumb {
  label: string;
  url: string;
}

/**
 * BreadcrumbComponent
 *
 * Componente de breadcrumbs (migas de pan) que muestra la ruta actual.
 * Se actualiza automáticamente al navegar.
 *
 * Características:
 * - Actualización automática basada en la ruta
 * - Links navegables a rutas anteriores
 * - Mapeo de rutas a etiquetas legibles
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css',
})
export class BreadcrumbComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  breadcrumbs: Breadcrumb[] = [];

  // Mapeo de rutas a etiquetas legibles
  private routeLabels: { [key: string]: string } = {
    asistencia: 'Asistencia',
    sesion: 'Sesión Actual',
    historial: 'Historial',
    estudiantes: 'Estudiantes',
    importar: 'Importación',
    admin: 'Administración',
    landing: 'Landing',
    new: 'Nuevo',
    edit: 'Editar',
  };

  ngOnInit(): void {
    // Initialize after router is ready — avoids crash when child.snapshot
    // is undefined during construction (before first navigation completes).
    this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.createBreadcrumbs(this.activatedRoute.root)),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe(() => {
        this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
      });
  }

  /**
   * Crear breadcrumbs desde la ruta activada
   */
  private createBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Breadcrumb[] = []
  ): Breadcrumb[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      if (!child.snapshot) {
        return this.createBreadcrumbs(child, url, breadcrumbs);
      }
      const routeURL: string = child.snapshot.url.map((segment) => segment.path).join('/');

      if (routeURL !== '') {
        url += `/${routeURL}`;

        // Obtener etiqueta de la ruta
        const label = this.getRouteLabel(routeURL);

        // Solo agregar si tiene etiqueta
        if (label) {
          breadcrumbs.push({
            label,
            url,
          });
        }
      }

      return this.createBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  /**
   * Obtener etiqueta legible para una ruta
   */
  private getRouteLabel(route: string): string {
    // Si es un ID (UUID o número), no mostrar
    if (this.isId(route)) {
      return '';
    }

    return this.routeLabels[route] || this.capitalize(route);
  }

  /**
   * Verificar si un segmento es un ID
   */
  private isId(segment: string): boolean {
    // UUID pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Número pattern
    const numberPattern = /^\d+$/;

    return uuidPattern.test(segment) || numberPattern.test(segment);
  }

  /**
   * Capitalizar primera letra
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
