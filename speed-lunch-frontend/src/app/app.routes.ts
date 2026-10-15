import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Orders } from './pages/orders/orders';
import { RoutePlan } from './pages/route-plan/route-plan';
import { RiderJob } from './pages/rider-job/rider-job';
import { Pagenotfound } from './pages/pagenotfound/pagenotfound';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'orders', component: Orders },
  { path: 'route-plan', component: RoutePlan },
  { path: 'rider', component: RiderJob },
  { path: 'rider/:code', component: RiderJob },
  //Wild Card Route for 404 request
  { path: '**', component: Pagenotfound },
];
