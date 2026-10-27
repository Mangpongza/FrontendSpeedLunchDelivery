import { Component, computed, effect, inject, input, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoadMap } from '../../components/road-map/road-map';
import { JobApi } from '../../services/api/job-api';
import { RiderApi } from '../../services/api/rider-api';
import { RiderRoute, RouteStop } from '../../model/plan-get-res';
import { RiderGetResponse } from '../../model/rider-get-res';
import { statusText } from '../../model/status-text';

@Component({
  imports: [FormsModule, RoadMap],
  selector: 'app-rider-job',
  styleUrl: './rider-job.css',
  templateUrl: './rider-job.html',
})
export class RiderJob implements OnInit, OnDestroy {
  jobApi = inject(JobApi);
  riderApi = inject(RiderApi);
  code = input<string>();
  urlRiderId = input('', { alias: 'riderId' });

  riders = signal<RiderGetResponse[]>([]);
  selectedRiderId = signal('');
  riderId = '';
  jobCode = '';

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

  totalStops = computed(() => this.job()?.stops.length ?? 0);
  deliveredStops = computed(() => this.job()?.stops.filter((s) => s.status === 'delivered').length ?? 0);
  progressPercent = computed(() => {
    const total = this.totalStops();
    return total > 0 ? Math.round((this.deliveredStops() / total) * 100) : 0;
  });
  isAllDelivered = computed(() => this.totalStops() > 0 && this.deliveredStops() === this.totalStops());

  constructor() {
    effect(() => {
      const code = this.code();
      if (code) void this.loadJob(code);
    });
    effect(() => {
      const rid = this.urlRiderId();
      if (rid) {
        this.riderId = rid;
        this.selectedRiderId.set(rid);
        void this.findRider();
      }
    });
  }

  async ngOnInit() {
    await this.loadRiderList();
  }

  async loadRiderList() {
    try {
      const list = await this.riderApi.getRiders();
      this.riders.set(list);
    } catch {
      this.riders.set([]);
    }
  }

  async onSelectRider(idStr: string) {
    if (!idStr) {
      this.clear();
      return;
    }
    this.riderId = idStr;
    await this.findRider();
  }

  async findRider() {
    if (this.loading() || this.actionPending()) return;
    const id = Number(this.riderId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.message.set('กรุณาเลือกหรือกรอกรหัสไรเดอร์เป็นตัวเลข');
      return;
    }
    this.selectedRiderId.set(String(id));
    const request = ++this.requestId;
    this.loading.set(true);
    this.message.set('');
    this.notice.set('');
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

      if (result.rider?.phone) {
        await this.autoLogin(result.rider.phone);
      }
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
    this.notice.set('');
    this.job.set(undefined);
    this.targetStop.set(null);
    this.rider.set(undefined);
    this.searched.set(false);

    try {
      const job = await this.jobApi.getJobByCode(code);
      if (request === this.requestId) {
        this.job.set(job);
        this.selectedRiderId.set(String(job.rider_id));
        this.riderId = String(job.rider_id);

        const phone = (job as unknown as { rider_phone?: string }).rider_phone;
        if (phone) {
          await this.autoLogin(phone);
        } else {
          const match = this.riders().find((r) => Number(r.id) === Number(job.rider_id));
          if (match?.phone) await this.autoLogin(match.phone);
        }
      }
    } catch (e: unknown) {
      if (request === this.requestId) this.message.set(this.errorText(e));
    } finally {
      if (request === this.requestId) this.loading.set(false);
    }
  }

  private async autoLogin(phone: string) {
    const raw = phone.replace(/[^0-9]/g, '');
    if (!raw) return;
    try {
      const session = await this.jobApi.login(raw);
      this.token = session.token;
      this.loggedRider.set(session.rider);
    } catch {
      this.token = '';
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
    this.notice.set('');
    this.searched.set(false);
    this.riderId = '';
    this.selectedRiderId.set('');
    this.jobCode = '';
  }

  ngOnDestroy() {
    this.requestId++;
    this.authRequest++;
    this.token = '';
  }

  ownsJob() {
    const j = this.job();
    if (!j) return false;
    if (this.token && this.loggedRider() && Number(this.loggedRider()!.id) === Number(j.rider_id)) {
      return true;
    }
    return Boolean(this.token);
  }

  private async ensureAuth(): Promise<boolean> {
    if (this.token && this.ownsJob()) return true;
    const j = this.job();
    if (!j) return false;
    const phone = (j as unknown as { rider_phone?: string }).rider_phone ||
      this.rider()?.phone ||
      this.riders().find((r) => Number(r.id) === Number(j.rider_id))?.phone;
    if (!phone) {
      this.message.set('ไม่พบเบอร์โทรไรเดอร์ กรุณาเลือกไรเดอร์ใหม่อีกครั้ง');
      return false;
    }
    try {
      const session = await this.jobApi.login(phone.replace(/[^0-9]/g, ''));
      this.token = session.token;
      this.loggedRider.set(session.rider);
      return true;
    } catch (err) {
      this.actionError(err);
      return false;
    }
  }

  async startJob() {
    const job = this.job();
    if (!job || this.actionPending() || job.status !== 'assigned') return;
    this.actionPending.set(true);
    this.message.set('');
    this.notice.set('');
    try {
      const authed = await this.ensureAuth();
      if (!authed) return;
      const result = await this.jobApi.startJob(job.job_code, this.token);
      this.job.set({ ...job, status: result.status });
      this.notice.set('เริ่มออกเดินทางส่งของแล้ว');
      try {
        const fresh = await this.jobApi.getMyJob(job.job_code, this.token);
        this.job.set(fresh);
      } catch {
        // pass
      }
    } catch (error) {
      this.actionError(error);
    } finally {
      this.actionPending.set(false);
    }
  }

  async deliver(stop: RouteStop) {
    const job = this.job();
    if (!job || this.actionPending() || stop.status !== 'pending') return;
    if (!confirm(`ยืนยันส่งจุดที่ ${stop.stop_sequence} ให้ ${stop.customer_name} เรียบร้อยแล้ว?`)) {
      return;
    }

    this.actionPending.set(true);
    this.message.set('');
    this.notice.set('');

    try {
      const authed = await this.ensureAuth();
      if (!authed) return;

      if (job.status === 'assigned') {
        try {
          await this.jobApi.startJob(job.job_code, this.token);
          job.status = 'in_progress';
        } catch {
          // pass
        }
      }

      const result = await this.jobApi.deliverStop(job.job_code, stop.stop_sequence, this.token);
      this.job.set(result.job);
      this.notice.set(`บันทึกส่งจุดที่ ${stop.stop_sequence} ให้ ${stop.customer_name} เรียบร้อยแล้ว`);
    } catch (error) {
      this.actionError(error);
    } finally {
      this.actionPending.set(false);
    }
  }

  private actionError(error: unknown) {
    const e = error as { status?: number; error?: { error?: string } };
    if (e.status === 401) {
      this.token = '';
      this.loggedRider.set(undefined);
      this.message.set('เซสชันไรเดอร์หมดอายุ กรุณาเลือกไรเดอร์ใหม่อีกครั้ง');
    } else {
      this.message.set(e.error?.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
    }
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

  time(t: string | undefined) {
    if (!t) return '-';
    if (t.includes('T') || t.includes(' ')) {
      const parts = t.split(/T|\s/);
      if (parts[1]) return parts[1].slice(0, 5);
    }
    return String(t).slice(0, 5);
  }
}
