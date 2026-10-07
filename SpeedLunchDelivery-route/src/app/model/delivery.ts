export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
}
export interface Order {
  id: number;
  orderNo: string;
  customer: Customer;
  quantity: number;
  status: 'PENDING' | 'ASSIGNED' | 'DELIVERED';
  orderDate: string;
}
export interface TripStop {
  order: Order;
  sequence: number;
  estimatedArrival: string;
  deliveredAt?: string;
}
export interface Trip {
  id: string;
  jobCode: string;
  date: string;
  riderName: string;
  color: string;
  totalBoxes: number;
  totalKm: number;
  riderWage: number;
  estimatedMinutes: number;
  stops: TripStop[];
  status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED';
}
export interface DeliverySummary {
  orders: number;
  boxes: number;
  riders: number;
  revenue: number;
  foodCost: number;
  deliveryCost: number;
  profit: number;
  totalKm: number;
  maxMinutes: number;
}
export interface RoutePlan {
  id: string;
  trips: Trip[];
  summary: DeliverySummary;
}
export const SHOP = { name: 'SpeedLunchDelivery', latitude: 16.2462, longitude: 103.2501 };
export const DELIVERY_RULES = {
  pricePerBox: 65,
  costPerBox: 40,
  riderBaseFee: 15,
  feePerKmPerBox: 2,
  speedKmh: 30,
  minutesPerStop: 3,
  maxOrdersPerRider: 3,
  departure: '11:30',
  deadline: '12:30',
  serviceRadiusKm: 3,
};
