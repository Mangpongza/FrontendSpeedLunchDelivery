import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JobApi } from '../../services/api/job-api';
import { RiderRoute, RouteStop } from '../../model/plan-get-res';
import { RiderGetResponse } from '../../model/rider-get-res';
import { statusText } from '../../model/status-text';

@Component({
  imports: [FormsModule],
  selector: 'app-rider-job',
  styleUrl: './rider-job.css',
  templateUrl: './rider-job.html',
})
export class RiderJob {
  jobApi = inject(JobApi);
  code = input<string>();
  riderId = '';
  rider = signal<RiderGetResponse | undefined>(undefined);
  job = signal<RiderRoute | undefined>(undefined);
  message = signal('');
  loading = signal(false);
  searched = signal(false);
  statusText = statusText;
  private requestId = 0;

  constructor() {
    effect(() => { const code = this.code(); if (code) void this.loadJob(code); });
  }

  async findRider() {
    if (this.loading()) return;
    const id = Number(this.riderId);
    if (!Number.isSafeInteger(id) || id <= 0) { this.message.set('กรอกรหัสไรเดอร์เป็นจำนวนเต็มมากกว่า 0'); return; }
    const request = ++this.requestId;
    this.loading.set(true);
    this.message.set('');
    this.job.set(undefined);
    this.rider.set(undefined);
    this.searched.set(false);
    try {
      const result = await this.jobApi.getTodayJobForRider(id);
      if (request !== this.requestId) return;
      this.rider.set(result.rider);
      this.job.set(result.job);
      this.searched.set(true);
    } catch (e: unknown) {
      if (request === this.requestId) this.message.set(this.errorText(e));
    } finally { if (request === this.requestId) this.loading.set(false); }
  }

  async loadJob(code: string) {
    const request = ++this.requestId;
    this.loading.set(true);
    this.message.set('');
    this.job.set(undefined);
    try {
      const job = await this.jobApi.getJobByCode(code);
      if (request === this.requestId) this.job.set(job);
    } catch (e: unknown) {
      if (request === this.requestId) this.message.set(this.errorText(e));
    } finally { if (request === this.requestId) this.loading.set(false); }
  }

  clear() {
    this.requestId++;
    this.loading.set(false);
    this.job.set(undefined);
    this.rider.set(undefined);
    this.message.set('');
    this.searched.set(false);
    this.riderId = '';
  }

  private errorText(error: unknown) {
    const e = error as { status?: number; error?: { error?: string } };
    return e.status === 404 ? 'ไม่พบรหัสไรเดอร์หรือใบงานนี้' : (e.error?.error ?? 'โหลดข้อมูลไม่ได้ กรุณาลองใหม่');
  }

  navigation(stop: RouteStop) {
    return `https://www.google.com/maps/dir/?api=1&destination=${Number(stop.latitude)},${Number(stop.longitude)}&travelmode=driving`;
  }

  time(t: string) { return String(t).slice(0, 5); }
}
