import { WrapperConfig } from "../src/types";

export type TestStruct = {
  a: number;
  b: [number, number];
};

export const config: WrapperConfig<TestStruct> = {
  struct: {
    a: { length: 1, type: Uint8Array },
    b: { length: 2, type: Float32Array },
  },
  capacity: 4,
  alignment: 4,
};
