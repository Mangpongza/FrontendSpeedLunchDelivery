import { AppData } from './app-data';
describe('AppData frontend demo', () => {
  it('assigns each order once, enforces three orders per rider and calculates wages', () => {
    const service = new AppData();
    service.calculatePlan();
    const plan = service.plan()!;
    const ids = plan.trips.flatMap((t) => t.stops.map((s) => s.order.id));
    expect(ids.length).toBe(24);
    expect(new Set(ids).size).toBe(24);
    expect(plan.trips.every((t) => t.stops.length <= 3)).toBe(true);
    for (const t of plan.trips) expect(t.riderWage).toBeCloseTo(15 + 2 * t.totalBoxes * t.totalKm);
    expect(plan.summary.profit).toBeCloseTo(
      plan.summary.revenue - plan.summary.foodCost - plan.summary.deliveryCost,
    );
  });
  it('issues unique jobs once and shares delivered status with the rider page', () => {
    const service = new AppData();
    service.calculatePlan();
    const jobs = service.confirmPlan();
    expect(jobs.length).toBe(8);
    expect(new Set(jobs.map((j) => j.jobCode)).size).toBe(8);
    expect(service.confirmPlan()).toEqual([]);
    const job = jobs[0];
    for (const stop of job.stops) service.markDelivered(job.jobCode, stop.order.id);
    const updated = service.findJob(job.jobCode)!;
    expect(updated.status).toBe('COMPLETED');
    expect(updated.stops.every((s) => s.deliveredAt)).toBe(true);
    service.calculatePlan();
    expect(service.plan()!.trips).toEqual([]);
  });
  it('handles an empty order list without producing a job', () => {
    const service = new AppData();
    service.orders.set([]);
    service.calculatePlan();
    expect(service.plan()!.summary.maxMinutes).toBe(0);
    expect(service.confirmPlan()).toEqual([]);
  });
});
