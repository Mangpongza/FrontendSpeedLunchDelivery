import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { PlanGetResponse, PlanSummary } from '../../model/plan-get-res';
import { PendingGetResponse } from '../../model/pending-get-res';

@Injectable({
  providedIn: 'root',
})
export class RouteApi {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  // ปุ่ม "จัดเส้นทาง" (ส่ง {} = วันนี้ 11:30-12:30)
  public async calculate() {
    const url = `${this.apiEndpoint}/route/calculate`;
    const response = await lastValueFrom(this.http.post(url, {}));
    return response as PlanGetResponse;
  }

  // แผนล่าสุดของวันนี้
  public async getLatestPlan() {
    const url = `${this.apiEndpoint}/route/plans/latest`;
    const response = await lastValueFrom(this.http.get(url));
    return response as PlanGetResponse;
  }

  // ออเดอร์รอส่งวันนี้ + จำนวนไรเดอร์ขั้นต่ำที่ต้องใช้
  public async getPending() {
    const url = `${this.apiEndpoint}/route/pending`;
    const response = await lastValueFrom(this.http.get(url));
    return response as PendingGetResponse;
  }

  // ประวัติแผนล่าสุด (backend ส่งมาไม่เกิน 50 แผน)
  public async getPlans() {
    const url = `${this.apiEndpoint}/route/plans`;
    const response = await lastValueFrom(this.http.get(url));
    return response as PlanSummary[];
  }
}
