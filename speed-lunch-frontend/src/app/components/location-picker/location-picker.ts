import { AfterViewInit, Component, effect, ElementRef, model, OnDestroy, viewChild } from '@angular/core';
import * as L from 'leaflet';

// shortcut: พิกัดร้านและรัศมีเขียนตรงกับ settings ของ backend ถ้าย้ายร้านหรือเปลี่ยนรัศมีต้องแก้ตรงนี้ด้วย
const SHOP: L.LatLngTuple = [16.2462, 103.2501];
const SERVICE_RADIUS_KM = 3;

@Component({
  imports: [],
  selector: 'app-location-picker',
  styleUrl: './location-picker.css',
  templateUrl: './location-picker.html',
})
export class LocationPicker implements AfterViewInit, OnDestroy {
  // two-way binding กับหน้าที่เรียกใช้ [(latitude)] [(longitude)]
  latitude = model<number | null>(null);
  longitude = model<number | null>(null);
  radiusKm = SERVICE_RADIUS_KM;

  mapDiv = viewChild.required<ElementRef<HTMLDivElement>>('map');
  map?: L.Map;
  pin?: L.CircleMarker;

  constructor() {
    // พิกัดเปลี่ยนจากข้างนอก (เช่น ค้นเจอลูกค้าเก่า) ให้ย้ายหมุดตาม
    effect(() => this.showPin(this.latitude(), this.longitude()));
  }

  ngAfterViewInit() {
    this.map = L.map(this.mapDiv().nativeElement).setView(SHOP, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);
    // วงรัศมีให้บริการ + จุดร้าน
    L.circle(SHOP, { radius: SERVICE_RADIUS_KM * 1000, color: '#1e3a8a', weight: 1, fillOpacity: 0.05 }).addTo(this.map);
    L.circleMarker(SHOP, { radius: 8, color: '#d71920', fillOpacity: 1 }).bindTooltip('ร้าน').addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.latitude.set(Number(e.latlng.lat.toFixed(6)));
      this.longitude.set(Number(e.latlng.lng.toFixed(6)));
    });
    this.showPin(this.latitude(), this.longitude());
  }

  showPin(lat: number | null, lng: number | null) {
    if (!this.map) {
      return;
    }
    if (lat === null || lng === null) {
      this.pin?.remove();
      this.pin = undefined;
      return;
    }
    if (this.pin) {
      this.pin.setLatLng([lat, lng]);
    } else {
      this.pin = L.circleMarker([lat, lng], { radius: 9, color: '#1e3a8a', fillColor: '#2563eb', fillOpacity: 1 })
        .bindTooltip('บ้านลูกค้า')
        .addTo(this.map);
    }
    this.map.panTo([lat, lng]);
  }

  // ระยะเส้นตรงจากร้าน (กม.)
  distanceKm() {
    return Number((L.latLng(SHOP).distanceTo([this.latitude()!, this.longitude()!]) / 1000).toFixed(2));
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}
