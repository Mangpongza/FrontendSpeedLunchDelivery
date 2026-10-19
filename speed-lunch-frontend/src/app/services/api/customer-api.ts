import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { CustomerGetResponse } from '../../model/customer-get-res';

@Injectable({
  providedIn: 'root',
})
export class CustomerApi {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  public async getCustomers() {
    const url = `${this.apiEndpoint}/customer`;
    const response = await lastValueFrom(this.http.get(url));
    return response as CustomerGetResponse[];
  }

  public async getCustomerById(id: number) {
    const url = `${this.apiEndpoint}/customer/${id}`;
    const response = await lastValueFrom(this.http.get(url));
    return response as CustomerGetResponse;
  }

  public async getCustomerOrders(id: number) {
    const url = `${this.apiEndpoint}/customer/${id}/orders`;
    const response = await lastValueFrom(this.http.get(url));
    return response as any[];
  }

  public async searchCustomers(name?: string, phone?: string) {
    const url = `${this.apiEndpoint}/customer/search/fields`;
    const params: Record<string, string> = {};
    if (name) params['name'] = name;
    if (phone) params['phone'] = phone;
    const response = await lastValueFrom(this.http.get(url, { params }));
    return response as CustomerGetResponse[];
  }

  public async getNearbyCustomers(latitude: number, longitude: number, radiusKm: number = 1) {
    const url = `${this.apiEndpoint}/customer/nearby`;
    const response = await lastValueFrom(
      this.http.get(url, {
        params: {
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          radius_km: radiusKm.toString(),
        },
      })
    );
    return response as CustomerGetResponse[];
  }

  public async createCustomer(customer: {
    name: string;
    phone: string;
    address: string;
    latitude: number;
    longitude: number;
  }) {
    const url = `${this.apiEndpoint}/customer`;
    const response = await lastValueFrom(this.http.post(url, customer));
    return response;
  }

  public async updateCustomer(
    id: number,
    customer: {
      name: string;
      phone: string;
      address: string;
      latitude: number;
      longitude: number;
    }
  ) {
    const url = `${this.apiEndpoint}/customer/${id}`;
    const response = await lastValueFrom(this.http.put(url, customer));
    return response;
  }

  public async deleteCustomer(id: number) {
    const url = `${this.apiEndpoint}/customer/${id}`;
    const response = await lastValueFrom(this.http.delete(url));
    return response;
  }
}
