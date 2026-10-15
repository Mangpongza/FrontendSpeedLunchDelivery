import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Api {
  public readonly API_ENDPOINT: string = 'https://backend-speed-lunch-delivery.vercel.app/api';
}
