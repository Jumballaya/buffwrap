import BufferWrap from "../../dist";
import { config, TestStruct } from "../helper";

test("iterate yields all elements in order", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 3 });
  buffer.at(0).a = 10;
  buffer.at(1).a = 20;
  buffer.at(2).a = 30;

  const result = Array.from(buffer.iterate()).map((proxy) => proxy.a);
  expect(result).toEqual([10, 20, 30]);
});

test("iterate works on empty buffer", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 0 });
  const result = Array.from(buffer.iterate());
  expect(result).toEqual([]);
});

test("iterate preserves correct vector data", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).b = [1, 2];
  buffer.at(1).b = [3, 4];

  const result = Array.from(buffer.iterate()).map((proxy) => proxy.b);
  expect(result).toEqual([
    [1, 2],
    [3, 4],
  ]);
});

test("iterate() yields nothing on empty buffer", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 0 });
  const result = [...buffer.iterate()];
  expect(result.length).toBe(0);
});

test("iterate() reflects live changes to buffer during iteration", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 3 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;
  buffer.at(2).a = 3;

  const result: number[] = [];
  for (const proxy of buffer.iterate()) {
    result.push(proxy.a);
    proxy.a += 10;
  }

  expect(result).toEqual([1, 2, 3]);
  expect(buffer.at(0).a).toBe(11);
  expect(buffer.at(1).a).toBe(12);
  expect(buffer.at(2).a).toBe(13);
});

test("iterate() works correctly on a slice", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 5 });
  buffer.at(3).a = 77;

  const slice = buffer.slice(3, 5);
  const values = [...slice.iterate()].map((p) => p.a);

  expect(values).toContain(77);
});

test("Multiple iterate() calls work independently", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;

  const a = [...buffer.iterate()].map((p) => p.a);
  const b = [...buffer.iterate()].map((p) => p.a);

  expect(a).toEqual(b);
});

test("Deleting a key from proxy during iteration doesn't crash", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;

  for (const proxy of buffer.iterate()) {
    // @ts-expect-error
    delete proxy.a;
  }

  expect(buffer.at(0).a).toBe(1); // unchanged
});
