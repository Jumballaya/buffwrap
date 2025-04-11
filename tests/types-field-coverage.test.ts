import BufferWrap from "../dist";
import { ArrayBufferStrategy } from "../src/strategies/ArrayBufferStrategy";
import { WrapperConfig } from "../src/types";

type TestStruct = {
  scalar: number;
  vec2: [number, number];
  vec3: [number, number, number];
  vec4: [number, number, number, number];
  mat2: [number, number, number, number];
  mat3: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
  mat4: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
  variable: number[];
};

const config: WrapperConfig<TestStruct> = {
  struct: {
    scalar: { length: 1, type: Float32Array },
    vec2: { length: 2, type: Float32Array },
    vec3: { length: 3, type: Float32Array },
    vec4: { length: 4, type: Float32Array },
    mat2: { length: 4, type: Float32Array },
    mat3: { length: 9, type: Float32Array },
    mat4: { length: 16, type: Float32Array },
    variable: { length: 8, type: Float32Array }, // explicitly fixed length
  },
  capacity: 2,
  strategy: ArrayBufferStrategy,
};

test("BufferWrap handles scalar, vector, matrix, and fixed-length variable fields correctly", () => {
  const wrap = new BufferWrap(config);

  // Test writing to the buffer
  const entry0 = wrap.at(0);
  entry0.scalar = 1.23;
  entry0.vec2 = [1, 2];
  entry0.vec3 = [3, 4, 5];
  entry0.vec4 = [6, 7, 8, 9];
  entry0.mat2 = [10, 11, 12, 13];
  entry0.mat3 = [14, 15, 16, 17, 18, 19, 20, 21, 22];
  entry0.mat4 = [
    23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  ];
  entry0.variable = [39, 40, 41, 42, 43, 44, 45, 46];

  const entry1 = wrap.at(1);
  entry1.scalar = 47;
  entry1.vec2 = [48, 49];
  entry1.vec3 = [50, 51, 52];
  entry1.vec4 = [53, 54, 55, 56];
  entry1.mat2 = [57, 58, 59, 60];
  entry1.mat3 = [61, 62, 63, 64, 65, 66, 67, 68, 69];
  entry1.mat4 = [
    70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85,
  ];
  entry1.variable = [86, 87, 88, 89, 90, 91, 92, 93];

  // Read back and validate
  expect(entry0.scalar).toBeCloseTo(1.23);
  expect(entry0.vec2).toEqual([1, 2]);
  expect(entry0.vec3).toEqual([3, 4, 5]);
  expect(entry0.vec4).toEqual([6, 7, 8, 9]);
  expect(entry0.mat2).toEqual([10, 11, 12, 13]);
  expect(entry0.mat3).toEqual([14, 15, 16, 17, 18, 19, 20, 21, 22]);
  expect(entry0.mat4).toEqual([
    23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  ]);
  expect(entry0.variable).toEqual([39, 40, 41, 42, 43, 44, 45, 46]);

  expect(entry1.scalar).toBeCloseTo(47);
  expect(entry1.vec2).toEqual([48, 49]);
  expect(entry1.vec3).toEqual([50, 51, 52]);
  expect(entry1.vec4).toEqual([53, 54, 55, 56]);
  expect(entry1.mat2).toEqual([57, 58, 59, 60]);
  expect(entry1.mat3).toEqual([61, 62, 63, 64, 65, 66, 67, 68, 69]);
  expect(entry1.mat4).toEqual([
    70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85,
  ]);
  expect(entry1.variable).toEqual([86, 87, 88, 89, 90, 91, 92, 93]);
});

test("BufferWrap throws when variable-length array doesn't match configured length", () => {
  const wrap = new BufferWrap(config);
  const entry = wrap.at(0);

  expect(() => {
    entry.variable = [1, 2, 3]; // Should fail due to incorrect length
  }).toThrow();
});
