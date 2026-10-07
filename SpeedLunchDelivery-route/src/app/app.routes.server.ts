import { RenderMode, ServerRoute } from '@angular/ssr';
export const serverRoutes: ServerRoute[] = [
  { path: 'rider/jobs/:jobCode', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
