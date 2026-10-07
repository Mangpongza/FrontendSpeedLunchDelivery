import { Routes } from '@angular/router';
import { RouteDashboard } from './pages/route-dashboard/route-dashboard';
import { RiderEntry } from './pages/rider-entry/rider-entry';
import { RiderJob } from './pages/rider-job/rider-job';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'routes' },
  { path: 'routes', component: RouteDashboard, title: 'จัดเส้นทาง | SpeedLunchDelivery' },
  { path: 'rider', component: RiderEntry, title: 'เปิดใบงาน | SpeedLunchDelivery' },
  { path: 'rider/jobs/:jobCode', component: RiderJob, title: 'ใบงานไรเดอร์ | SpeedLunchDelivery' },
  { path: '**', redirectTo: 'routes' },
];
