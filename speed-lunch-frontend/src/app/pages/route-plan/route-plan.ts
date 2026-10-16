import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouteApi } from '../../services/api/route-api';
import { PlanGetResponse } from '../../model/plan-get-res';

@Component({
  imports: [RouterModule],
  selector: 'app-route-plan',
  styleUrl: './route-plan.css',
  templateUrl: './route-plan.html',
})
export class RoutePlan {
  routeApi = inject(RouteApi);
  plan = signal<PlanGetResponse | undefined>(undefined);
  loading = signal(false);
  message = signal('');

  colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#64748b', '#84cc16', '#f97316'];

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

    if (this.plan() && !confirm('วันนี้จัดเส้นทางไปแล้ว ถ้าจัดใหม่ ใบงานเดิมของไรเดอร์ทุกคนจะถูกยกเลิกและได้เลขใบงานใหม่ ต้องการจัดใหม่ไหม?')) {
      return;
    }
    this.loading.set(true);
    this.message.set('');
    try {
      this.plan.set(await this.routeApi.calculate());
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
