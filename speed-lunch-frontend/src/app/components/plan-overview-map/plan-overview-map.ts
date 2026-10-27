import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { PlanGetResponse, RiderRoute } from '../../model/plan-get-res';

interface RoadResponse {
  code: string;
  routes?: { geometry: { coordinates: [number, number][] } }[];
}

@Component({
  selector: 'app-plan-overview-map',
  templateUrl: './plan-overview-map.html',
  styleUrl: './plan-overview-map.css',
})
export class PlanOverviewMap implements AfterViewInit, OnDestroy {
  plan = input.required<PlanGetResponse>();
  colors = input.required<string[]>();
  element = viewChild.required<ElementRef<HTMLDivElement>>('map');
  hidden = signal(new Set<number>());
  pending = signal(0);
  failed = signal<number[]>([]);
  private map?: L.Map;
  private shopLayer?: L.LayerGroup;
  private routeLayers = new Map<number, L.LayerGroup>();
  private controllers = new Set<AbortController>();
  private generation = 0;
  private resize?: ResizeObserver;
  private cache = new Map<string, L.LatLngTuple[]>();

  constructor() {
    effect(() => {
      const plan = this.plan();
      this.colors();
      if (this.map) untracked(() => void this.load(plan));
    });
  }

  ngAfterViewInit() {
    this.map = L.map(this.element().nativeElement).setView([16.2462, 103.2501], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.resize = new ResizeObserver(() => this.map?.invalidateSize());
    this.resize.observe(this.element().nativeElement);
    void this.load(this.plan());
  }

  color(route: RiderRoute) {
    const palette = this.colors();
    return palette[(route.rider_number - 1) % palette.length] ?? '#183b78';
  }

  toggle(routeId: number) {
    const hidden = new Set(this.hidden());
    if (hidden.has(routeId)) hidden.delete(routeId);
    else hidden.add(routeId);
    this.hidden.set(hidden);
    const layer = this.routeLayers.get(routeId);
    if (layer) {
      if (hidden.has(routeId)) layer.remove();
      else layer.addTo(this.map!);
    }
  }

  showAll() {
    this.hidden.set(new Set());
    for (const layer of this.routeLayers.values()) layer.addTo(this.map!);
    this.fit();
  }

  fit() {
    if (!this.map) return;
    const bounds = L.latLngBounds([]);
    this.shopLayer?.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) bounds.extend(layer.getLatLng());
    });
    for (const [id, group] of this.routeLayers) {
      if (this.hidden().has(id)) continue;
      group.eachLayer((layer) => {
        if (layer instanceof L.Polyline) bounds.extend(layer.getBounds());
        else if (layer instanceof L.Marker) bounds.extend(layer.getLatLng());
      });
    }
    if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.15), { maxZoom: 16 });
  }

  retry() {
    void this.load(this.plan());
  }

  private valid(point: L.LatLngTuple) {
    return (
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]) &&
      Math.abs(point[0]) <= 90 &&
      Math.abs(point[1]) <= 180
    );
  }

  private cancel() {
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
  }

  private async load(plan: PlanGetResponse) {
    const generation = ++this.generation;
    this.cancel();
    this.shopLayer?.remove();
    for (const layer of this.routeLayers.values()) layer.remove();
    this.routeLayers.clear();
    this.hidden.set(new Set());
    this.failed.set([]);
    const routes = plan.routes.filter((route) => route.status !== 'cancelled');
    this.pending.set(routes.length);
    const shop: L.LatLngTuple | undefined = plan.shop
      ? [Number(plan.shop.shop_latitude), Number(plan.shop.shop_longitude)]
      : undefined;
    this.shopLayer = L.layerGroup().addTo(this.map!);
    if (shop && this.valid(shop))
      L.circleMarker(shop, { radius: 9, color: '#d71920', fillOpacity: 1 })
        .bindTooltip('ร้าน', { permanent: true })
        .addTo(this.shopLayer);
    for (const route of routes) {
      const group = L.layerGroup().addTo(this.map!);
      this.routeLayers.set(route.route_id, group);
      const groupedStops = new Map<string, typeof route.stops>();
      for (const stop of route.stops) {
        const point: L.LatLngTuple = [Number(stop.latitude), Number(stop.longitude)];
        if (!this.valid(point)) continue;
        const key = point.join(',');
        groupedStops.set(key, [...(groupedStops.get(key) ?? []), stop]);
      }
      for (const stops of groupedStops.values()) {
        const first = stops[0]!;
        const label = stops.map((stop) => Number(stop.stop_sequence)).join(', ');
        const width = Math.max(32, label.length * 9 + 14);
        const popup = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `${route.rider_name} · ${route.job_code}`;
        popup.appendChild(title);
        for (const stop of stops) {
          const row = document.createElement('p');
          row.textContent = `จุด ${stop.stop_sequence}: ${stop.customer_name} · ${stop.quantity} กล่อง`;
          popup.appendChild(row);
        }
        L.marker([Number(first.latitude), Number(first.longitude)], {
          icon: L.divIcon({
            className: '',
            iconSize: [width, 32],
            iconAnchor: [width / 2, 16],
            html: `<div style="height:32px;width:${width}px;border:2px solid white;border-radius:16px;background:${this.color(route)};color:white;font-weight:bold;display:grid;place-items:center">${label}</div>`,
          }),
        })
          .bindPopup(popup)
          .bindTooltip(`${route.rider_name} · จุด ${label}`)
          .addTo(group);
      }
    }
    this.fit();
    let index = 0;
    const worker = async () => {
      while (index < routes.length && generation === this.generation) {
        const route = routes[index++]!;
        try {
          if (!shop || !this.valid(shop) || !route.stops.length)
            throw new Error('Missing coordinates');
          const points: L.LatLngTuple[] = [
            shop,
            ...[...route.stops]
              .sort((a, b) => a.stop_sequence - b.stop_sequence)
              .map((stop) => [Number(stop.latitude), Number(stop.longitude)] as L.LatLngTuple),
          ];
          if (points.some((point) => !this.valid(point))) throw new Error('Invalid coordinates');
          const coordinates = points.map((point) => `${point[1]},${point[0]}`).join(';');
          let line = this.cache.get(coordinates);
          if (!line) {
            const controller = new AbortController();
            this.controllers.add(controller);
            const timeout = setTimeout(() => controller.abort(), 15000);
            try {
              const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
                { signal: controller.signal },
              );
              if (!response.ok) throw new Error('Route unavailable');
              const data = (await response.json()) as RoadResponse;
              const geometry = data.routes?.[0]?.geometry.coordinates;
              if (data.code !== 'Ok' || !geometry?.length) throw new Error('No route');
              line = geometry.map((point) => [point[1], point[0]] as L.LatLngTuple);
              if (this.cache.size >= 100) this.cache.clear();
              this.cache.set(coordinates, line);
            } finally {
              clearTimeout(timeout);
              this.controllers.delete(controller);
            }
          }
          if (generation !== this.generation) return;
          const popup = document.createElement('span');
          popup.textContent = `${route.rider_name} · ${route.job_code}`;
          L.polyline(line, { color: this.color(route), weight: 5, opacity: 0.8 })
            .bindPopup(popup)
            .addTo(this.routeLayers.get(route.route_id)!);
        } catch {
          if (generation === this.generation)
            this.failed.update((failed) => [...failed, route.route_id]);
        } finally {
          if (generation === this.generation) this.pending.update((count) => count - 1);
        }
      }
    };
    await Promise.all([worker(), worker()]);
    if (generation === this.generation) this.fit();
  }

  ngOnDestroy() {
    this.generation++;
    this.cancel();
    this.resize?.disconnect();
    this.map?.remove();
  }
}
