import { afterNextRender, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AppData } from '../../service/app-data';
@Component({
  selector: 'app-rider-entry',
  imports: [FormsModule, RouterModule],
  templateUrl: './rider-entry.html',
  styleUrl: './rider-entry.css',
})
export class RiderEntry {
  readonly delivery = inject(AppData);
  private readonly router = inject(Router);
  jobCode = '';
  readonly error = signal('');
  constructor() {
    afterNextRender(() => this.delivery.restoreJobs());
  }
  openJob(): void {
    const job = this.delivery.findJob(this.jobCode);
    if (!job) {
      this.error.set('ไม่พบใบงาน ตรวจสอบรหัส หรือให้ร้านยืนยันแผนจัดส่งก่อน');
      return;
    }
    this.error.set('');
    void this.router.navigate(['/rider/jobs', job.jobCode]);
  }
}
