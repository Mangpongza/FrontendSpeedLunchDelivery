import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { OrderGetResponse } from '../../model/order-get-res';
import { CustomerGetResponse } from '../../model/customer-get-res';

@Injectable({
  providedIn: 'root',
})
export class OrderApi {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  // ออเดอร์ของวันนี้ (ไม่ส่ง date = วันนี้ตามเวลาไทยที่ฝั่ง backend)
  public async getOrders(date: string, status: string) {
    const url = `${this.apiEndpoint}/order`;
    const response = await lastValueFrom(this.http.get(url, { params: { date: date, status: status } }));
    return response as OrderGetResponse[];
  }

  // ลูกค้าเก่า ใส่เบอร์โทรก็เจอ
  public async getCustomerByPhone(phone: string) {
    const url = `${this.apiEndpoint}/customer/phone/${phone}`;
    const response = await lastValueFrom(this.http.get(url));
    return response as CustomerGetResponse;
  }

  // ฟอร์มเจ้าของร้าน: ไม่มีลูกค้าจะสร้างให้ แล้วสร้างออเดอร์
  public async addQuickOrder(order: any) {
    const url = `${this.apiEndpoint}/order/quick`;
    const response = await lastValueFrom(this.http.post(url, order));
    return response;
  }

  // จำลองออเดอร์ทดสอบ
  public async addRandomOrders(amount: number) {
    const url = `${this.apiEndpoint}/order/random`;
    const response = await lastValueFrom(this.http.post(url, { amount: amount }));
    return response;
  }

  // ยกเลิกออเดอร์
  public async cancelOrder(id: number) {
    const url = `${this.apiEndpoint}/order/${id}`;
    const response = await lastValueFrom(this.http.delete(url));
    return response;
  }
}
