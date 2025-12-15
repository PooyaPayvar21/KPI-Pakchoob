import { describe, it, expect } from "vitest";
import { joinDataUsingApprovalChains } from "../../utils/kpiJoin.js";

describe("joinDataUsingApprovalChains", () => {
  it("joins users from approval chains and fetches KPIs", async () => {
    const managerCode = "1000";
    const allUsers = [
      { id: "u-1", username: "2001", email: "a@x" },
      { id: "u-2", username: "2002", email: "b@x" },
      { id: "mgr", username: "1000", email: "m@x" },
    ];
    const chainsByBranch = [
      [
        { employeeId: "2001", managerId: "1000" },
        { employeeId: "2002", managerId: "1000" },
      ],
    ];
    const fetchKpisByEmployeeId = async (id) => {
      if (id === "u-1") {
        return [{ id: "k1", employeeId: "u-1", kpiNameEn: "A" }];
      }
      if (id === "u-2") {
        return [
          { id: "k2", employeeId: "u-2", kpiNameEn: "B" },
          { id: "k3", employeeId: "u-2", kpiNameEn: "C" },
        ];
      }
      return [];
    };
    const result = await joinDataUsingApprovalChains(
      managerCode,
      allUsers,
      chainsByBranch,
      fetchKpisByEmployeeId
    );
    expect(result.users.length).toBe(2);
    expect(result.kpis.length).toBe(3);
  });

  it("returns empty when no chains match manager", async () => {
    const managerCode = "9999";
    const allUsers = [{ id: "u-1", username: "2001", email: "a@x" }];
    const chainsByBranch = [[{ employeeId: "2001", managerId: "1000" }]];
    const fetchKpisByEmployeeId = async () => [];
    const result = await joinDataUsingApprovalChains(
      managerCode,
      allUsers,
      chainsByBranch,
      fetchKpisByEmployeeId
    );
    expect(result.users.length).toBe(0);
    expect(result.kpis.length).toBe(0);
  });

  it("handles missing users mapping", async () => {
    const managerCode = "1000";
    const allUsers = [];
    const chainsByBranch = [[{ employeeId: "2001", managerId: "1000" }]];
    const fetchKpisByEmployeeId = async () => [];
    const result = await joinDataUsingApprovalChains(
      managerCode,
      allUsers,
      chainsByBranch,
      fetchKpisByEmployeeId
    );
    expect(result.users.length).toBe(0);
    expect(result.kpis.length).toBe(0);
  });
});
