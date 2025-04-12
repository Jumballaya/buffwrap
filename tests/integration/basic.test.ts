import { BufferWrap } from "../../src/BufferWrap";
import { BufferList } from "../../src/types";
import { TestStruct, config } from "../helper";

test("Hydrate from typed buffers and iterate to verify contents", () => {
  const sourceData = {
    a: new Uint8Array([1, 2, 3]),
    b: new Float32Array([1.1, 1.2, 2.1, 2.2, 3.1, 3.2]),
  };

  const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 3,
  });
  buffer.from(sourceData);

  const values = [...buffer.iterate()].map((item) => ({
    a: item.a,
    b: item.b,
  }));

  expect(values[0].a).toBe(1);
  expect(values[0].b[0]).toBeCloseTo(1.1);
  expect(values[0].b[1]).toBeCloseTo(1.2);

  expect(values[1].a).toBe(2);
  expect(values[1].b[0]).toBeCloseTo(2.1);
  expect(values[1].b[1]).toBeCloseTo(2.2);

  expect(values[2].a).toBe(3);
  expect(values[2].b[0]).toBeCloseTo(3.1);
  expect(values[2].b[1]).toBeCloseTo(3.2);
});

test("Move then slice then modify", () => {
  const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 3,
  });
  buffer.at(0).a = 7;
  buffer.at(0).b = [1, 2];

  buffer.move(0, 2);

  const slice = buffer.slice(2, 3);
  slice.at(0).a = 99;

  expect(buffer.at(2).a).toBe(99);
});

test("Chain insert -> move -> copyInto preserves correct values", () => {
  const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 0,
  });

  buffer.insert(0, {
    a: new Uint8Array([1]),
    b: new Float32Array([1.1, 1.2]),
  });

  buffer.insert(1, {
    a: new Uint8Array([2]),
    b: new Float32Array([2.1, 2.2]),
  });

  // Overwrite index 1 with index 0
  buffer.move(0, 1);

  const target: BufferList<TestStruct> = {
    a: new Uint8Array(2),
    b: new Float32Array(4),
  };

  buffer.copyInto(target);

  expect(Array.from(target.a!)).toEqual([1, 1]); // both indices are now the same
  expect(target.b![0]).toBeCloseTo(1.1);
  expect(target.b![1]).toBeCloseTo(1.2);
  expect(target.b![2]).toBeCloseTo(1.1);
  expect(target.b![3]).toBeCloseTo(1.2);
});

test("Insert and copyInto BufferList", () => {
  const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 0,
  }); // start with 0 capacity
  buffer.insert(0, {
    a: new Uint8Array([5]),
    b: new Float32Array([5.5, 6.6]),
  });

  // buffer.config.capacity === 1 now
  const target: BufferList<TestStruct> = {
    a: new Uint8Array(1),
    b: new Float32Array(2),
  };

  buffer.copyInto(target);

  expect(Array.from(target.a!)).toEqual([5]);
  expect(target.b![0]).toBeCloseTo(5.5);
  expect(target.b![1]).toBeCloseTo(6.6);
});
