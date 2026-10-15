import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderApi } from '../../services/api/order-api';
import { OrderGetResponse } from '../../model/order-get-res';

@Component({
  imports: [FormsModule],
  selector: 'app-orders',
  styleUrl: './orders.css',
  templateUrl: './orders.html',
})
export class Orders {
  orderApi = inject(OrderApi);

  // วันนี้ในรูปแบบ YYYY-MM-DD
  today = new Date().toLocaleDateString('en-CA');
  orders = signal<OrderGetResponse[]>([]);

  // ฟอร์มกรอกข้อมูลลูกค้า
  name = signal('');
  phone = signal('');
  address = signal('');
  latitude = signal(16.2462);
  longitude = signal(103.2501);
  quantity = signal(1);

  message = signal('');
  isError = signal(false);

  ngOnInit() {
    this.loadOrders();
  }

  async loadOrders() {
    try {
      const res = await this.orderApi.getOrders(this.today, 'pending');
      this.orders.set(res);
    } catch (e) {
      this.showError(e);
    }
  }

  // ลูกค้าเก่า ใส่เบอร์โทรก็เจอ
  async findCustomer() {
    try {
      const customer = await this.orderApi.getCustomerByPhone(this.phone());
      this.name.set(customer.name);
      this.address.set(customer.address);
      this.latitude.set(Number(customer.latitude));
      this.longitude.set(Number(customer.longitude));
      this.showMessage(`พบลูกค้าเก่า: ${customer.name}`);
    } catch (e) {
      this.showMessage('ไม่พบเบอร์นี้ เป็นลูกค้าใหม่ กรอกข้อมูลให้ครบ');
    }
  }

  async addOrder() {
    const data = {
      name: this.name(),
      phone: this.phone(),
      address: this.address(),
      latitude: this.latitude(),
      longitude: this.longitude(),
      quantity: Number(this.quantity()), // select ส่งค่ามาเป็น string
    };
    try {
      await this.orderApi.addQuickOrder(data);
      this.showMessage('เพิ่มออเดอร์แล้ว');
      this.name.set('');
      this.phone.set('');
      this.address.set('');
      this.quantity.set(1);
      await this.loadOrders();
    } catch (e) {
      this.showError(e);
    }
  }

  async addRandom(amount: HTMLInputElement) {
    try {
      await this.orderApi.addRandomOrders(Number(amount.value));
      this.showMessage(`สร้างออเดอร์ทดสอบ ${amount.value} รายการแล้ว`);
      await this.loadOrders();
    } catch (e) {
      this.showError(e);
    }
  }

  async cancel(id: number) {
    try {
      await this.orderApi.cancelOrder(id);
      this.showMessage(`ยกเลิกออเดอร์ #${id} แล้ว`);
      await this.loadOrders();
    } catch (e) {
      this.showError(e);
    }
  }

  totalBoxes() {
    return this.orders().reduce((sum, o) => sum + o.quantity, 0);
  }

  showMessage(text: string) {
    this.isError.set(false);
    this.message.set(text);
  }

  // backend ตอบ error เป็น { error: "..." }
  showError(e: any) {
    this.isError.set(true);
    this.message.set(e?.error?.error ?? 'เชื่อมต่อ backend ไม่ได้ (เปิด http://localhost:3000 หรือยัง?)');
  }
}
