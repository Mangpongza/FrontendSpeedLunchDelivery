import { AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { JobApi } from '../../services/api/job-api';
import { RiderRoute, RouteStop } from '../../model/plan-get-res';
import { RiderGetResponse } from '../../model/rider-get-res';
import { statusText } from '../../model/status-text';

@Component({
  selector: 'app-rider-map',
  template: '<div #map class="rider-map" aria-label="แผนที่จุดส่งตามลำดับ"></div>',
  styles: '.rider-map { height: 440px; width: 100%; z-index: 0; } @media(max-width:640px){.rider-map{height:340px}}',
})
export class RiderMap implements AfterViewInit, OnDestroy {
  job = input.required<RiderRoute>();
  mapElement = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private map?: L.Map;
  private layers?: L.LayerGroup;

  constructor() {
    effect(() => { const job = this.job(); if (this.map) this.draw(job); });
  }

  ngAfterViewInit() {
    this.map = L.map(this.mapElement().nativeElement);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(this.map);
    this.layers = L.layerGroup().addTo(this.map);
    this.draw(this.job());
  }

  private draw(job: RiderRoute) {
    this.layers!.clearLayers();
    const points: L.LatLngTuple[] = [];
    if (job.shop) {
      const shop: L.LatLngTuple = [Number(job.shop.shop_latitude), Number(job.shop.shop_longitude)];
      points.push(shop);
      L.circleMarker(shop, { radius: 9, color: '#d71920', fillOpacity: 1 })
        .bindTooltip('ร้าน', { permanent: true }).addTo(this.layers!);
    }
    for (const stop of [...job.stops].sort((a, b) => a.stop_sequence - b.stop_sequence)) {
      const point: L.LatLngTuple = [Number(stop.latitude), Number(stop.longitude)];
      if (!point.every(Number.isFinite)) continue;
      points.push(point);
      const popup = document.createElement('div');
      popup.textContent = `จุดที่ ${stop.stop_sequence}: ${stop.customer_name} / ${stop.quantity} กล่อง / ${stop.address}`;
      L.marker(point, { icon: L.divIcon({
        className: '', iconSize: [32, 32], iconAnchor: [16, 16],
        html: `<div style="background:#183b78;color:white;border:2px solid white;border-radius:50%;width:32px;height:32px;display:grid;place-items:center;font-weight:bold">${Number(stop.stop_sequence)}</div>`,
      }) }).bindPopup(popup).addTo(this.layers!);
    }
    if (points.length) {
      L.polyline(points, { color: '#183b78', weight: 3, dashArray: '7 7' }).addTo(this.layers!);
      this.map!.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 16 });
    } else this.map!.setView([16.2462, 103.2501], 14);
  }

  ngOnDestroy() { this.map?.remove(); }
}

@Component({
  imports: [FormsModule, RiderMap],
  selector: 'app-rider-job',
  styleUrl: './rider-job.css',
  templateUrl: './rider-job.html',
})
export class RiderJob {
  jobApi = inject(JobApi);
  code = input<string>();
  riderId = '';
  rider = signal<RiderGetResponse | undefined>(undefined);
  job = signal<RiderRoute | undefined>(undefined);
  message = signal('');
  loading = signal(false);
  searched = signal(false);
  statusText = statusText;
  private requestId = 0;

  constructor() {
    effect(() => { const code = this.code(); if (code) void this.loadJob(code); });
  }

  async findRider() {
    if (this.loading()) return;
    const id = Number(this.riderId);
    if (!Number.isSafeInteger(id) || id <= 0) { this.message.set('กรอกรหัสไรเดอร์เป็นจำนวนเต็มมากกว่า 0'); return; }
    const request = ++this.requestId;
    this.loading.set(true);
    this.message.set('');
    this.job.set(undefined);
    this.rider.set(undefined);
    this.searched.set(false);
    try {
      const result = await this.jobApi.getTodayJobForRider(id);
      if (request !== this.requestId) return;
      this.rider.set(result.rider);
      this.job.set(result.job);
      this.searched.set(true);
    } catch (e: unknown) {
      if (request === this.requestId) this.message.set(this.errorText(e));
    } finally { if (request === this.requestId) this.loading.set(false); }
  }

  async loadJob(code: string) {
    const request = ++this.requestId;
    this.loading.set(true);
    this.message.set('');
    this.job.set(undefined);
    try {
      const job = await this.jobApi.getJobByCode(code);
      if (request === this.requestId) this.job.set(job);
    } catch (e: unknown) {
      if (request === this.requestId) this.message.set(this.errorText(e));
    } finally { if (request === this.requestId) this.loading.set(false); }
  }

  clear() {
    this.requestId++;
    this.loading.set(false);
    this.job.set(undefined);
    this.rider.set(undefined);
    this.message.set('');
    this.searched.set(false);
    this.riderId = '';
  }

  private errorText(error: unknown) {
    const e = error as { status?: number; error?: { error?: string } };
    return e.status === 404 ? 'ไม่พบรหัสไรเดอร์หรือใบงานนี้' : (e.error?.error ?? 'โหลดข้อมูลไม่ได้ กรุณาลองใหม่');
  }

  navigation(stop: RouteStop) {
    return `https://www.google.com/maps/dir/?api=1&destination=${Number(stop.latitude)},${Number(stop.longitude)}&travelmode=driving`;
  }

  time(t: string) { return String(t).slice(0, 5); }
}
