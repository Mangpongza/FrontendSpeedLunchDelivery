import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouteApi } from '../../services/api/route-api';
import { RiderApi } from '../../services/api/rider-api';
import { PendingGetResponse } from '../../model/pending-get-res';
import { PlanGetResponse, PlanSummary } from '../../model/plan-get-res';
import { RiderGetResponse } from '../../model/rider-get-res';

@Component({
  imports: [RouterModule],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  routeApi = inject(RouteApi);
  riderApi = inject(RiderApi);

  today = new Date().toLocaleDateString('en-CA');
  pending = signal<PendingGetResponse | undefined>(undefined);
  riders = signal<RiderGetResponse[]>([]);
  latestPlan = signal<PlanGetResponse | undefined>(undefined);
  plans = signal<PlanSummary[]>([]);
  message = signal('');

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.message.set('');
    try {
      this.pending.set(await this.routeApi.getPending());
      this.riders.set(await this.riderApi.getRiders());
      // แสดงประวัติ 7 แผนล่าสุด
      this.plans.set((await this.routeApi.getPlans()).slice(0, 7));
    } catch (e: any) {
      this.message.set(e?.error?.error ?? 'เชื่อมต่อ backend ไม่ได้');
    }
    try {
      this.latestPlan.set(await this.routeApi.getLatestPlan());
    } catch (e) {
      // 404 = วันนี้ยังไม่ได้จัดเส้นทาง
      this.latestPlan.set(undefined);
    }
  }

  // ไรเดอร์ที่วันนี้ได้ใบงานแล้ว
  busyRiders() {
    return this.riders().filter((r) => r.jobs_on_date > 0).length;
  }

  time(t: string) {
    return String(t).slice(0, 5);
  }
}
