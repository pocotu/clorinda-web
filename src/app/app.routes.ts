import { Routes } from '@angular/router';
import { authGuard, authGuardChild } from './core/guards';

export const routes: Routes = [
  // Rutas públicas (con PublicLayout)
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/public-layout/public-layout').then(
        (m) => m.PublicLayoutComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'unauthorized',
        loadComponent: () =>
          import('./features/auth/unauthorized/unauthorized.component').then(
            (m) => m.UnauthorizedComponent
          ),
      },
      {
        path: 'nosotros',
        loadComponent: () =>
          import('./features/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
      },
      {
        path: 'organizacion-institucional',
        loadComponent: () =>
          import('./features/organizacion-institucional/organizacion-institucional.component').then(
            (m) => m.OrganizacionInstitucionalComponent
          ),
      },
      {
        path: 'logros',
        loadComponent: () =>
          import('./features/logros/logros.component').then((m) => m.LogrosComponent),
      },
      {
        path: 'comites-gestion',
        loadComponent: () =>
          import('./features/comites-gestion/comites-gestion.component').then(
            (m) => m.ComitesGestionComponent
          ),
      },
      {
        path: 'consulta-asistencia',
        loadComponent: () =>
          import('./features/public/public-attendance-query/public-attendance-query.component').then(
            (m) => m.PublicAttendanceQueryComponent
          ),
      },
    ],
  },

  // Rutas autenticadas (con MainLayout)
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'asistencia',
        canActivateChild: [authGuardChild],
        data: { roles: ['AUXILIAR', 'ADMIN', 'DIRECCION'] },
        children: [
          {
            path: 'sesion',
            loadComponent: () =>
              import('./features/attendance/attendance-session/attendance-session.component').then(
                (m) => m.AttendanceSessionComponent
              ),
            data: { roles: ['AUXILIAR', 'DIRECCION'] },
          },
          {
            path: 'historial',
            loadComponent: () =>
              import('./features/attendance/attendance-history/attendance-history.component').then(
                (m) => m.AttendanceHistoryComponent
              ),
            data: { roles: ['AUXILIAR', 'ADMIN', 'DIRECCION'] },
          },
          {
            path: '',
            redirectTo: 'sesion',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'estudiantes',
        data: { roles: ['ADMIN', 'DIRECCION'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/students/student-list/student-list.component').then(
                (m) => m.StudentListComponent
              ),
          },
          {
            path: 'importar',
            loadComponent: () =>
              import('./features/students/import-wizard/import-wizard.component').then(
                (m) => m.ImportWizardComponent
              ),
            data: { roles: ['ADMIN'] },
          },
        ],
      },
      {
        path: 'admin/landing',
        data: { roles: ['ADMIN', 'DIRECCION'] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/landing/landing-post-list/landing-post-list.component').then(
                (m) => m.LandingPostListComponent
              ),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./features/landing/landing-post-editor/landing-post-editor.component').then(
                (m) => m.LandingPostEditorComponent
              ),
            data: { roles: ['ADMIN', 'DIRECCION'] },
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./features/landing/landing-post-editor/landing-post-editor.component').then(
                (m) => m.LandingPostEditorComponent
              ),
            data: { roles: ['ADMIN', 'DIRECCION'] },
          },
        ],
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];
