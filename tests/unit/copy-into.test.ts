import { BufferWrap } from "../../src";
import { config, TestStruct } from "../helper";

describe("BufferWrap [copyInto]", () => {
  test("copyInto raw ArrayBuffer", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.at(0).a = 1;
    buffer.at(1).a = 2;

    const target = new ArrayBuffer(buffer.byteLength);
    buffer.copyInto(target);

    const copy = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    copy.from(target);

    expect(copy.at(0).a).toBe(1);
    expect(copy.at(1).a).toBe(2);
  });

  test("copyInto another BufferWrap", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.at(0).a = 9;
    buffer.at(0).b = [1.1, 2.2];

    const target = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.copyInto(target);

    expect(target.at(0).a).toBe(9);
    expect(target.at(0).b[0]).toBeCloseTo(1.1);
    expect(target.at(0).b[1]).toBeCloseTo(2.2);
  });

  test("copyInto BufferList", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.at(0).a = 7;
    buffer.at(0).b = [3.3, 4.4];

    const target = {
      a: new Uint8Array(2),
      b: new Float32Array(4),
    };

    buffer.copyInto(target);

    expect(target.a[0]).toBe(7);
    expect(target.b[0]).toBeCloseTo(3.3);
    expect(target.b[1]).toBeCloseTo(4.4);
  });

  test("copyInto throws on undersized ArrayBuffer", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    const target = new ArrayBuffer(buffer.byteLength - 4);
    expect(() => buffer.copyInto(target)).toThrow();
  });

  test("copyInto throws on undersized BufferWrap", () => {
    const source = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });
    const target = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    expect(() => source.copyInto(target)).toThrow();
  });

  test("copyInto preserves content for full BufferWraps", () => {
    const src = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    const dst = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });

    src.at(0).a = 100;
    src.at(0).b = [9.9, 8.8];
    src.at(1).a = 200;
    src.at(1).b = [7.7, 6.6];

    src.copyInto(dst);

    expect(dst.at(0).a).toBe(100);
    expect(dst.at(0).b[0]).toBeCloseTo(9.9);
    expect(dst.at(1).a).toBe(200);
    expect(dst.at(1).b[1]).toBeCloseTo(6.6);
  });

  test("copyInto with partial BufferList skips missing keys", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });
    buffer.at(0).a = 123;
    buffer.at(0).b = [5.5, 6.6];

    const target = {
      a: new Uint8Array(1),
    };

    buffer.copyInto(target);

    expect(target.a[0]).toBe(123);
  });

  test("copyInto copies slice into full buffer", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });
    buffer.at(1).a = 42;

    const slice = buffer.slice(1, 2);
    const target = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 1,
    });

    slice.copyInto(target);

    expect(target.at(0).a).toBe(42);
  });

  test("copyInto copies slice into BufferList", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 4,
    });
    buffer.at(2).a = 99;
    buffer.at(2).b = [3.3, 4.4];

    const slice = buffer.slice(2, 3);

    const targetList = {
      a: new Uint8Array(1),
      b: new Float32Array(2),
    };

    slice.copyInto(targetList);

    expect(targetList.a[0]).toBe(99);
    expect(targetList.b[0]).toBeCloseTo(3.3);
    expect(targetList.b[1]).toBeCloseTo(4.4);
  });
});
