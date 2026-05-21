import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // En desarrollo forzamos renderizado en cliente para evitar bloqueos
  // por tareas pendientes de SSR (HTTP/autenticacion) y APIs de navegador.
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
