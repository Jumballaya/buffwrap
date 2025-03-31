import BufferWrap from "../dist";
import { config, TestStruct } from "./helper";

test("Insert from ArrayBuffer", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  buffer.at(0).a = 10;

  const raw = buffer.buffer.slice(0, buffer.stride);
  buffer.insert(0, raw);

  expect(buffer.at(0).a).toBe(10);
  expect(buffer.at(1).a).toBe(10);
});

test("Insert from struct of buffers", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 1 });

  const a = new Uint8Array([123]);
  const b = new Float32Array([1.1, 2.2]);
  buffer.insert(1, { a, b });

  expect(buffer.at(1).a).toBe(123);
  expect(buffer.at(1).b[0]).toBeCloseTo(1.1);
  expect(buffer.at(1).b[1]).toBeCloseTo(2.2);
});

test("Insert from another BufferWrap", () => {
  const source = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  source.at(0).a = 77;
  source.at(0).b = [9.9, 8.8];

  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;

  buffer.insert(1, source);

  expect(buffer.at(1).a).toBe(77);
  expect(buffer.at(1).b[0]).toBeCloseTo(9.9);
});

test("Insert at the beginning shifts all data", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 10;
  buffer.at(1).a = 20;

  buffer.insert(0, { a: new Uint8Array([5]), b: new Float32Array([0, 0]) });

  expect(buffer.at(0).a).toBe(5);
  expect(buffer.at(1).a).toBe(10);
  expect(buffer.at(2).a).toBe(20);
});

test("Insert at end appends data", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;

  buffer.insert(2, { a: new Uint8Array([3]), b: new Float32Array([0, 0]) });

  expect(buffer.at(2).a).toBe(3);
});

test("Insert into empty buffer initializes correctly", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 0 });
  buffer.insert(0, {
    a: new Uint8Array([99]),
    b: new Float32Array([1.1, 2.2]),
  });

  expect(buffer.at(0).a).toBe(99);
  expect(buffer.at(0).b[0]).toBeCloseTo(1.1);
});

test("Insert triggers buffer reallocation", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  buffer.insert(1, {
    a: new Uint8Array([42]),
    b: new Float32Array([3.3, 4.4]),
  });

  expect(buffer.at(1).a).toBe(42);
});

test("Insert rejects incompatible BufferWrap", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });

  const otherConfig = {
    ...config,
    struct: { a: 1, b: 3 },
    types: config.types,
    capacity: 1,
  };
  const other = new BufferWrap<TestStruct>(otherConfig);

  expect(() => buffer.insert(0, other)).toThrow();
});

test("Insert from slice of itself does not corrupt", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 3 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;
  buffer.at(2).a = 3;

  const slice = buffer.slice(1, 2);
  buffer.insert(1, slice);

  expect(buffer.at(1).a).toBe(2);
  expect(buffer.at(2).a).toBe(2);
});

test("Insert with partial struct buffer only modifies present fields", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  buffer.at(0).a = 1;
  buffer.at(0).b = [5.5, 6.6];

  buffer.insert(1, { a: new Uint8Array([9]) });

  expect(buffer.at(1).a).toBe(9);
  expect(buffer.at(1).b).toStrictEqual([0, 0]);
});
