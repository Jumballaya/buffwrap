import { BufferWrap } from "../../src";
import { config, TestStruct } from "../helper";

describe("BufferWrap [slice]", () => {
  test("Slice returns shared view", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>(config());
    buffer.at(1).a = 100;
    buffer.at(1).b = [9, 9];

    const slice = buffer.slice(1, 2);
    expect(slice.at(0).a).toBe(100);
    expect(slice.at(0).b).toStrictEqual([9, 9]);

    // Modify slice and see changes in original
    slice.at(0).a = 88;
    expect(buffer.at(1).a).toBe(88);
  });

  test("Slice shares memory with original buffer", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 4,
    });

    buffer.at(1).a = 42;
    buffer.at(1).b = [7.7, 8.8];

    const slice = buffer.slice(1, 2);

    expect(slice.at(0).a).toBe(42);
    expect(slice.at(0).b[0]).toBeCloseTo(7.7);
    expect(slice.at(0).b[1]).toBeCloseTo(8.8);

    slice.at(0).a = 99;
    slice.at(0).b = [1.1, 2.2];

    expect(buffer.at(1).a).toBe(99);
    expect(buffer.at(1).b[0]).toBeCloseTo(1.1);
    expect(buffer.at(1).b[1]).toBeCloseTo(2.2);
  });

  test("Multiple slices share memory correctly", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });
    buffer.at(0).a = 10;
    buffer.at(1).a = 20;
    buffer.at(2).a = 30;

    const slice1 = buffer.slice(0, 2);
    const slice2 = buffer.slice(1, 3);

    slice1.at(0).a = 99;
    expect(buffer.at(0).a).toBe(99);

    slice2.at(1).a = 77;
    expect(buffer.at(2).a).toBe(77);
  });

  test("Nested slices work correctly", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 4,
    });
    buffer.at(2).a = 55;

    const slice1 = buffer.slice(1, 4);
    const slice2 = slice1.slice(1, 2); // maps to index 2 in original

    expect(slice2.at(0).a).toBe(55);

    slice2.at(0).a = 88;
    expect(buffer.at(2).a).toBe(88);
  });

  test("Slicing respects struct boundaries", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });

    buffer.at(0).a = 1;
    buffer.at(1).a = 2;
    buffer.at(2).a = 3;

    const slice = buffer.slice(1, 2);

    expect(slice.at(0).a).toBe(2);
    slice.at(0).a = 99;

    expect(buffer.at(0).a).toBe(1);
    expect(buffer.at(1).a).toBe(99);
    expect(buffer.at(2).a).toBe(3);
  });

  test("Modifying slice does not affect unrelated indices", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });
    buffer.at(0).a = 5;
    buffer.at(1).a = 6;
    buffer.at(2).a = 7;

    const slice = buffer.slice(1, 2);
    slice.at(0).a = 100;

    expect(buffer.at(0).a).toBe(5);
    expect(buffer.at(1).a).toBe(100);
    expect(buffer.at(2).a).toBe(7);
  });

  test("Can slice multiple times (deep nesting)", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 5,
    });
    buffer.at(3).a = 124;

    const slice1 = buffer.slice(2, 5);
    const slice2 = slice1.slice(1, 2);
    const slice3 = slice2.slice(0, 1);

    expect(slice3.at(0).a).toBe(124);

    slice3.at(0).a = 31;
    expect(buffer.at(3).a).toBe(31);
  });

  test("Vector fields are preserved in slices", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.at(1).b = [6.6, 7.7];

    const slice = buffer.slice(1, 2);
    expect(slice.at(0).b[0]).toBeCloseTo(6.6);
    expect(slice.at(0).b[1]).toBeCloseTo(7.7);

    slice.at(0).b = [8.8, 9.9];
    expect(buffer.at(1).b[0]).toBeCloseTo(8.8);
    expect(buffer.at(1).b[1]).toBeCloseTo(9.9);
  });

  test("Invalid slices throw", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });

    expect(() => buffer.slice(2, 1)).toThrow();
    expect(() => buffer.slice(0, 0)).toThrow();
    expect(() => buffer.slice(1, 1)).toThrow();
  });
});
