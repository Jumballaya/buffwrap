import BufferWrap from "../../dist";
import { config, TestStruct } from "../helper";

test("swaps two elements and their values", () => {
  const buffer = new BufferWrap<TestStruct>(config);

  buffer.at(0).a = 1;
  buffer.at(0).b = [1.1, 1.2];

  buffer.at(1).a = 2;
  buffer.at(1).b = [2.1, 2.2];

  console.log("[Before Swap] Raw bytes:", new Uint8Array(buffer.buffer));

  buffer.swap(0, 1);

  console.log("[After Swap] Raw bytes:", new Uint8Array(buffer.buffer));

  // Get fresh proxies to avoid stale references
  const newA = buffer.at(0);
  const newB = buffer.at(1);

  expect(newA.a).toBe(2);
  expect(newA.b[0]).toBeCloseTo(2.1);
  expect(newA.b[1]).toBeCloseTo(2.2);
  expect(newB.a).toBe(1);
  expect(newB.b[0]).toBeCloseTo(1.1);
  expect(newB.b[1]).toBeCloseTo(1.2);
});

test("swap is a no-op when a === b", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config });
  buffer.at(1).a = 99;
  buffer.at(1).b = [9.9, 9.8];

  buffer.swap(1, 1);

  expect(buffer.at(1).a).toBe(99);
  expect(buffer.at(1).b[0]).toBeCloseTo(9.9);
  expect(buffer.at(1).b[1]).toBeCloseTo(9.8);
});

test("throws on out-of-bounds indices", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config });
  expect(() => buffer.swap(-1, 0)).toThrow();
  expect(() => buffer.swap(0, 4)).toThrow();
});

test("swapped proxies are still valid", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config });
  const a = buffer.at(0);
  const b = buffer.at(1);

  a.a = 5;
  b.a = 6;

  buffer.swap(0, 1);

  // expect(buffer.at(0)).toBe(b);
  // expect(buffer.at(1)).toBe(a);
  expect(buffer.at(0).a).toBe(6);
  expect(buffer.at(1).a).toBe(5);
});
