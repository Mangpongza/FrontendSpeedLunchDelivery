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
  public login(phone: string) {
    return lastValueFrom(this.http.post<{
      token: string; expires_at: string; rider: Pick<RiderGetResponse, 'id' | 'name' | 'phone'>;
    }>(`${this.apiEndpoint}/auth/rider-login`, { phone }));
  }

  public getMyJob(code: string, token: string) {
    return lastValueFrom(this.http.get<RiderRoute>(`${this.apiEndpoint}/me/jobs/${encodeURIComponent(code)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }));
  }

  public startJob(code: string, token: string) {
    return lastValueFrom(this.http.patch<{ job_code: string; status: string }>(
      `${this.apiEndpoint}/me/jobs/${encodeURIComponent(code)}/start`, {},
      { headers: { Authorization: `Bearer ${token}` } },
    ));
  }

  public deliverStop(code: string, sequence: number, token: string) {
    return lastValueFrom(this.http.patch<{ job: RiderRoute }>(
      `${this.apiEndpoint}/me/jobs/${encodeURIComponent(code)}/stops/${sequence}/deliver`, {},
      { headers: { Authorization: `Bearer ${token}` } },
    ));
  }
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

  public async getJobByCode(code: string) {
    const url = `${this.apiEndpoint}/jobs/${code}`;
    const response = await lastValueFrom(this.http.get(url));
    return response as RiderRoute;
  }
}
