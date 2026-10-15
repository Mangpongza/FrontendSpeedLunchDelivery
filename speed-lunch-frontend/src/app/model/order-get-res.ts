export interface OrderGetResponse {
  id: number;
  customer_id: number;
  quantity: number;
  order_date: string;
  status: string;
  is_demo: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_latitude: number;
  customer_longitude: number;
  job_code: string | null;
}
