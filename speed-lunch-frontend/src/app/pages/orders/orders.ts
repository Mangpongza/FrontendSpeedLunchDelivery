import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomerApi } from '../../services/api/customer-api';
import { CustomerGetResponse } from '../../model/customer-get-res';
import { OrderApi } from '../../services/api/order-api';
import { OrderGetResponse } from '../../model/order-get-res';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-orders',
  styleUrl: './orders.css',
  templateUrl: './orders.html',
})
export class Orders {
  orderApi = inject(OrderApi);

  today = new Date().toLocaleDateString('en-CA');
  orders = signal<OrderGetResponse[]>([]);

  selectedIds = signal<number[]>([]);
  editingOrderId = signal<number | null>(null);
  editingQuantity = signal(1);
  updatingQuantity = signal(false);
  cancellingOrderId = signal<number | null>(null);
  replanNeeded = signal(false);

  customerApi = inject(CustomerApi);
  customers = signal<CustomerGetResponse[]>([]);
  customerId = signal<number | null>(null);
  keyword = signal('');
  saving = signal(false);
  loadingCustomers = signal(false);
  selectedCustomer = computed(() =>
    this.customers().find((c) => c.id === Number(this.customerId())),
  );
  filteredCustomers = computed(() => {
    const keyword = this.keyword().trim().toLowerCase();
    return this.customers().filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(keyword));
  });
  quantity = signal(1);

  message = signal('');
  isError = signal(false);

  ngOnInit() {
    this.loadOrders();
    this.loadCustomers();
  }

  async loadOrders() {
    try {
      const res = await this.orderApi.getOrders(this.today, 'pending');
      this.orders.set(res);
      this.selectedIds.set(this.selectedIds().filter((id) => res.some((o) => o.id === id)));
      if (!res.some((order) => order.id === this.editingOrderId())) this.cancelEdit();
    } catch (e) {
      this.showError(e);
    }
  }

  async loadCustomers() {
    this.loadingCustomers.set(true);
    try {
      this.customers.set(await this.customerApi.getCustomers());
    } catch (e) {
      this.showError(e);
    } finally {
      this.loadingCustomers.set(false);
    }
  }

  async addOrder() {
    if (this.saving()) return;
    const customer = this.selectedCustomer();
    const quantity = Number(this.quantity());
    if (!customer) {
      this.showError({ error: { error: 'กรุณาเลือกลูกค้าก่อนบันทึกออเดอร์' } });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 3) {
      this.showError({ error: { error: 'จำนวนกล่องต้องอยู่ระหว่าง 1–3 กล่อง' } });
      return;
    }
    this.saving.set(true);
    try {
      await this.orderApi.createOrder(customer.id, quantity, this.today);
      this.showMessage(`เพิ่มออเดอร์ของ ${customer.name} แล้ว`);
      this.customerId.set(null);
      this.quantity.set(1);
      await this.loadOrders();
    } catch (e) {
      this.showError(e);
    } finally {
      this.saving.set(false);
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
    if (this.updatingQuantity() || this.cancellingOrderId() !== null) return;
    if (!confirm(`ต้องการยกเลิกออเดอร์ #${id} ใช่ไหม?`)) {
      return;
    }
    this.cancellingOrderId.set(id);
    try {
      await this.orderApi.cancelOrder(id);
      this.showMessage(`ยกเลิกออเดอร์ #${id} แล้ว`);
      await this.loadOrders();
    } catch (e) {
      this.showError(e);
    } finally {
      this.cancellingOrderId.set(null);
    }
  }

  editQuantity(order: OrderGetResponse) {
    if (this.updatingQuantity() || this.cancellingOrderId() !== null) return;
    this.editingOrderId.set(order.id);
    this.editingQuantity.set(Number(order.quantity));
  }

  cancelEdit() {
    if (this.updatingQuantity()) return;
    this.editingOrderId.set(null);
    this.editingQuantity.set(1);
  }

  async saveQuantity(order: OrderGetResponse) {
    if (
      this.updatingQuantity() ||
      this.cancellingOrderId() !== null ||
      this.editingOrderId() !== order.id
    )
      return;
    const quantity = Number(this.editingQuantity());
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 3) {
      this.showError({ error: { error: 'จำนวนกล่องต้องอยู่ระหว่าง 1–3 กล่อง' } });
      return;
    }
    if (quantity === Number(order.quantity)) {
      this.cancelEdit();
      return;
    }
    this.updatingQuantity.set(true);
    try {
      const result = await this.orderApi.updateQuantity(order.id, quantity);
      this.editingOrderId.set(null);
      this.replanNeeded.set(this.replanNeeded() || result.needs_replan);
      this.showMessage(`แก้ไขออเดอร์ #${order.id} เป็น ${quantity} กล่องแล้ว`);
      await this.loadOrders();
    } catch (error) {
      this.showError(error);
    } finally {
      this.updatingQuantity.set(false);
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
      this.message.set(
        `ยกเลิกได้ ${ids.length - failed.length} ออเดอร์ ไม่สำเร็จ: #${failed.join(', #')}`,
      );
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

  showError(e: any) {
    this.isError.set(true);
    this.message.set(e?.error?.error ?? 'เชื่อมต่อ backend ไม่ได้');
  }
}
