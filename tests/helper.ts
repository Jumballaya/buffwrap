export type TestStruct = {
  a: number;
  b: [number, number];
};

export const config = {
  struct: {
    a: 1,
    b: 2,
  },
  types: {
    a: Uint8Array,
    b: Float32Array,
  },
  capacity: 4,
  alignment: 4,
};
