// src/lib/coach/coach.test.ts
import { describe, it, expect } from "vitest";
import { runCoachTests } from "./testRunner";
import { runSyncSimulations } from "../sync/syncTestRunner";

describe("Cognitive Mentor Engine - Audit & Verification Suite", () => {
  const coachSuite = runCoachTests();
  const tests = coachSuite.testResults || [];

  tests.forEach((test) => {
    it(test.name, () => {
      expect(test.success, test.detail).toBe(true);
    });
  });

  it("All Cognitive Mentor tests (T01-T27 + Legacy) must pass", () => {
    expect(coachSuite.passed).toBe(true);
  });
});

describe("Cloud State Sync & Offline Reconciliation", () => {
  const syncSuite = runSyncSimulations();
  const syncTests = syncSuite.results || [];

  syncTests.forEach((test) => {
    it(test.name, () => {
      expect(test.passed, test.detail).toBe(true);
    });
  });

  it("All sync simulations must pass", () => {
    expect(syncSuite.passed).toBe(true);
  });
});
