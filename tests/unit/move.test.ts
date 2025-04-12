import { BufferWrap } from "../../src";
import { config, TestStruct } from "../helper";

describe("BufferWrap [move]", () => {
  test("Move from one index to another", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });
    buffer.at(0).a = 1;
    buffer.at(1).a = 2;

    buffer.move(0, 2);
    expect(buffer.at(2).a).toBe(1);
    expect(buffer.at(1).a).toBe(2);
  });

  test("Move struct via proxy", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    const struct = buffer.at(0);
    struct.a = 42;

    buffer.move(struct, 1);
    expect(buffer.at(1).a).toBe(42);
  });

  test("Move overwrites existing data", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.at(0).a = 5;
    buffer.at(1).a = 99;

    buffer.move(0, 1);
    expect(buffer.at(1).a).toBe(5);
  });

  test("Move does nothing if indices are the same", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    buffer.at(0).a = 88;

    buffer.move(0, 0);
    expect(buffer.at(0).a).toBe(88);
  });

  test("Move with proxy keeps proxy valid at new location", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 2,
    });
    const proxy = buffer.at(0);
    proxy.a = 9;

    buffer.move(proxy, 1);
    expect(buffer.at(1)).toBe(proxy);
    expect(buffer.at(1).a).toBe(9);
  });

  //
  // Advanced scenarios
  //

  test("Overlapping move copies correctly", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });
    buffer.at(0).a = 10;
    buffer.at(1).a = 20;
    buffer.at(2).a = 30;

    buffer.move(0, 1); // move index 0 to index 1
    expect(buffer.at(1).a).toBe(10);
    expect(buffer.at(2).a).toBe(30); // untouched
  });

  test("Move with slice still modifies parent", () => {
    const buffer = new BufferWrap<TestStruct, ArrayBuffer>({
      ...config(),
      capacity: 3,
    });
    buffer.at(0).a = 100;
    buffer.at(1).a = 200;

    const slice = buffer.slice(0, 2);
    slice.move(0, 1);

    expect(buffer.at(1).a).toBe(100);
  });
});
