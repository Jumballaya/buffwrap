import { BufferWrap } from "../../src";
import { config, TestStruct } from "../helper";

describe("BufferWrap [at]", () => {
  test("Sanity check: logical index", () => {
    const buf = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });

    const p = buf.at(0);
    expect(p.currentIndex).toBe(0);
  });

  test("Can access and modify simple scalar field", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });

    const proxy = buffer.at(0);
    proxy.a = 42;
    expect(buffer.at(0).a).toBe(42);
  });

  test("Can access and modify vector field", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.at(1).b = [1.1, 2.2];
    expect(buffer.at(1).b[0]).toBeCloseTo(1.1);
    expect(buffer.at(1).b[1]).toBeCloseTo(2.2);
  });

  test("at() returns consistent proxy object", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    const proxy1 = buffer.at(0);
    const proxy2 = buffer.at(0);
    expect(proxy1).toBe(proxy2);
  });

  test("Move retains proxy correctness", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.at(0).a = 10;
    const proxy = buffer.at(0);

    buffer.move(0, 1);
    proxy.a = 99;

    expect(buffer.at(1).a).toBe(99);
  });

  test("at() returns separate proxies for different indices", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    const proxy1 = buffer.at(0);
    const proxy2 = buffer.at(1);
    expect(proxy1).not.toBe(proxy2);
  });

  test("Setting a scalar then overwriting it works", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    buffer.at(0).a = 5;
    buffer.at(0).a = 99;
    expect(buffer.at(0).a).toBe(99);
  });

  test("Setting a vector then overwriting it works", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    buffer.at(0).b = [9.9, 8.8];
    buffer.at(0).b = [7.7, 6.6];
    expect(buffer.at(0).b[0]).toBeCloseTo(7.7);
    expect(buffer.at(0).b[1]).toBeCloseTo(6.6);
  });

  test("Reading uninitialized scalar returns 0", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    expect(buffer.at(0).a).toBe(0);
  });

  test("Reading uninitialized vector returns [0, 0]", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    expect(buffer.at(0).b).toStrictEqual([0, 0]);
  });

  test("Setting large float values in vector", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    buffer.at(0).b = [1e10, -1e10];
    expect(buffer.at(0).b[0]).toBeCloseTo(1e10);
    expect(buffer.at(0).b[1]).toBeCloseTo(-1e10);
  });

  test("Overwriting scalar with float that overflows Uint8", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    buffer.at(0).a = 300;
    expect(buffer.at(0).a).toBe(300 % 256); // 44
  });

  test("Using at() after slicing still works", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });
    buffer.at(2).a = 123;
    const slice = buffer.slice(2, 3);
    expect(slice.at(0).a).toBe(123);
  });

  test("Proxy ignores keys not in struct", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    const proxy = buffer.at(0);
    expect("c" in proxy).toBe(false);
    expect((proxy as any).c).toBe(undefined);
    expect(proxy.a).toBe(0);
  });
});
