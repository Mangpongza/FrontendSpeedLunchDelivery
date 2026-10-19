import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CustomerApi } from '../../services/api/customer-api';
import { CustomerGetResponse } from '../../model/customer-get-res';

@Component({
  imports: [FormsModule, DecimalPipe],
  selector: 'app-customers',
  styleUrl: './customers.css',
  templateUrl: './customers.html',
})
export class Customers {
  customerApi = inject(CustomerApi);

  customers = signal<CustomerGetResponse[]>([]);
  isLoading = signal(false);

  // Form Signals
  isEditing = signal(false);
  editingId = signal<number | null>(null);
  name = signal('');
  phone = signal('');
  address = signal('');
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);

  // Search Signals
  searchKeyword = signal('');
  nearbyLat = signal<number>(16.2462);
  nearbyLng = signal<number>(103.2501);
  nearbyRadius = signal<number>(1);
  activeFilter = signal<'all' | 'search' | 'nearby'>('all');

  // Customer Orders Modal
  selectedCustomer = signal<CustomerGetResponse | null>(null);
  customerOrders = signal<any[]>([]);
  isModalOpen = signal(false);

  message = signal('');
  isError = signal(false);

  ngOnInit() {
    this.loadCustomers();
  }

  async loadCustomers() {
    this.isLoading.set(true);
    try {
      const res = await this.customerApi.getCustomers();
      this.customers.set(res);
      this.activeFilter.set('all');
    } catch (e) {
      this.showError(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async searchByNameOrPhone() {
    const kw = this.searchKeyword().trim();
    if (!kw) {
      return this.loadCustomers();
    }
    this.isLoading.set(true);
    try {
      // ค้นหาทั้งในช่องชื่อและเบอร์
      const res = await this.customerApi.searchCustomers(kw, kw);
      this.customers.set(res);
      this.activeFilter.set('search');
      this.showMessage(`พบผลการค้นหา "${kw}": ${res.length} คน`);
    } catch (e) {
      this.showError(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async searchNearby(radius: number = 1) {
    if (!this.nearbyLat() || !this.nearbyLng()) {
      this.isError.set(true);
      this.message.set('กรุณาระบุพิกัดละติจูดและลองจิจูดสำหรับค้นหารัศมี');
      return;
    }
    this.nearbyRadius.set(radius);
    this.isLoading.set(true);
    try {
      const res = await this.customerApi.getNearbyCustomers(this.nearbyLat(), this.nearbyLng(), radius);
      this.customers.set(res);
      this.activeFilter.set('nearby');
      this.showMessage(`พบลูกค้าในระยะ ${radius} กม. จากพิกัดที่กำหนด: ${res.length} คน`);
    } catch (e) {
      this.showError(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  resetFilter() {
    this.searchKeyword.set('');
    this.loadCustomers();
  }

  fillMsuCoordinates() {
    this.latitude.set(16.2462);
    this.longitude.set(103.2501);
  }

  fillNearbyMsu() {
    this.nearbyLat.set(16.2462);
    this.nearbyLng.set(103.2501);
  }

  startEdit(c: CustomerGetResponse) {
    this.isEditing.set(true);
    this.editingId.set(c.id);
    this.name.set(c.name);
    this.phone.set(c.phone);
    this.address.set(c.address);
    this.latitude.set(Number(c.latitude));
    this.longitude.set(Number(c.longitude));
    this.showMessage(`กำลังแก้ไขข้อมูล: ${c.name} (#${c.id})`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.name.set('');
    this.phone.set('');
    this.address.set('');
    this.latitude.set(null);
    this.longitude.set(null);
    this.message.set('');
  }

  async saveCustomer() {
    if (!this.name().trim() || !this.phone().trim()) {
      this.isError.set(true);
      this.message.set('กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์');
      return;
    }
    if (this.latitude() === null || this.longitude() === null) {
      this.isError.set(true);
      this.message.set('กรุณากรอกพิกัดละติจูดและลองจิจูด');
      return;
    }

    const data = {
      name: this.name().trim(),
      phone: this.phone().trim(),
      address: this.address().trim(),
      latitude: Number(this.latitude()),
      longitude: Number(this.longitude()),
    };

    try {
      if (this.isEditing() && this.editingId()) {
        await this.customerApi.updateCustomer(this.editingId()!, data);
        this.showMessage(`แก้ไขข้อมูลลูกค้า #${this.editingId()} สำเร็จแล้ว`);
      } else {
        await this.customerApi.createCustomer(data);
        this.showMessage('เพิ่มลูกค้าใหม่สำเร็จแล้ว');
      }
      this.cancelEdit();
      await this.loadCustomers();
    } catch (e) {
      this.showError(e);
    }
  }

  async deleteCustomer(c: CustomerGetResponse) {
    if (!confirm(`คุณต้องการลบข้อมูลลูกค้า "${c.name}" (#${c.id}) ใช่หรือไม่?`)) {
      return;
    }
    try {
      await this.customerApi.deleteCustomer(c.id);
      this.showMessage(`ลบข้อมูลลูกค้า "${c.name}" เรียบร้อยแล้ว`);
      if (this.editingId() === c.id) {
        this.cancelEdit();
      }
      await this.loadCustomers();
    } catch (e) {
      this.showError(e);
    }
  }

  async viewOrders(c: CustomerGetResponse) {
    this.selectedCustomer.set(c);
    this.isModalOpen.set(true);
    try {
      const orders = await this.customerApi.getCustomerOrders(c.id);
      this.customerOrders.set(orders);
    } catch (e) {
      this.customerOrders.set([]);
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedCustomer.set(null);
    this.customerOrders.set([]);
  }

  openGoogleMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  showMessage(text: string) {
    this.isError.set(false);
    this.message.set(text);
  }

  showError(e: any) {
    this.isError.set(true);
    this.message.set(e?.error?.error ?? e?.error?.message ?? 'เกิดข้อผิดพลาดในการเชื่อมต่อ Backend');
  }
}
