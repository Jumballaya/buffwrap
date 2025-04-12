import { ArrayBufferStrategy, BufferWrap } from "../../src";
import { NodeBufferStrategy } from "../../src/index.node";
import { BufferList } from "../../src/types";
import { TestStruct } from "../helper";

type TestStructBuffer = {
  a: Uint8Array;
  b: Float32Array;
};

describe("[E2E Strategies] NodeBufferStrategy", () => {
  test("Can copy between NodeBufferStrategy and ArrayBufferStrategy", () => {
    const struct = {
      a: { length: 1, type: Uint8Array },
      b: { length: 2, type: Float32Array },
    };

    const source = new BufferWrap<TestStructBuffer, Buffer>({
      struct,
      capacity: 1,
      strategy: NodeBufferStrategy,
    });

    const target = new BufferWrap<TestStruct, ArrayBuffer>({
      struct,
      capacity: 1,
      strategy: ArrayBufferStrategy,
    });

    source.at(0).a = new Uint8Array([123]);
    source.at(0).b = new Float32Array([9.9, 8.8]);

    source.copyInto(target);

    expect(target.at(0).a).toBe(123);
    expect(target.at(0).b[0]).toBeCloseTo(9.9);
    expect(target.at(0).b[1]).toBeCloseTo(8.8);
  });

  test("Can from and to NodeBufferStrategy and ArrayBufferStrategy", () => {
    const struct = {
      a: { length: 1, type: Uint8Array },
      b: { length: 2, type: Float32Array },
    };

    const source = new BufferWrap<TestStructBuffer, Buffer>({
      struct,
      capacity: 1,
      strategy: NodeBufferStrategy,
    });

    const target = new BufferWrap<TestStruct, ArrayBuffer>({
      struct,
      capacity: 1,
      strategy: ArrayBufferStrategy,
    });

    source.at(0).a = new Uint8Array([123]);
    source.at(0).b = new Float32Array([9.9, 8.8]);

    target.from(source);

    expect(target.at(0).a).toBe(123);
    expect(target.at(0).b[0]).toBeCloseTo(9.9);
    expect(target.at(0).b[1]).toBeCloseTo(8.8);
  });

  test("NodeBufferStrategy full roundtrip: from -> insert -> move -> copyInto -> verify", () => {
    const struct = {
      a: { length: 1, type: Uint8Array },
      b: { length: 2, type: Float32Array },
    };

    const initial: BufferList<TestStruct> = {
      a: new Uint8Array([10, 20, 30]),
      b: new Float32Array([1.1, 1.2, 2.1, 2.2, 3.1, 3.2]),
    };

    const buffer = new BufferWrap<TestStruct, Buffer>({
      struct,
      capacity: 3,
      strategy: NodeBufferStrategy,
    });

    buffer.from(initial);

    buffer.insert(1, {
      a: new Uint8Array([99]),
      b: new Float32Array([9.9, 9.8]),
    });

    buffer.move(3, 0); // shift last to front

    const output: BufferList<TestStruct> = {
      a: new Uint8Array(buffer.byteLength),
      b: new Float32Array(buffer.byteLength * 2),
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
});
