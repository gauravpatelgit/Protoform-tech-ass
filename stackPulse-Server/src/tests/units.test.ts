import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasBudgetForEnrichment,
  rateLimitState,
  recordRateLimit,
  resetRateLimitState,
  secondsUntilAvailable,
  blockFor,
} from "#integrations/github/rateLimit.js";
import { parseUsernameList, normalizeUsername } from "#service/developerSync.service.js";
import { recentWeekStarts, weekStartOf } from "#utils/dates.js";
import { SingleFlight } from "#utils/singleflight.js";

describe("dates", () => {
  it("buckets dates into Monday-start UTC weeks", () => {
    expect(weekStartOf(new Date("2026-10-14T12:00:00Z"))).toBe("2026-10-12");
    expect(weekStartOf(new Date("2026-10-12T00:00:00Z"))).toBe("2026-10-12");
    expect(weekStartOf(new Date("2026-10-18T23:59:59Z"))).toBe("2026-10-12");
    expect(weekStartOf(new Date("2026-10-19T00:00:00Z"))).toBe("2026-10-19");
  });

  it("lists consecutive weeks ending with the current one", () => {
    const weeks = recentWeekStarts(3, new Date("2026-10-14T12:00:00Z"));
    expect(weeks).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(recentWeekStarts(52)).toHaveLength(52);
  });
});

describe("SingleFlight", () => {
  it("shares one task between concurrent callers and runs again afterwards", async () => {
    const flight = new SingleFlight<number>();
    const task = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 42;
    });

    const results = await Promise.all([flight.run("k", task), flight.run("k", task), flight.run("k", task)]);
    expect(results).toEqual([42, 42, 42]);
    expect(task).toHaveBeenCalledTimes(1);

    await flight.run("k", task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("releases the key after a failure", async () => {
    const flight = new SingleFlight<number>();
    await expect(flight.run("k", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(flight.run("k", async () => 1)).resolves.toBe(1);
  });
});

describe("rate limit state", () => {
  afterEach(resetRateLimitState);

  it("records GitHub headers and blocks while the quota is exhausted", () => {
    const reset = Math.floor(Date.now() / 1000) + 120;
    recordRateLimit(new Headers({ "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) }));

    expect(rateLimitState.limit).toBe(5000);
    expect(secondsUntilAvailable()).toBeGreaterThan(100);
    expect(hasBudgetForEnrichment()).toBe(false);
  });

  it("skips enrichment below 10% of the quota but still allows primary calls", () => {
    recordRateLimit(new Headers({ "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "400", "x-ratelimit-reset": "1" }));
    expect(secondsUntilAvailable()).toBe(0);
    expect(hasBudgetForEnrichment()).toBe(false);

    recordRateLimit(new Headers({ "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "4000" }));
    expect(hasBudgetForEnrichment()).toBe(true);
  });

  it("honours an explicit secondary-limit block", () => {
    blockFor(30);
    expect(secondsUntilAvailable()).toBeGreaterThan(25);
  });
});

describe("username validation", () => {
  it("accepts GitHub-style names and rejects the rest", () => {
    expect(normalizeUsername(" octocat ")).toBe("octocat");
    expect(normalizeUsername("a-b-c")).toBe("a-b-c");
    for (const bad of ["", "-lead", "trail-", "dou--ble", "has space", "a".repeat(40), "under_score", "../etc"]) {
      expect(() => normalizeUsername(bad)).toThrow();
    }
  });

  it("splits, de-duplicates case-insensitively and enforces the count", () => {
    expect(parseUsernameList(["a,b", "A", "c"])).toEqual(["a", "b", "c"]);
    expect(() => parseUsernameList(["a"])).toThrow();
    expect(() => parseUsernameList(["a,a,A"])).toThrow();
    expect(() => parseUsernameList(["a,b,c,d,e,f"])).toThrow();
  });
});
