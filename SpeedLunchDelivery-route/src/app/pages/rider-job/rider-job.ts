import { afterNextRender, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppData } from '../../service/app-data';
import { TripStop } from '../../model/delivery';
@Component({
  selector: 'app-rider-job',
  imports: [RouterModule, DecimalPipe, DatePipe],
  templateUrl: './rider-job.html',
  styleUrl: './rider-job.css',
})
export class RiderJob {
  readonly delivery = inject(AppData);
  readonly ready = signal(false);
  readonly confirmationId = signal<number | null>(null);
  // รับ :jobCode จาก URL ตามบทเรียน Dynamic path params
  jobCode = input.required<string>();
  readonly job = computed(() => this.delivery.findJob(this.jobCode()));
  readonly deliveredCount = computed(
    () => this.job()?.stops.filter((s) => s.deliveredAt).length ?? 0,
  );
  readonly progress = computed(() =>
    this.job() ? (this.deliveredCount() / this.job()!.stops.length) * 100 : 0,
  );
  constructor() {
    afterNextRender(() => {
      this.delivery.restoreJobs();
      this.ready.set(true);
    });
  }
  mapsLink(stop: TripStop): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${stop.order.customer.latitude},${stop.order.customer.longitude}&travelmode=driving`;
  }
  deliver(orderId: number): void {
    this.delivery.markDelivered(this.jobCode(), orderId);
    this.confirmationId.set(null);
  }
}
