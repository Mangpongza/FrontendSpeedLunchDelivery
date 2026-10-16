import { Component, inject, input, signal } from '@angular/core';
import { JobApi } from '../../services/api/job-api';
import { RiderRoute } from '../../model/plan-get-res';
import { statusText } from '../../model/status-text';

@Component({
  imports: [],
  selector: 'app-rider-job',
  styleUrl: './rider-job.css',
  templateUrl: './rider-job.html',
})
export class RiderJob {
  jobApi = inject(JobApi);
  // path param /rider/:code (ไม่บังคับ)
  code = input<string>();
  job = signal<RiderRoute | undefined>(undefined);
  message = signal('');
  statusText = statusText;

  ngOnInit() {
    if (this.code()) {
      this.loadJob(this.code()!);
    }
  }

  findJob(codeInput: HTMLInputElement) {
    this.loadJob(codeInput.value.trim().toUpperCase());
  }

  async loadJob(code: string) {
    this.message.set('');
    try {
      this.job.set(await this.jobApi.getJobByCode(code));
    } catch (e: any) {
      this.job.set(undefined);
      this.message.set(e?.status === 404 ? `ไม่พบใบงาน ${code}` : (e?.error?.error ?? 'เชื่อมต่อ backend ไม่ได้'));
    }
  }

  time(t: string) {
    return String(t).slice(0, 5);
  }
}
