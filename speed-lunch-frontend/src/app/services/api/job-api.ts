import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { PlanGetResponse, RiderRoute } from '../../model/plan-get-res';
import { RiderGetResponse } from '../../model/rider-get-res';

@Injectable({
  providedIn: 'root',
})
export class JobApi {
  public async getTodayJobForRider(id: number): Promise<{ rider: RiderGetResponse; job: RiderRoute | undefined }> {
    const rider = await lastValueFrom(this.http.get<RiderGetResponse>(`${this.apiEndpoint}/riders/${id}`));
    let plan: PlanGetResponse;
    try {
      plan = await lastValueFrom(this.http.get<PlanGetResponse>(`${this.apiEndpoint}/route/plans/latest`));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) return { rider, job: undefined };
      throw error;
    }
    const route = plan.routes.find((route) => Number(route.rider_id) === id && route.status !== 'cancelled');
    const job = route ? { ...route, departure_time: plan.departure_time, shop: plan.shop } : undefined;
    return { rider, job };
  }
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  // ไรเดอร์กรอกเลขใบงานเพื่อดูใบงาน
  public async getJobByCode(code: string) {
    const url = `${this.apiEndpoint}/jobs/${code}`;
    const response = await lastValueFrom(this.http.get(url));
    return response as RiderRoute;
  }
}
