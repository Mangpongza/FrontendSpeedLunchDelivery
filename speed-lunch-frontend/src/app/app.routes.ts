import { Routes } from '@angular/router';
import { Orders } from './pages/orders/orders';
import { RoutePlan } from './pages/route-plan/route-plan';
import { RiderJob } from './pages/rider-job/rider-job';
import { Pagenotfound } from './pages/pagenotfound/pagenotfound';

export const routes: Routes = [
  { path: '', component: Orders },
  { path: 'route-plan', component: RoutePlan },
  { path: 'rider', component: RiderJob },
  { path: 'rider/:code', component: RiderJob },
  //Wild Card Route for 404 request
  { path: '**', component: Pagenotfound },
];
