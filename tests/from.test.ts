import BufferWrap from "../dist";
import { config, TestStruct } from "./helper";

test("Loads from raw ArrayBuffer", () => {
  const source = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  source.at(0).a = 42;
  source.at(0).b = [1.1, 2.2];

  const target = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  target.from(source.buffer);

  expect(target.at(0).a).toBe(42);
  expect(target.at(0).b[0]).toBeCloseTo(1.1);
  expect(target.at(0).b[1]).toBeCloseTo(2.2);
});

test("Loads from partial buffer list", () => {
  const a = new Uint8Array([5, 10]);
  const b = new Float32Array([1.5, 2.5, 3.5, 4.5]);

  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.from({ a, b });

  expect(buffer.at(0).a).toBe(5);
  expect(buffer.at(1).a).toBe(10);
  expect(buffer.at(0).b[0]).toBeCloseTo(1.5);
  expect(buffer.at(0).b[1]).toBeCloseTo(2.5);
  expect(buffer.at(1).b[0]).toBeCloseTo(3.5);
  expect(buffer.at(1).b[1]).toBeCloseTo(4.5);
});

test("Overwrites existing values on from", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  buffer.at(0).a = 100;
  buffer.at(0).b = [9.9, 9.9];

  const newA = new Uint8Array([42]);
  const newB = new Float32Array([7.7, 8.8]);
  buffer.from({ a: newA, b: newB });

  expect(buffer.at(0).a).toBe(42);
  expect(buffer.at(0).b[0]).toBeCloseTo(7.7);
  expect(buffer.at(0).b[1]).toBeCloseTo(8.8);
});

test("Loads from structured typed arrays", () => {
  const a = new Uint8Array([1, 2]);
  const b = new Float32Array([3.3, 4.4, 5.5, 6.6]);
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });

  buffer.from({ a, b });

  expect(buffer.at(0).a).toBe(1);
  expect(buffer.at(1).a).toBe(2);
  expect(buffer.at(0).b[0]).toBeCloseTo(3.3);
  expect(buffer.at(0).b[1]).toBeCloseTo(4.4);
  expect(buffer.at(1).b[0]).toBeCloseTo(5.5);
  expect(buffer.at(1).b[1]).toBeCloseTo(6.6);
});

test("from() clears proxy and attribute cache", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  const proxy = buffer.at(0);
  const view = buffer.getAttributeBuffer("a");

  buffer.from({ a: new Uint8Array([7]), b: new Float32Array([1.1, 2.2]) });

  expect(buffer.at(0)).not.toBe(proxy);
  expect(buffer.getAttributeBuffer("a")).not.toBe(view);
});

test("Handles partial input for some fields only", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 5;
  buffer.at(0).b = [1.1, 2.2];
  buffer.at(1).a = 6;
  buffer.at(1).b = [3.3, 4.4];

  const a = new Uint8Array([9, 8]);
  buffer.from({ a });

  expect(buffer.at(0).a).toBe(9);
  expect(buffer.at(1).a).toBe(8);
  expect(buffer.at(0).b[0]).toBeCloseTo(1.1);
  expect(buffer.at(0).b[1]).toBeCloseTo(2.2);
  expect(buffer.at(1).b[0]).toBeCloseTo(3.3);
  expect(buffer.at(1).b[1]).toBeCloseTo(4.4);
});
