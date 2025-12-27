import { describe, it, expect } from "bun:test";

function add(a: number, b: number) {
  return a + b;
}

describe("add function", () => {
  it("adds two numbers correctly", () => {
    expect(add(2, 3)).toBe(5);
  });
});
