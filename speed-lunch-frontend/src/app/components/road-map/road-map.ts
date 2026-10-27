import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { RiderRoute } from '../../model/plan-get-res';

interface RoadStep {
  distance: number;
  name: string;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}
interface RoadRoute {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
  legs: { steps: RoadStep[] }[];
}

@Component({
  selector: 'app-road-map',
  templateUrl: './road-map.html',
  styles:
    ':host{display:block}.map{height:440px;z-index:0}.controls{padding:12px;display:flex;gap:8px;flex-wrap:wrap}.note{padding:8px 12px;font-size:13px}.directions{max-height:200px;overflow:auto;padding:12px 32px;list-style:decimal}@media(max-width:640px){.map{height:340px}}',
})
export class RoadMap implements AfterViewInit, OnDestroy {
  job = input.required<RiderRoute>();
  target = input<number | null>(null);
  allowNavigation = input(false);
  element = viewChild.required<ElementRef<HTMLDivElement>>('map');
  loading = signal(false);
  error = signal('');
  summary = signal('');
  steps = signal<RoadStep[]>([]);
  tracking = signal(false);
  accuracy = signal<number | null>(null);
  private map?: L.Map;
  private markers?: L.LayerGroup;
  private road?: L.Polyline;
  private positionMarker?: L.CircleMarker;
  private position?: L.LatLngTuple;
  private watch?: number;
  private abort?: AbortController;
  private version = 0;
  private lastRequest = 0;
  private lastOrigin?: L.LatLngTuple;
  private resize?: ResizeObserver;

  constructor() {
    effect(() => {
      this.job();
      this.target();
      if (this.map) {
        this.stop();
        this.draw();
      }
    });
  }

