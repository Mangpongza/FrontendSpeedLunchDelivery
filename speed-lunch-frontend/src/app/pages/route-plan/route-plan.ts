import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouteApi } from '../../services/api/route-api';
import { PlanGetResponse, RiderRoute } from '../../model/plan-get-res';

import { RoadMap } from '../../components/road-map/road-map';
import { PlanOverviewMap } from '../../components/plan-overview-map/plan-overview-map';

@Component({
  imports: [RouterModule, RoadMap, PlanOverviewMap],
  selector: 'app-route-plan',
  styleUrl: './route-plan.css',
  templateUrl: './route-plan.html',
})
export class RoutePlan {
  routeApi = inject(RouteApi);
  selectedRoute = signal<RiderRoute | undefined>(undefined);

  openMap(route: RiderRoute) {
    this.selectedRoute.set({
      ...route,
      shop: this.plan()?.shop,
      departure_time: this.plan()!.departure_time,
    });
    setTimeout(() =>
      document
        .getElementById('plan-road-map')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }
  plan = signal<PlanGetResponse | undefined>(undefined);
  loading = signal(false);
  message = signal('');

  colors = [
    '#ef4444',
    '#22c55e',
    '#3b82f6',
    '#f59e0b',
    '#a855f7',
    '#ec4899',
    '#14b8a6',
    '#64748b',
    '#84cc16',
    '#f97316',
  ];

  ngOnInit() {
    this.loadLatest();
  }

  async loadLatest() {
    try {
      this.plan.set(await this.routeApi.getLatestPlan());
    } catch (e) {
      this.plan.set(undefined);
    }
  }

  async calculate() {
    if (
      this.plan() &&
      !confirm(
        'วันนี้จัดเส้นทางไปแล้ว ถ้าจัดใหม่ ใบงานเดิมของไรเดอร์ทุกคนจะถูกยกเลิกและได้เลขใบงานใหม่ ต้องการจัดใหม่ไหม?',
      )
    ) {
      return;
    }
    this.loading.set(true);
    this.message.set('');
    try {
      this.plan.set(await this.routeApi.calculate());
      this.selectedRoute.set(undefined);
    } catch (e: any) {
      this.message.set(e?.error?.error ?? 'เชื่อมต่อ backend ไม่ได้');
    }
    this.loading.set(false);
  }

  color(riderNumber: number) {
    return this.colors[(riderNumber - 1) % this.colors.length];
  }

  time(t: string) {
    return String(t).slice(0, 5);
  }
}
