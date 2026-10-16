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
  // id ของออเดอร์ที่ติกเลือกไว้ (ยกเลิกทีละหลายรายการ)
  selectedIds = signal<number[]>([]);

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
      // ตัดออเดอร์ที่ไม่อยู่ในรายการแล้วออกจากที่เลือกไว้
      this.selectedIds.set(this.selectedIds().filter((id) => res.some((o) => o.id === id)));
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
    if (!confirm(`ต้องการยกเลิกออเดอร์ #${id} ใช่ไหม?`)) {
      return;
    }
    try {
      await this.orderApi.cancelOrder(id);
      this.showMessage(`ยกเลิกออเดอร์ #${id} แล้ว`);
      await this.loadOrders();
    } catch (e) {
      this.showError(e);
    }
  }

  isSelected(id: number) {
    return this.selectedIds().includes(id);
  }

  toggleSelect(id: number) {
    if (this.isSelected(id)) {
      this.selectedIds.set(this.selectedIds().filter((x) => x !== id));
    } else {
      this.selectedIds.set([...this.selectedIds(), id]);
    }
  }

  isAllSelected() {
    return this.orders().length > 0 && this.selectedIds().length === this.orders().length;
  }

  toggleSelectAll() {
    this.selectedIds.set(this.isAllSelected() ? [] : this.orders().map((o) => o.id));
  }

  // ยกเลิกทุกออเดอร์ที่ติกไว้ (backend ยกเลิกได้ทีละ 1 ออเดอร์)
  async cancelSelected() {
    const ids = this.selectedIds();
    if (ids.length === 0 || !confirm(`ต้องการยกเลิก ${ids.length} ออเดอร์ที่เลือก ใช่ไหม?`)) {
      return;
    }
    const failed: number[] = [];
    for (const id of ids) {
      try {
        await this.orderApi.cancelOrder(id);
      } catch (e) {
        failed.push(id);
      }
    }
    if (failed.length === 0) {
      this.showMessage(`ยกเลิกแล้ว ${ids.length} ออเดอร์`);
    } else {
      this.isError.set(true);
      this.message.set(`ยกเลิกได้ ${ids.length - failed.length} ออเดอร์ ไม่สำเร็จ: #${failed.join(', #')}`);
    }
    this.selectedIds.set(failed);
    await this.loadOrders();
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
    this.message.set(e?.error?.error ?? 'เชื่อมต่อ backend ไม่ได้');
  }
}