  ngAfterViewInit() {
    this.map = L.map(this.element().nativeElement).setView([16.2462, 103.2501], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.markers = L.layerGroup().addTo(this.map);
    this.resize = new ResizeObserver(() => this.map?.invalidateSize());
    this.resize.observe(this.element().nativeElement);
    this.draw();
  }

  private stops() {
    const stops = [...this.job().stops].sort((a, b) => a.stop_sequence - b.stop_sequence);
    return this.target() === null ? stops : stops.filter((s) => s.stop_sequence === this.target());
  }

  private shop(): L.LatLngTuple | undefined {
    const shop = this.job().shop;
    return shop ? [Number(shop.shop_latitude), Number(shop.shop_longitude)] : undefined;
  }

  private valid(point: L.LatLngTuple) {
    return (
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]) &&
      Math.abs(point[0]) <= 90 &&
      Math.abs(point[1]) <= 180
    );
  }

  private draw() {
    this.markers!.clearLayers();
    const shop = this.shop();
    if (shop && this.valid(shop))
      L.circleMarker(shop, { radius: 9, color: '#d71920', fillOpacity: 1 })
        .bindTooltip('ร้าน', { permanent: true })
        .addTo(this.markers!);
    for (const stop of this.stops()) {
      const point: L.LatLngTuple = [Number(stop.latitude), Number(stop.longitude)];
      if (!this.valid(point)) continue;
      const popup = document.createElement('div');
      popup.textContent = `จุด ${stop.stop_sequence}: ${stop.customer_name} / ${stop.quantity} กล่อง / ${stop.address}`;
      L.marker(point, {
        icon: L.divIcon({
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          html: `<div style="width:32px;height:32px;display:grid;place-items:center;background:#183b78;color:white;border:2px solid white;border-radius:50%;font-weight:bold">${Number(stop.stop_sequence)}</div>`,
        }),
      })
        .bindPopup(popup)
        .addTo(this.markers!);
    }
    void this.route(true);
  }

  async route(fit = false) {
    const version = ++this.version;
    this.abort?.abort();
    this.abort = new AbortController();
    const controller = this.abort;
    this.road?.remove();
    this.steps.set([]);
    this.summary.set('');
    this.error.set('');
    const origin = this.position ?? this.shop();
    const points: L.LatLngTuple[] = this.stops().map((s) => [
      Number(s.latitude),
      Number(s.longitude),
    ]);
    if (origin) points.unshift(origin);
    if (!origin || points.length < 2 || points.some((p) => !this.valid(p))) {
      this.error.set('ข้อมูลพิกัดร้านหรือจุดส่งไม่ครบ ไม่สามารถคำนวณเส้นทางได้');
      return;
    }
    this.loading.set(true);
    this.lastRequest = Date.now();
    this.lastOrigin = origin;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const coordinates = points.map((p) => `${p[1]},${p[0]}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error('route');
      const data = (await response.json()) as { code: string; routes: RoadRoute[] };
      const route = data.routes?.[0];
      if (data.code !== 'Ok' || !route || !route.geometry.coordinates.length)
        throw new Error('route');
      if (version !== this.version) return;
      const line: L.LatLngTuple[] = route.geometry.coordinates.map((p) => [p[1], p[0]]);
      this.road = L.polyline(line, { color: '#183b78', weight: 5 }).addTo(this.map!);
      if (fit) this.map!.fitBounds(this.road.getBounds().pad(0.15), { maxZoom: 17 });
      this.summary.set(
        `ตามถนน ${(route.distance / 1000).toFixed(2)} กม. / ประมาณ ${Math.max(1, Math.round(route.duration / 60))} นาที`,
      );
      this.steps.set(route.legs.flatMap((leg) => leg.steps));
    } catch {
      if (version === this.version)
        this.error.set('โหลดเส้นทางตามถนนไม่ได้ กรุณาลองใหม่ ตรวจอินเทอร์เน็ตหรือบริการเส้นทาง');
    } finally {
      clearTimeout(timeout);
      if (version === this.version) this.loading.set(false);
    }
  }

  start() {
    if (this.tracking()) return;
    if (!navigator.geolocation) {
      this.error.set('อุปกรณ์นี้ไม่รองรับ GPS');
      return;
    }
    this.tracking.set(true);
    this.error.set('');
    this.watch = navigator.geolocation.watchPosition(
      (p) => {
        if (!this.tracking()) return;
        const firstPosition = !this.position;
        this.position = [p.coords.latitude, p.coords.longitude];
        this.accuracy.set(Math.round(p.coords.accuracy));
        if (!this.positionMarker)
          this.positionMarker = L.circleMarker(this.position, {
            radius: 8,
            color: '#2563eb',
            fillOpacity: 1,
          })
            .bindTooltip('ตำแหน่งปัจจุบัน')
            .addTo(this.map!);
        else this.positionMarker.setLatLng(this.position);
        this.map!.setView(this.position, 17);
        if (
          firstPosition ||
          (!this.loading() &&
            Date.now() - this.lastRequest > 15000 &&
            (!this.lastOrigin ||
              L.latLng(this.position).distanceTo(this.lastOrigin) > 40 ||
              !this.road))
        )
          void this.route();
      },
      (e) => {
        this.stop();
        this.error.set(
          e.code === 1
            ? 'กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ แล้วกดเริ่มนำทางอีกครั้ง'
            : 'หาตำแหน่งไม่ได้ กรุณาตรวจ GPS แล้วลองใหม่',
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }

  stop() {
    if (this.watch !== undefined) navigator.geolocation.clearWatch(this.watch);
    this.watch = undefined;
    this.tracking.set(false);
    this.position = undefined;
    this.lastOrigin = undefined;
    this.positionMarker?.remove();
    this.positionMarker = undefined;
    this.accuracy.set(null);
  }

  instruction(step: RoadStep) {
    const modifier: Record<string, string> = {
      left: 'เลี้ยวซ้าย',
      right: 'เลี้ยวขวา',
      'slight left': 'เบี่ยงซ้าย',
      'slight right': 'เบี่ยงขวา',
      'sharp left': 'เลี้ยวซ้ายหักศอก',
      'sharp right': 'เลี้ยวขวาหักศอก',
      straight: 'ตรงไป',
      uturn: 'กลับรถ',
    };
    const type = step.maneuver.type;
    const action =
      type === 'depart'
        ? 'ออกเดินทาง'
        : type === 'arrive'
          ? 'ถึงจุดหมาย'
          : type.includes('roundabout') || type === 'rotary'
            ? 'เข้าวงเวียน'
            : (modifier[step.maneuver.modifier ?? ''] ?? 'ไปต่อ');
    return `${action}${step.name ? ' บน ' + step.name : ''} · ${Math.round(step.distance)} ม.`;
  }

  ngOnDestroy() {
    this.version++;
    this.abort?.abort();
    this.stop();
    this.resize?.disconnect();
    this.map?.remove();
  }
}
