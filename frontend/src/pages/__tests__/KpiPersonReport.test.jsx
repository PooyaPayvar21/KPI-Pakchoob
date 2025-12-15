import { describe, it, expect } from "vitest";
import { buildEmployeeStateFromEntries } from "../../pages/KpiPersonReport.jsx";

describe("buildEmployeeStateFromEntries", () => {
  it("builds employee array from entries with name and count", () => {
    const entries = [
      {
        full_name: "John Doe",
        employee: { fullName: "John Doe", username: "12345" },
      },
      { employee: { fullName: "John Doe", username: "12345" } },
    ];
    const result = buildEmployeeStateFromEntries(entries, "12345");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].personal_code).toBe("12345");
    expect(result[0].full_name).toBe("John Doe");
    expect(result[0].entry_count).toBe(2);
  });
  it("falls back to personal_code when name missing", () => {
    const entries = [{}];
    const result = buildEmployeeStateFromEntries(entries, "999");
    expect(result[0].full_name).toBe("999");
  });
});

