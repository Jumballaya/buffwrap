import BufferWrap from "../../dist";
import { config, TestStruct } from "../helper";

test("Can set and get single and vector values", () => {
  const buffer = new BufferWrap<TestStruct>(config);
  const entry = buffer.at(0);

  entry.a = 42;
  entry.b = [1.1, 2.2];

  expect(entry.a).toBe(42);
  expect(entry.b[0]).toBeCloseTo(1.1);
  expect(entry.b[1]).toBeCloseTo(2.2);
});

test("Can move one entry to another index", () => {
  const buffer = new BufferWrap<TestStruct>(config);
  buffer.at(0).a = 123;
  buffer.at(0).b = [3.14, 6.28];

  buffer.move(0, 1);

  expect(buffer.at(1).a).toBe(123);
  expect(buffer.at(1).b[0]).toBeCloseTo(3.14);
  expect(buffer.at(1).b[1]).toBeCloseTo(6.28);
});

test("Can insert raw struct at index", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });

  buffer.insert(0, {
    a: new Uint8Array([99]),
    b: new Float32Array([2.2, 3.3]),
  });

  expect(buffer.at(0).a).toBe(99);
  expect(buffer.at(0).b[0]).toBeCloseTo(2.2);
  expect(buffer.at(0).b[1]).toBeCloseTo(3.3);
});

test("Can copy into another BufferWrap", () => {
  const src = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  const dst = new BufferWrap<TestStruct>({ ...config, capacity: 2 });

  src.at(0).a = 55;
  src.at(0).b = [4, 5];

  src.copyInto(dst);

  expect(dst.at(0).a).toBe(55);
  expect(dst.at(0).b).toStrictEqual([4, 5]);
});

test("Can extract typed attribute buffer", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;

  const aBuffer = buffer.getAttributeBuffer("a");
  expect(aBuffer[0]).toBe(1);
  expect(aBuffer[1]).toBe(2);
});

test("Can populate from another buffer", () => {
  const source = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  const target = new BufferWrap<TestStruct>({ ...config, capacity: 2 });

  source.at(0).a = 77;
  source.at(0).b = [1.23, 4.56];

  target.from(source.buffer);

  expect(target.at(0).a).toBe(77);
  expect(target.at(0).b[0]).toBeCloseTo(1.23);
  expect(target.at(0).b[1]).toBeCloseTo(4.56);
});

test("Can iterate through all elements", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 3 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;
  buffer.at(2).a = 3;

  const values = [...buffer.iterate()].map((entry) => entry.a);
  expect(values).toStrictEqual([1, 2, 3]);
});
