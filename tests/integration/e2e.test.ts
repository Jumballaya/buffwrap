import { ArrayBufferStrategy } from "../../src";
import { BufferWrap } from "../../src/BufferWrap";
import { BufferList } from "../../src/types";
import { TestStruct, config } from "../helper";

test("Full roundtrip: from -> insert -> move -> copyInto -> verify", () => {
  const initial: BufferList<TestStruct> = {
    a: new Uint8Array([10, 20, 30]),
    b: new Float32Array([1.1, 1.2, 2.1, 2.2, 3.1, 3.2]),
  };

  const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 3,
  });
  buffer.from(initial);

  buffer.insert(1, {
    a: new Uint8Array([99]),
    b: new Float32Array([9.9, 9.8]),
  });

  buffer.move(3, 0);

  const output: BufferList<TestStruct> = {
    a: new Uint8Array(buffer.stride),
    b: new Float32Array(buffer.stride * 2),
  };

  buffer.copyInto(output);

  const values = [...buffer.iterate()].map((item) => ({
    a: item.a,
    b: item.b,
  }));

  values.forEach((val, i) => {
    expect(output.a![i]).toBe(val.a);
    expect(output.b![i * 2 + 0]).toBeCloseTo(val.b[0]);
    expect(output.b![i * 2 + 1]).toBeCloseTo(val.b[1]);
  });
});

test("Full roundtrip with slice: from -> slice -> modify -> copyInto", () => {
  const source: BufferList<TestStruct> = {
    a: new Uint8Array([1, 2, 3]),
    b: new Float32Array([1.1, 1.2, 2.1, 2.2, 3.1, 3.2]),
  };

  const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 3,
  });
  buffer.from(source);

  const slice = buffer.slice(1, 3); // index 1 and 2

  // Modify slice
  slice.at(0).a = 9;
  slice.at(1).b = [99.9, 88.8];

  const out: BufferList<TestStruct> = {
    a: new Uint8Array(3),
    b: new Float32Array(6),
  };

  buffer.copyInto(out);

  expect(Array.from(out.a!)).toEqual([1, 9, 3]);
  expect(out.b![0]).toBeCloseTo(1.1);
  expect(out.b![1]).toBeCloseTo(1.2);
  expect(out.b![2]).toBeCloseTo(2.1); // unchanged
  expect(out.b![3]).toBeCloseTo(2.2); // unchanged
  expect(out.b![4]).toBeCloseTo(99.9);
  expect(out.b![5]).toBeCloseTo(88.8);
});

test("Hydrate from shared buffer and verify slices share data", () => {
  const sharedBuffer = new ArrayBuffer(config().capacity * 3 * 8); // oversized for safety

  const bufferA = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 3,
    buffer: sharedBuffer,
  });

  const bufferB = bufferA.slice(0);

  bufferA.at(0).a = 42;
  bufferA.at(0).b = [3.14, 2.71];

  // Verify that bufferB sees the changes because they share memory
  expect(bufferB.at(0).a).toBe(42);
  expect(bufferB.at(0).b[0]).toBeCloseTo(3.14);
  expect(bufferB.at(0).b[1]).toBeCloseTo(2.71);

  // Now test with slices too
  const sliceA = bufferA.slice(0, 1);
  const sliceB = bufferB.slice(0, 1);

  sliceB.at(0).a = 99;
  sliceA.at(0).b = [1.1, 1.2];

  expect(bufferA.at(0).a).toBe(99);
  expect(bufferB.at(0).b[0]).toBeCloseTo(1.1);
  expect(bufferB.at(0).b[1]).toBeCloseTo(1.2);
});

test("Insert and move between wraps sharing the same buffer", () => {
  const sharedBuffer = new ArrayBuffer(config().capacity * 3 * 8); // over-alloc for demo

  const bufferA = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 2,
    buffer: sharedBuffer,
  });

  const bufferB = bufferA.slice(0);

  bufferA.insert(0, {
    a: new Uint8Array([1]),
    b: new Float32Array([1.1, 1.2]),
  });

  bufferA.insert(1, {
    a: new Uint8Array([2]),
    b: new Float32Array([2.1, 2.2]),
  });

  // Move data inside bufferB and check visibility in A
  bufferB.move(0, 1);

  expect(bufferA.at(1).a).toBe(1);
  expect(bufferA.at(1).b[0]).toBeCloseTo(1.1);
  expect(bufferA.at(1).b[1]).toBeCloseTo(1.2);
});

test("Insert slice from shared buffer safely using copy", () => {
  const sharedBuffer = new ArrayBuffer(8 * 4 * 3); // enough for 3 entries

  // Create wrapA with the shared buffer
  const wrapA = new BufferWrap<TestStruct, ArrayBuffer>({
    ...config(),
    capacity: 2,
    buffer: sharedBuffer,
    strategy: ArrayBufferStrategy,
  });

  // Create wrapB with the same shared buffer
  const wrapB = wrapA.slice(0);

  // Insert data into wrapA
  wrapA.insert(0, {
    a: new Uint8Array([1]),
    b: new Float32Array([1.1, 1.2]),
  });

  wrapA.insert(1, {
    a: new Uint8Array([2]),
    b: new Float32Array([2.1, 2.2]),
  });

  // Slice the first item from wrapA (we will copy this slice into wrapB)
  const slice = wrapA.slice(0, 1);

  // Use copyInto to insert the data into wrapB (copying the slice data)
  slice.copyInto({
    a: new Uint8Array(1),
    b: new Float32Array(2),
  });

  // Ensure wrapB correctly receives the copied slice data
  expect(wrapB.at(0).a).toBe(1); // wrapB should have the inserted slice data
  expect(wrapB.at(0).b[0]).toBeCloseTo(1.1); // wrapB should match the slice values

  // Ensure wrapA's data remains intact (wrapA data should not be affected by wrapB's insert)
  expect(wrapA.at(1).a).toBe(2); // wrapA data should remain unchanged
  expect(wrapA.at(1).b[0]).toBeCloseTo(2.1); // wrapA data should remain unchanged
});
