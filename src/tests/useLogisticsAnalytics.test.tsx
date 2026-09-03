import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogisticsAnalytics } from '../hooks/useLogisticsAnalytics';

const sampleCsvs = {
  'orders.csv': `order_id,client_id,city,status,failure_reason,amount,created_at,actual_delivery_date,promised_delivery_date
O1,C1,Bengaluru,Failed,Vehicle breakdown,1500,2025-01-01 09:00:00,2025-01-03 12:00:00,2025-01-02 15:00:00
O2,C1,Bengaluru,Failed,Vehicle breakdown,1400,2025-01-02 14:00:00,2025-01-04 09:00:00,2025-01-03 11:00:00
O3,C2,Bengaluru,Returned,,1200,2025-01-03 08:00:00,2025-01-04 18:00:00,2025-01-03 12:00:00
O4,C2,Bengaluru,Delivered,,1300,2025-01-04 11:00:00,2025-01-05 10:00:00,2025-01-04 18:00:00
O5,C3,Chennai,Failed,Driver unavailable,900,2025-01-02 09:00:00,2025-01-03 11:00:00,2025-01-02 17:00:00
O6,C3,Chennai,Delivered,,1100,2025-01-05 06:00:00,2025-01-06 13:00:00,2025-01-05 18:00:00
O7,C4,Hyderabad,Delivered,,800,2025-01-04 08:00:00,2025-01-05 09:00:00,2025-01-05 12:00:00
O8,C4,Hyderabad,Delivered,,700,2025-01-05 10:00:00,2025-01-06 10:00:00,2025-01-06 18:00:00
`,
  'clients.csv': `client_id,client_name,city
C1,Northwind Logistics,Bengaluru
C2,BluePeak Retail,Bengaluru
C3,Metro Distribution,Chennai
C4,Sunline Supply,Hyderabad
`,
  'warehouses.csv': `warehouse_id,warehouse_name,city
W1,Whitefield Hub,Bengaluru
W2,Mount Road Hub,Chennai
W3,Hitech City Hub,Hyderabad
`,
  'warehouse_logs.csv': `order_id,warehouse_id,notes
O1,W1,Dock congestion
O2,W1,Staffing gap
O3,W1,Packaging backlog
O4,W1,Conveyor jam
O5,W2,Trailer delay
O6,W2,Minor delay
O7,W3,Vehicle check
O8,W3,Pallet staging delay
`,
  'feedback.csv': `order_id,feedback_text,sentiment,rating
O1,"Driver was late",negative,2
O2,"Delayed but informed",neutral,3
O3,"Returned item arrived damaged",negative,1
O4,"Packaging took too long",negative,2
O5,"No update from driver",negative,2
O6,"Order arrived late",neutral,3
O7,"Smooth delivery",positive,5
O8,"Good tracking",positive,4
`,
  'weather.csv': `order_id,weather_condition,traffic_condition,event_type
O1,Heavy Rain,Heavy,Monsoon
O2,Heavy Rain,Heavy,Monsoon
O3,Clear,Moderate,None
O4,Heavy Rain,Heavy,Storm
O5,Thunderstorm,Heavy,Rain alert
O6,Clear,Light,None
O7,Clear,Moderate,None
O8,Clear,Light,None
`,
  'fleet_logs.csv': `fleet_log_id,order_id,driver_id,vehicle_number,route_code,gps_delay_notes,departure_time,arrival_time,created_at
FL-1,O1,D1,KA-09-1234,R-102,"GPS signal loss",2025-01-01 08:00:00,2025-01-03 12:00:00,2025-01-03 12:00:00
FL-2,O2,D1,KA-09-1234,R-103,"Route detour",2025-01-02 12:00:00,2025-01-04 09:00:00,2025-01-04 09:00:00
FL-3,O3,D2,KA-09-9999,R-104,"Vehicle inspection",2025-01-03 08:00:00,2025-01-04 18:00:00,2025-01-04 18:00:00
FL-4,O4,D2,KA-09-9999,R-105,"Cross-dock hold",2025-01-04 10:00:00,2025-01-05 10:00:00,2025-01-05 10:00:00
FL-5,O5,D3,TN-10-7711,R-204,"Driver timeout",2025-01-02 08:00:00,2025-01-03 11:00:00,2025-01-03 11:00:00
FL-6,O6,D3,TN-10-7711,R-205,"Traffic reroute",2025-01-05 06:00:00,2025-01-06 13:00:00,2025-01-06 13:00:00
FL-7,O7,D4,TS-07-5544,R-302,"Route inspection",2025-01-04 07:00:00,2025-01-05 09:00:00,2025-01-05 09:00:00
FL-8,O8,D4,TS-07-5544,R-303,"Hub queue",2025-01-05 09:30:00,2025-01-06 10:00:00,2025-01-06 10:00:00
`,
  'drivers.csv': `driver_id,driver_name,phone,license_number,partner_company,city,state,status,created_at
D1,Rahul Singh,9999999999,DL-1001,FastLane,Bengaluru,Karnataka,active,2024-01-10 09:00:00
D2,Ananya Rao,9888888888,DL-1002,SpeedTrack,Bengaluru,Karnataka,active,2024-01-12 10:00:00
D3,Manoj Nair,9777777777,DL-1003,UrbanFreight,Chennai,Tamil Nadu,active,2024-02-02 11:00:00
D4,Saket Verma,9666666666,DL-1004,BlueRoute,Hyderabad,Telangana,active,2024-02-11 14:00:00
`,
};

describe('useLogisticsAnalytics', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input).split('/').pop() ?? '';
      const csvText = sampleCsvs[url as keyof typeof sampleCsvs] ?? '';

      return {
        ok: true,
        text: async () => csvText,
      } as Response;
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads CSV data and computes the key delivery metrics and narrative', async () => {
    const { result } = renderHook(() => useLogisticsAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summaryStats.totalOrders).toBe(8);
    expect(result.current.summaryStats.totalFailedLate).toBe(6);
    expect(result.current.cityInsights[0]).toMatchObject({ city: 'Bengaluru', failures: 4 });
    expect(result.current.narrative).toContain('Bengaluru');
    expect(result.current.recommendations.length).toBeGreaterThan(0);
    expect(result.current.topReasons[0].count).toBeGreaterThanOrEqual(1);
  });
});
