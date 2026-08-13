export type Order = {
  order_id: string;
  client_id: string;
  city: string;
  status: string;
  failure_reason?: string;
  amount?: string;
  created_at?: string;
  actual_delivery_date?: string;
  promised_delivery_date?: string;
};

export type Client = {
  client_id: string;
  client_name: string;
  city?: string;
};

export type Warehouse = {
  warehouse_id: string;
  warehouse_name: string;
  city?: string;
};

export type WarehouseLog = {
  order_id: string;
  warehouse_id: string;
  notes?: string;
};

export type Feedback = {
  order_id: string;
  feedback_text: string;
  sentiment: string;
  rating: string;
};

export type WeatherFactor = {
  order_id: string;
  traffic_condition: string;
  weather_condition: string;
  event_type: string;
};

export type AnalyticsFilterState = {
  city: string;
  client: string;
  warehouse: string;
};

export type ViewMode = 'graph' | 'table';
