import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { RiderRoute } from '../../model/plan-get-res';

@Injectable({
  providedIn: 'root',
})
export class JobApi {
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
