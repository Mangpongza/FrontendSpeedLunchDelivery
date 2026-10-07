import {afterNextRender,Component,effect,ElementRef,input,OnDestroy,signal,viewChild,} from '@angular/core';
import type * as Leaflet from 'leaflet';
import { SHOP, Trip } from '../../model/delivery';
@Component({
  selector: 'app-route-map',
  templateUrl: './route-map.html',
  styleUrl: './route-map.css',
  host: { class: 'relative block' },
})
export class RouteMap implements OnDestroy {

  readonly trips = input<Trip[]>([]);
  readonly selected = input<string>('');
  readonly failed = signal(false);
  private readonly canvas = viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  private map?: Leaflet.Map;
  private layers?: Leaflet.LayerGroup;
  private leaflet?: typeof Leaflet;
  private destroyed = false;
  constructor() {
    afterNextRender(async () => {
      try {
        const L = await import('leaflet');
        if (this.destroyed) return;
        this.leaflet = L;
        this.map = L.map(this.canvas().nativeElement).setView([SHOP.latitude, SHOP.longitude], 14);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
          .on('tileerror', () => this.failed.set(true))
          .addTo(this.map);
        this.layers = L.layerGroup().addTo(this.map);
        this.draw();
      } catch {
        this.failed.set(true);
      }
    });
    effect(() => {
      this.trips();
      this.selected();
      this.draw();
    });
  }
  private draw(): void {
    const L = this.leaflet;
    if (!L || !this.map || !this.layers) return;
    this.layers.clearLayers();
    L.circle([SHOP.latitude, SHOP.longitude], {
      radius: 3000,
      color: '#dc2626',
      weight: 1,
      fillOpacity: 0.025,
      dashArray: '5,8',
    }).addTo(this.layers);
    L.circleMarker([SHOP.latitude, SHOP.longitude], {
      radius: 10,
      color: 'white',
      fillColor: '#dc2626',
      fillOpacity: 1,
      weight: 3,
    })
      .bindTooltip('ร้าน SpeedLunchDelivery')
      .addTo(this.layers);
    const points: Leaflet.LatLngTuple[] = [[SHOP.latitude, SHOP.longitude]];
    for (const trip of this.trips()) {
      const active = !this.selected() || this.selected() === trip.id;
      const path: Leaflet.LatLngTuple[] = [
        [SHOP.latitude, SHOP.longitude],
        ...trip.stops.map(
          (s) => [s.order.customer.latitude, s.order.customer.longitude] as Leaflet.LatLngTuple,
        ),
      ];
      points.push(...path);
      L.polyline(path, {
        color: trip.color,
        weight: active ? 4 : 2,
        opacity: active ? 0.9 : 0.2,
      }).addTo(this.layers);
      for (const stop of trip.stops) {
        const label = document.createElement('span');
        label.textContent = `${trip.riderName} · จุด ${stop.sequence} · ${stop.order.customer.name}`;
        L.circleMarker([stop.order.customer.latitude, stop.order.customer.longitude], {
          radius: 7,
          color: 'white',
          weight: 2,
          fillColor: trip.color,
          fillOpacity: active ? 1 : 0.3,
        })
          .bindTooltip(label)
          .addTo(this.layers);
      }
    }
    if (points.length > 1)
      this.map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 15 });
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.map?.remove();
  }
}
