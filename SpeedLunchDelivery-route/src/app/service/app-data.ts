import { Injectable, signal } from '@angular/core';
import { DELIVERY_RULES as R, Order, RoutePlan, SHOP, Trip } from '../model/delivery';

@Injectable({ providedIn: 'root' })
export class AppData {
  // จุดเชื่อมของแต่ละหน้า: orders มาจากคนที่ 2 และมี customer จากคนที่ 1
  readonly orders = signal<Order[]>(createMockOrders());
  readonly plan = signal<RoutePlan | null>(null);
  readonly jobs = signal<Trip[]>([]);
  readonly apiEndpoints = {
    orders: '/api/orders',
    optimize: '/api/routes/optimize',
    summary: '/api/routes/summary',
    confirm: '/api/routes/confirm',
    riderJobs: '/api/rider/jobs',
    riderOrders: '/api/rider/orders',
  };
  private readonly storageKey = 'speed-lunch-demo-jobs-v1';
  private revision = 0;

  // เรียกเมื่อโหลดใน browser เพื่อรองรับโปรเจกต์ที่เปิด SSR อยู่
  restoreJobs(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.every((j) => typeof j.jobCode === 'string' && Array.isArray(j.stops))
        )
          this.jobs.set(parsed);
      }
    } catch {
      /* ใช้ข้อมูลในหน่วยความจำหาก browser ไม่อนุญาต storage */
    }
  }
  private saveJobs(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.jobs()));
    } catch {
      /* session-only fallback */
    }
  }
  // Frontend demo เท่านั้น: จัดกลุ่มตามมุมและใช้ระยะเส้นตรง ไม่ใช่เส้นทางถนนจริง
  calculatePlan(): void {
    const assigned = new Set(this.jobs().flatMap((t) => t.stops.map((s) => s.order.id)));
    const pending = this.orders().filter((o) => o.status === 'PENDING' && !assigned.has(o.id));
    const sorted = [...pending].sort((a, b) => this.angle(a) - this.angle(b));
    const offset = this.revision++ % R.maxOrdersPerRider;
    const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)];
    const colors = [
      '#dc2626',
      '#2563eb',
      '#16a34a',
      '#9333ea',
      '#ea580c',
      '#0891b2',
      '#db2777',
      '#64748b',
    ];
    const planId = `PLAN-${Date.now()}-${this.revision}`;
    const trips: Trip[] = [];
    for (let i = 0; i < rotated.length; i += R.maxOrdersPerRider) {
      const group = rotated.slice(i, i + R.maxOrdersPerRider);
      let lat = SHOP.latitude,
        lng = SHOP.longitude,
        distance = 0;
      const stops = group.map((order, index) => {
        distance += this.distance(lat, lng, order.customer.latitude, order.customer.longitude);
        lat = order.customer.latitude;
        lng = order.customer.longitude;
        return {
          order: structuredClone(order),
          sequence: index + 1,
          estimatedArrival: this.arrival(
            (distance / R.speedKmh) * 60 + (index + 1) * R.minutesPerStop,
          ),
        };
      });
      const boxes = group.reduce((sum, order) => sum + order.quantity, 0);
      trips.push({
        id: `${planId}-${i}`,
        jobCode: '',
        date: group[0].orderDate,
        riderName: `ไรเดอร์ ${trips.length + 1}`,
        color: colors[trips.length % colors.length],
        totalBoxes: boxes,
        totalKm: distance,
        riderWage: R.riderBaseFee + R.feePerKmPerBox * boxes * distance,
        estimatedMinutes: (distance / R.speedKmh) * 60 + stops.length * R.minutesPerStop,
        stops,
        status: 'DRAFT',
      });
    }
    const boxes = trips.reduce((n, t) => n + t.totalBoxes, 0);
    const cost = trips.reduce((n, t) => n + t.riderWage, 0);
    this.plan.set({
      id: planId,
      trips,
      summary: {
        orders: pending.length,
        boxes,
        riders: trips.length,
        revenue: boxes * R.pricePerBox,
        foodCost: boxes * R.costPerBox,
        deliveryCost: cost,
        profit: boxes * (R.pricePerBox - R.costPerBox) - cost,
        totalKm: trips.reduce((n, t) => n + t.totalKm, 0),
        maxMinutes: Math.max(0, ...trips.map((t) => t.estimatedMinutes)),
      },
    });
  }
  resetDemo(): void {
    this.jobs.set([]);
    this.plan.set(null);
    this.orders.set(createMockOrders());
    this.revision = 0;
    this.saveJobs();
  }

  confirmPlan(): Trip[] {
    const plan = this.plan();
    if (
      !plan ||
      !plan.trips.length ||
      plan.trips.some((t) => t.status !== 'DRAFT') ||
      plan.summary.maxMinutes > 60
    )
      return [];
    const existing = new Set(this.jobs().flatMap((t) => t.stops.map((s) => s.order.id)));
    if (plan.trips.some((t) => t.stops.some((s) => existing.has(s.order.id)))) return [];
    const token = Date.now().toString(36).toUpperCase();
    const confirmed = plan.trips.map((trip, i): Trip => ({
      ...trip,
      status: 'CONFIRMED',
      jobCode: `JOB-${token}-${String(i + 1).padStart(2, '0')}`,
      stops: trip.stops.map((s) => ({ ...s, order: { ...s.order, status: 'ASSIGNED' } })),
    }));
    this.jobs.update((jobs) => [...jobs, ...confirmed]);
    const ids = new Set(confirmed.flatMap((t) => t.stops.map((s) => s.order.id)));
    this.orders.update((orders) =>
      orders.map((o) => (ids.has(o.id) ? { ...o, status: 'ASSIGNED' } : o)),
    );
    this.plan.set({ ...plan, trips: confirmed });
    this.saveJobs();
    return confirmed;
  }
  findJob(code: string): Trip | undefined {
    return this.jobs().find((j) => j.jobCode === code.trim().toUpperCase());
  }
  markDelivered(code: string, orderId: number): void {
    this.jobs.update((jobs) =>
      jobs.map((job) => {
        if (job.jobCode !== code) return job;
        const stops = job.stops.map((stop) =>
          stop.order.id === orderId && !stop.deliveredAt
            ? {
                ...stop,
                deliveredAt: new Date().toISOString(),
                order: { ...stop.order, status: 'DELIVERED' as const },
              }
            : stop,
        );
        return {
          ...job,
          stops,
          status: stops.every((s) => s.deliveredAt) ? 'COMPLETED' : job.status,
        };
      }),
    );
    this.saveJobs();
  }
  arrival(minutes: number): string {
    const total = 690 + Math.ceil(minutes);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  private angle(o: Order): number {
    return Math.atan2(o.customer.latitude - SHOP.latitude, o.customer.longitude - SHOP.longitude);
  }
  private distance(a: number, b: number, c: number, d: number): number {
    const rad = Math.PI / 180;
    const h =
      Math.sin(((c - a) * rad) / 2) ** 2 +
      Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}

// ข้อมูลจำลองระหว่างรอเชื่อมออเดอร์จากหน้าคนที่ 2
export function bangkokDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
// ข้อมูลตัวอย่างจากหน้าคนที่ 1 และ 2; เปลี่ยนเป็น GET /api/orders เมื่อ Backend พร้อม
export function createMockOrders(): Order[] {
  const names = [
    'คุณพลอย',
    'คุณต้น',
    'คุณเมย์',
    'คุณบอส',
    'คุณฟ้า',
    'คุณนัท',
    'คุณแพร',
    'คุณเจ',
    'คุณออม',
    'คุณก้อง',
    'คุณปาล์ม',
    'คุณมิ้น',
    'คุณพีท',
    'คุณแนน',
    'คุณเบน',
    'คุณบีม',
    'คุณฝน',
    'คุณกาย',
    'คุณข้าว',
    'คุณเอิร์ธ',
    'คุณโม',
    'คุณปุ้ย',
    'คุณกิ๊ฟ',
    'คุณไผ่',
  ];
  return names.map((name, i) => {
    const angle = (i / names.length) * Math.PI * 2;
    const radius = 0.006 + (i % 3) * 0.004;
    return {
      id: i + 1,
      orderNo: `ORD-${String(i + 1).padStart(3, '0')}`,
      quantity: (i % 3) + 1,
      status: 'PENDING',
      orderDate: bangkokDate(),
      customer: {
        id: i + 1,
        name,
        phone: '0800000000',
        address: `จุดส่งตัวอย่าง ${i + 1} · รอบมหาวิทยาลัยมหาสารคาม`,
        latitude: SHOP.latitude + Math.sin(angle) * radius,
        longitude: SHOP.longitude + Math.cos(angle) * radius,
      },
    };
  });
}
