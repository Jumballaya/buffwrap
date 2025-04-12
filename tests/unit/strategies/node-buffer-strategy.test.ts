import { NodeBufferStrategy } from "../../../src/strategies/NodeBufferStrategy";

describe("[Strategy] NodeBufferStrategy", () => {
  test("NodeBufferStrategy can read/write fields", () => {
    const config = {
      struct: {
        id: { length: 1, type: Uint8Array },
        pos: { length: 2, type: Float32Array },
      },
      offsets: { id: 0, pos: 4 },
      stride: 12,
      capacity: 2,
    };

    const strategy = new NodeBufferStrategy(config);

    strategy.set("id", 42, 0);
    strategy.set("pos", [1.1, 2.2], 0);

    const pos = strategy.get("pos", 0) as [number, number];
    expect(strategy.get("id", 0)).toBe(42);
    expect(pos[0]).toBeCloseTo(1.1);
    expect(pos[1]).toBeCloseTo(2.2);
  });

  test("NodeBufferStrategy ensureCapacity grows and preserves data", () => {
    const config = {
      struct: {
        value: { length: 1, type: Uint8Array },
      },
      offsets: { value: 0 },
      stride: 4,
      capacity: 2,
    };

    const strategy = new NodeBufferStrategy(config);

    strategy.set("value", 99, 0);
    strategy.set("value", 100, 1);

    const before = strategy.getByteLength();
    strategy.ensureCapacity(4); // grow to 4 entries
    const after = strategy.getByteLength();

    expect(after).toBeGreaterThan(before);
    expect(strategy.capacity).toBe(4);

    // Old data should still be intact
    expect(strategy.get("value", 0)).toBeCloseTo(99);
    expect(strategy.get("value", 1)).toBeCloseTo(100);
  });

  test("NodeBufferStrategy can move data between indices", () => {
    const config = {
      struct: {
        a: { length: 1, type: Uint8Array },
        b: { length: 2, type: Float32Array },
      },
      offsets: { a: 0, b: 4 },
      stride: 12,
      capacity: 3,
    };

    const strategy = new NodeBufferStrategy(config);

    strategy.set("a", 1, 0);
    strategy.set("b", [1.1, 1.2], 0);

    strategy.set("a", 2, 1);
    strategy.set("b", [2.1, 2.2], 1);

    strategy.move(0, 2); // move index 0 → index 2

    expect(strategy.get("a", 2)).toBe(1);
    const b = strategy.get("b", 2) as [number, number];
    expect(b[0]).toBeCloseTo(1.1);
    expect(b[1]).toBeCloseTo(1.2);
  });

  test("NodeBufferStrategy can clone into another strategy", () => {
    const config = {
      struct: {
        a: { length: 1, type: Uint8Array },
        b: { length: 2, type: Float32Array },
      },
      offsets: { a: 0, b: 4 },
      stride: 12,
      capacity: 2,
    };

    const source = new NodeBufferStrategy(config);
    const target = new NodeBufferStrategy({ ...config });

    source.set("a", 7, 0);
    source.set("b", [3.3, 4.4], 0);

    source.clone(target);

    expect(target.get("a", 0)).toBe(7);
    const b = target.get("b", 0) as [number, number];
    expect(b[0]).toBeCloseTo(3.3);
    expect(b[1]).toBeCloseTo(4.4);
  });

  test("NodeBufferStrategy from() accepts BufferList input", () => {
    const config = {
      struct: {
        a: { length: 1, type: Uint8Array },
        b: { length: 2, type: Float32Array },
      },
      offsets: { a: 0, b: 4 },
      stride: 12,
      capacity: 1,
    };

    const strategy = new NodeBufferStrategy(config);

    const input = {
      a: new Uint8Array([9]),
      b: new Float32Array([6.6, 7.7]),
    };

    strategy.from(input);

    expect(strategy.get("a", 0)).toBe(9);
    const b = strategy.get("b", 0) as [number, number];
    expect(b[0]).toBeCloseTo(6.6);
    expect(b[1]).toBeCloseTo(7.7);
  });

  test("NodeBufferStrategy insertBlank shifts and zero-fills", () => {
    const config = {
      struct: {
        val: { length: 2, type: Float32Array },
      },
      offsets: { val: 0 },
      stride: 8,
      capacity: 3,
    };

    const strategy = new NodeBufferStrategy(config);

    strategy.set("val", [9.9, 8.8], 0);
    strategy.set("val", [7.7, 6.6], 1);

    strategy.insertBlank(1, 1); // insert 1 blank at index 1

    const val0 = strategy.get("val", 0) as [number, number];
    expect(val0[0]).toBeCloseTo(9.9);
    expect(val0[1]).toBeCloseTo(8.8);

    const val1 = strategy.get("val", 1) as [number, number];
    expect(val1[0]).toBeCloseTo(0);
    expect(val1[1]).toBeCloseTo(0);

    const val2 = strategy.get("val", 2) as [number, number];
    expect(val2[0]).toBeCloseTo(7.7);
    expect(val2[1]).toBeCloseTo(6.6);
  });

  test("NodeBufferStrategy swap swaps values between indices", () => {
    const config = {
      struct: {
        id: { length: 1, type: Uint8Array },
        pos: { length: 2, type: Float32Array },
      },
      offsets: { id: 0, pos: 4 },
      stride: 12,
      capacity: 2,
    };

    const strategy = new NodeBufferStrategy(config);

    strategy.set("id", 1, 0);
    strategy.set("pos", [1.1, 1.2], 0);

    strategy.set("id", 2, 1);
    strategy.set("pos", [2.1, 2.2], 1);

    strategy.swap(0, 1);

    expect(strategy.get("id", 0)).toBe(2);
    const pos0 = strategy.get("pos", 0) as [number, number];
    expect(pos0[0]).toBeCloseTo(2.1);
    expect(pos0[1]).toBeCloseTo(2.2);

    expect(strategy.get("id", 1)).toBe(1);
    const pos1 = strategy.get("pos", 1) as [number, number];
    expect(pos1[0]).toBeCloseTo(1.1);
    expect(pos1[1]).toBeCloseTo(1.2);
  });

  test("NodeBufferStrategy destroy clears buffer and capacity", () => {
    const config = {
      struct: {
        val: { length: 2, type: Float32Array },
      },
      offsets: { val: 0 },
      stride: 8,
      capacity: 2,
    };

    const strategy = new NodeBufferStrategy(config);

    strategy.set("val", [5.5, 6.6], 0);
    strategy.destroy();

    expect(strategy.getByteLength()).toBe(0);
    expect(strategy.capacity).toBe(0);

    // Optional: should throw or be invalid
    expect(() => strategy.get("val", 0)).toThrow();
  });
});
