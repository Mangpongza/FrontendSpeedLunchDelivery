import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoadMap } from '../../components/road-map/road-map';
import { JobApi } from '../../services/api/job-api';
import { RiderRoute, RouteStop } from '../../model/plan-get-res';
import { RiderGetResponse } from '../../model/rider-get-res';
import { statusText } from '../../model/status-text';

@Component({
  imports: [FormsModule, RoadMap],
  selector: 'app-rider-job',
  styleUrl: './rider-job.css',
  templateUrl: './rider-job.html',
})
export class RiderJob {
  jobApi = inject(JobApi);
  code = input<string>();
  riderId = '';
  jobCode = '';
  loginPhone = '';
  loggedRider = signal<Pick<RiderGetResponse, 'id' | 'name' | 'phone'> | undefined>(undefined);
  loginPending = signal(false);
  actionPending = signal(false);
  notice = signal('');
  private token = '';
  private authRequest = 0;
  targetStop = signal<number | null>(null);
  rider = signal<RiderGetResponse | undefined>(undefined);
  job = signal<RiderRoute | undefined>(undefined);
  message = signal('');
  loading = signal(false);
  searched = signal(false);
  statusText = statusText;
  private requestId = 0;

  constructor() {
    effect(() => {
      const code = this.code();
      if (code) void this.loadJob(code);
    });
  }

  async findRider() {
    if (this.loading() || this.actionPending()) return;
    const id = Number(this.riderId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.message.set('กรอกรหัสไรเดอร์เป็นจำนวนเต็มมากกว่า 0');
      return;
    }
    const request = ++this.requestId;
    this.loading.set(true);
    this.message.set('');
    this.job.set(undefined);
    this.targetStop.set(null);
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
    } finally {
      if (request === this.requestId) this.loading.set(false);
    }
  }

  async loadJob(code: string) {
    if (this.actionPending()) return;
    code = code.trim().toUpperCase();
    if (!/^JOB\d+-\d+$/.test(code)) {
      this.message.set('กรอกเลขใบงาน เช่น JOB000001-01');
      return;
    }
    this.jobCode = code;
    const request = ++this.requestId;
    this.loading.set(true);
    this.message.set('');
    this.job.set(undefined);
    this.targetStop.set(null);
    this.rider.set(undefined);
    this.searched.set(false);
    try {
      const job = await this.jobApi.getJobByCode(code);
      if (request === this.requestId) this.job.set(job);
    } catch (e: unknown) {
      if (request === this.requestId) this.message.set(this.errorText(e));
    } finally {
      if (request === this.requestId) this.loading.set(false);
    }
  }

  clear() {
    if (this.actionPending()) return;
    this.requestId++;
    this.loading.set(false);
    this.job.set(undefined);
    this.targetStop.set(null);
    this.rider.set(undefined);
    this.message.set('');
    this.searched.set(false);
    this.riderId = '';
    this.jobCode = '';
  }

  ngOnDestroy() {
    this.requestId++;
    this.authRequest++;
    this.token = '';
  }

  async login() {
    if (this.loginPending() || this.actionPending()) return;
    const phone = this.loginPhone.replace(/[^0-9]/g, '');
    if (!/^0\d{8,9}$/.test(phone)) {
      this.message.set('กรุณากรอกเบอร์โทรไรเดอร์ 9–10 หลัก');
      return;
    }
    const request = ++this.authRequest;
    this.loginPending.set(true);
    this.message.set('');
    this.notice.set('');
    try {
      const session = await this.jobApi.login(phone);
      if (request !== this.authRequest) return;
      this.token = session.token;
      this.loggedRider.set(session.rider);
      this.loginPhone = '';
      this.notice.set('เข้าสู่ระบบแล้ว สามารถเริ่มงานและยืนยันส่งใบงานของตัวเองได้');
    } catch (error) {
      if (request === this.authRequest) this.message.set(this.errorText(error));
    } finally {
      if (request === this.authRequest) this.loginPending.set(false);
    }
  }

  logout() {
    if (this.actionPending()) return;
    this.authRequest++;
    this.token = '';
    this.loggedRider.set(undefined);
    this.loginPending.set(false);
    this.notice.set('');
  }

  ownsJob() {
    return Boolean(this.token && this.loggedRider() &&
      Number(this.loggedRider()!.id) === Number(this.job()?.rider_id));
  }

  async startJob() {
    const job = this.job();
    if (!job || !this.ownsJob() || this.actionPending() || job.status !== 'assigned') return;
    this.actionPending.set(true);
    this.message.set('');
    this.notice.set('');
    const request = this.requestId;
    try {
      const result = await this.jobApi.startJob(job.job_code, this.token);
      if (request !== this.requestId) return;
      this.job.set({ ...job, status: result.status });
      this.notice.set('เริ่มงานแล้ว');
      try {
        const freshJob = await this.jobApi.getMyJob(job.job_code, this.token);
        if (request === this.requestId) this.job.set(freshJob);
      } catch {
        if (request === this.requestId) this.notice.set('เริ่มงานสำเร็จ แต่โหลดรายละเอียดล่าสุดไม่ได้ กรุณาค้นใบงานอีกครั้ง');
      }
    } catch (error) {
      if (request === this.requestId) this.actionError(error);
    } finally {
      this.actionPending.set(false);
    }
  }

  async deliver(stop: RouteStop) {
    const job = this.job();
    if (!job || !this.ownsJob() || this.actionPending() || job.status !== 'in_progress' || stop.status !== 'pending') return;
    if (!confirm(`ยืนยันส่งจุดที่ ${stop.stop_sequence} ให้ ${stop.customer_name} แล้วใช่ไหม?`)) return;
    this.actionPending.set(true);
    this.message.set('');
    this.notice.set('');
    const request = this.requestId;
    try {
      const result = await this.jobApi.deliverStop(job.job_code, stop.stop_sequence, this.token);
      if (request !== this.requestId) return;
      this.job.set(result.job);
      this.notice.set(`บันทึกส่งจุดที่ ${stop.stop_sequence} สำเร็จ`);
    } catch (error) {
      if (request === this.requestId) this.actionError(error);
    } finally {
      this.actionPending.set(false);
    }
  }

  private actionError(error: unknown) {
    if ((error as { status?: number }).status === 401) {
      this.token = '';
      this.loggedRider.set(undefined);
      this.message.set('การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
    } else this.message.set(this.errorText(error));
  }

  private errorText(error: unknown) {
    const e = error as { status?: number; error?: { error?: string } };
    return e.status === 404
      ? 'ไม่พบรหัสไรเดอร์หรือใบงานนี้'
      : (e.error?.error ?? 'โหลดข้อมูลไม่ได้ กรุณาลองใหม่');
  }

  navigation(stop: RouteStop) {
    this.targetStop.set(stop.stop_sequence);
    document
      .getElementById('rider-road-map')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  time(t: string) {
    return String(t).slice(0, 5);
  }
}
