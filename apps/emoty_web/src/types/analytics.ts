export interface DashboardSummary {
  total_visits: number;
  unique_visitors: number;
  avg_time: number;
  rage_clicks: number;
  total_errors: number;
}

export interface ChartData {
  dates: string[];
  daily_counts: number[];
  device_labels: string[];
  device_data: number[];
  browser_labels: string[];
  browser_data: number[];
  country_labels: string[];
  country_data: number[];
}

export interface TopPage {
  path: string;
  count: number;
  avg_time: number;
}

export interface CountryStat {
  country: string;
  count: number;
}

export interface LocationData {
  ip_address: string;
  visit_count: number;
  city: string;
  region: string;
  country: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  isp: string;
  organization: string;
  network_type: string;
  timezone: string;
}

export interface MapDataPoint {
  lat: number;
  lng: number;
  city: string;
  count: number;
}

export interface WebVitals {
  avg_ttfb: number;
  avg_lcp: number;
  avg_cls: number;
  avg_inp: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  charts: ChartData;
  top_pages: TopPage[];
  country_stats: CountryStat[];
  unique_ip_locations: LocationData[];
  map_data: MapDataPoint[];
  mapbox_token: string;
  cwv: WebVitals;
  title: string;
}
