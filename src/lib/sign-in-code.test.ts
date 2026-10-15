import { describe, expect, it } from "vitest";
import { normaliseSignInCode } from "./sign-in-code";

describe("normaliseSignInCode", () => {
  it("accepts six digits, ignoring spaces and dashes", () => {
    expect(normaliseSignInCode("123456")).toBe("123456");
    expect(normaliseSignInCode(" 123 456 ")).toBe("123456");
    expect(normaliseSignInCode("123-456")).toBe("123456");
  });

  it("rejects anything else", () => {
    for (const value of ["12345", "1234567", "12a456", "", null, undefined]) {
      expect(normaliseSignInCode(value)).toBeNull();
    }
  });
});
