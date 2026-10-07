import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppData } from '../../service/app-data';
import { RouteMap } from '../../components/route-map/route-map';
@Component({
  selector: 'app-route-dashboard',
  imports: [DecimalPipe, RouterModule, RouteMap],
  templateUrl: './route-dashboard.html',
  styleUrl: './route-dashboard.css',
})
export class RouteDashboard {
  readonly delivery = inject(AppData);
  readonly selectedTripId = signal('');
  readonly message = signal('');
  readonly plan = this.delivery.plan;
  readonly summary = computed(() => this.plan()?.summary);
  readonly confirmed = computed(
    () => !!this.plan()?.trips.length && this.plan()!.trips.every((t) => t.status !== 'DRAFT'),
  );
  readonly pendingCount = computed(() => {
    const assigned = new Set(this.delivery.jobs().flatMap((t) => t.stops.map((s) => s.order.id)));
    return this.delivery.orders().filter((o) => o.status === 'PENDING' && !assigned.has(o.id))
      .length;
  });
  readonly selectedTrip = computed(() =>
    this.plan()?.trips.find((t) => t.id === this.selectedTripId()),
  );
  constructor() {
    afterNextRender(() => this.delivery.restoreJobs());
  }
  calculate(): void {
    this.delivery.calculatePlan();
    this.selectedTripId.set('');
    this.message.set(
      this.plan()?.trips.length
        ? 'คำนวณแผนตัวอย่างแล้ว เลือกไรเดอร์เพื่อดูจุดส่ง'
        : 'ไม่มีออเดอร์รอจัดส่งในข้อมูลตัวอย่าง',
    );
  }
  resetDemo(): void {
    this.delivery.resetDemo();
    this.selectedTripId.set('');
    this.message.set('เริ่มข้อมูลตัวอย่าง 24 ออเดอร์ใหม่แล้ว ใบงานจำลองเดิมถูกล้าง');
  }
  confirm(): void {
    const jobs = this.delivery.confirmPlan();
    this.message.set(
      jobs.length
        ? `สร้างใบงาน ${jobs.length} ใบแล้ว เปิดใบงานจากการ์ดไรเดอร์ได้เลย`
        : 'ไม่สามารถยืนยันแผนนี้ได้ กรุณาคำนวณใหม่',
    );
  }
  arrival(minutes: number): string {
    return this.delivery.arrival(minutes);
  }
}
