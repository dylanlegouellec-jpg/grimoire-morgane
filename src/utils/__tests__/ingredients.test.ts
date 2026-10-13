import { describe, it, expect } from "vitest";
import { parseQuantity } from "../ingredients";

describe("parseQuantity", () => {
  it("accepte la virgule du clavier français et le point", () => {
    expect(parseQuantity("0,5")).toBe(0.5);
    expect(parseQuantity("12.5")).toBe(12.5);
    expect(parseQuantity(" 200 ")).toBe(200);
    expect(parseQuantity(3)).toBe(3);
  });

  it("comprend les fractions et les nombres mixtes", () => {
    expect(parseQuantity("1/2")).toBe(0.5);
    expect(parseQuantity("1 1/2")).toBe(1.5);
    expect(parseQuantity("3 / 4")).toBe(0.75);
  });

  it("renvoie 0 pour une saisie vide ou illisible (jamais NaN)", () => {
    expect(parseQuantity("")).toBe(0);
    expect(parseQuantity(null)).toBe(0);
    expect(parseQuantity("abc")).toBe(0);
    expect(parseQuantity("1/0")).toBe(0);
    expect(parseQuantity("-2")).toBe(0);
  });
});
