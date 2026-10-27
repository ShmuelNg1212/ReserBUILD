import { describe, expect, it } from "vitest";
import { priceReservation, PricingError, type PricingRate } from "./pricing";
import { atLocal } from "./time";

// 2026-11-02 is a Monday, 2026-11-07 a Saturday. Times are Asia/Manila.
const at = (date: string, time: string) => atLocal(date, time);

let nextId = 1;
function rate(values: Partial<PricingRate>): PricingRate {
  return {
    rateId: nextId++,
    spaceId: null,
    dayOfWeek: null,
    startTime: "07:00:00",
    endTime: "17:00:00",
    hourlyRate: "100.00",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    ...values,
  };
}

const offPeak = rate({ startTime: "07:00:00", endTime: "17:00:00", hourlyRate: "100.00" });
const peak = rate({ startTime: "17:00:00", endTime: "22:00:00", hourlyRate: "150.00" });
const standard = [offPeak, peak];

function price(start: Date, end: Date, rates: PricingRate[], spaceId = 1) {
  return priceReservation({ spaceId, start, end, rates });
}

function code(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof PricingError) return e.code;
    throw e;
  }
  return undefined;
}

describe("priceReservation", () => {
  it("prices a booking inside one window", () => {
    const result = price(at("2026-11-02", "09:00"), at("2026-11-02", "11:30"), standard);
    expect(result.charges).toHaveLength(1);
    expect(result.charges[0]).toMatchObject({
      rateId: offPeak.rateId,
      hours: "2.50",
      rateApplied: "100.00",
      amount: "250.00",
    });
    expect(result.total).toBe("250.00");
  });

  it("splits a booking that crosses from off-peak to peak", () => {
    const result = price(at("2026-11-02", "16:00"), at("2026-11-02", "18:30"), standard);
    expect(result.charges.map((c) => [c.rateId, c.hours, c.amount])).toEqual([
      [offPeak.rateId, "1.00", "100.00"],
      [peak.rateId, "1.50", "225.00"],
    ]);
    expect(result.charges[0].segmentEnd).toEqual(at("2026-11-02", "17:00"));
    expect(result.charges[1].segmentStart).toEqual(at("2026-11-02", "17:00"));
    expect(result.total).toBe("325.00");
  });

  it("prefers a day-specific rate over a daily rate", () => {
    const saturday = rate({ dayOfWeek: "sat", startTime: "07:00:00", endTime: "22:00:00", hourlyRate: "80.00" });
    const sat = price(at("2026-11-07", "10:00"), at("2026-11-07", "12:00"), [...standard, saturday]);
    expect(sat.charges.map((c) => c.rateId)).toEqual([saturday.rateId]);
    expect(sat.total).toBe("160.00");

    const mon = price(at("2026-11-02", "10:00"), at("2026-11-02", "12:00"), [...standard, saturday]);
    expect(mon.charges.map((c) => c.rateId)).toEqual([offPeak.rateId]);
  });

  it("prefers a space-specific rate over an all-spaces rate", () => {
    const spaceB = rate({ spaceId: 2, startTime: "07:00:00", endTime: "22:00:00", hourlyRate: "200.00" });
    const inB = price(at("2026-11-02", "10:00"), at("2026-11-02", "11:00"), [...standard, spaceB], 2);
    expect(inB.total).toBe("200.00");
    const inA = price(at("2026-11-02", "10:00"), at("2026-11-02", "11:00"), [...standard, spaceB], 1);
    expect(inA.total).toBe("100.00");
  });

  it("ranks space-specific daily above all-spaces day-specific", () => {
    const spaceDaily = rate({ spaceId: 1, startTime: "07:00:00", endTime: "22:00:00", hourlyRate: "120.00" });
    const allSaturday = rate({ dayOfWeek: "sat", startTime: "07:00:00", endTime: "22:00:00", hourlyRate: "80.00" });
    const result = price(at("2026-11-07", "10:00"), at("2026-11-07", "11:00"), [spaceDaily, allSaturday], 1);
    expect(result.charges.map((c) => c.rateId)).toEqual([spaceDaily.rateId]);
  });

  it("uses a rate only within its effective dates", () => {
    const old = rate({ hourlyRate: "90.00", effectiveFrom: "2026-01-01", effectiveTo: "2026-11-01" });
    const current = rate({ hourlyRate: "110.00", effectiveFrom: "2026-11-02" });
    const before = price(at("2026-11-01", "10:00"), at("2026-11-01", "11:00"), [old, current]);
    expect(before.total).toBe("90.00");
    const onFirstDay = price(at("2026-11-02", "10:00"), at("2026-11-02", "11:00"), [old, current]);
    expect(onFirstDay.total).toBe("110.00");
  });

  it("includes the last effective day", () => {
    const ending = rate({ effectiveTo: "2026-11-02" });
    expect(price(at("2026-11-02", "10:00"), at("2026-11-02", "11:00"), [ending]).total).toBe("100.00");
  });

  it("fails when part of the booking has no rate", () => {
    expect(code(() => price(at("2026-11-02", "21:00"), at("2026-11-02", "23:00"), standard))).toBe("NO_RATE");
    expect(code(() => price(at("2026-11-02", "06:00"), at("2026-11-02", "08:00"), standard))).toBe("NO_RATE");
  });

  it("fails when two rates of the same rank overlap", () => {
    const dup = rate({ startTime: "09:00:00", endTime: "12:00:00", hourlyRate: "999.00" });
    expect(code(() => price(at("2026-11-02", "10:00"), at("2026-11-02", "11:00"), [...standard, dup]))).toBe(
      "RATE_CONFLICT",
    );
  });

  it("fails when the booking crosses midnight", () => {
    const allDay = rate({ startTime: "00:00:00", endTime: "23:59:59" });
    expect(code(() => price(at("2026-11-02", "23:00"), at("2026-11-03", "01:00"), [allDay]))).toBe("CROSSES_DAY");
  });

  it("rounds each segment to the nearest cent", () => {
    const odd = rate({ startTime: "07:00:00", endTime: "22:00:00", hourlyRate: "99.99" });
    // 0.5 h × 99.99 = 49.995 → 50.00
    const result = price(at("2026-11-02", "10:00"), at("2026-11-02", "10:30"), [odd]);
    expect(result.charges[0].amount).toBe("50.00");
    expect(result.totalCents).toBe(5000);
  });

  it("merges adjacent windows that use the same rate", () => {
    const morning = rate({ startTime: "07:00:00", endTime: "12:00:00" });
    const result = price(at("2026-11-02", "10:00"), at("2026-11-02", "14:00"), [
      morning,
      rate({ rateId: morning.rateId, startTime: "12:00:00", endTime: "17:00:00" }),
    ]);
    expect(result.charges).toHaveLength(1);
    expect(result.charges[0].hours).toBe("4.00");
  });
});
