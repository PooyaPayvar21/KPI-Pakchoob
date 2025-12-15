import { describe, it, expect } from "vitest";
import { deriveUsersFromState } from "../../pages/KpiBulkAssign.jsx";

describe("deriveUsersFromState", () => {
  it("extracts users from navigation state", () => {
    const state = {
      employees: [
        { personal_code: "100", full_name: "Alice", entry_count: 5 },
        { personal_code: "200", full_name: "Bob", entry_count: 3 },
      ],
    };
    const users = deriveUsersFromState(state);
    expect(users.length).toBe(2);
    expect(users[0].personal_code).toBe("100");
    expect(users[0].full_name).toBe("Alice");
    expect(users[0].entry_count).toBe(5);
  });
  it("ignores invalid entries", () => {
    const state = { employees: [{ full_name: "NoCode" }] };
    const users = deriveUsersFromState(state);
    expect(users.length).toBe(0);
  });
});

