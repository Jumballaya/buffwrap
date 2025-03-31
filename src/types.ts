export type WrapperStructConfig<T extends WrapperStruct> = {
  [k in keyof T]: number;
};

export type WrapperStructTypesConfig<T extends WrapperStruct> = {
  [k in keyof T]:
    | typeof Float32Array
    | typeof Uint8Array
    | typeof Int8Array
    | typeof Uint16Array
    | typeof Int16Array
    | typeof Uint32Array
    | typeof Int32Array;
};

export type WrapperStructCompiled<T extends WrapperStruct> = {
  [k in keyof T]: T[k];
};

export type WrapperStruct = {
  [k: string]:
    | number
    | [number, number]
    | [number, number, number]
    | [number, number, number, number];
};

export type BufferList<T extends WrapperStruct> = {
  [K in keyof T]?: InstanceType<WrapperStructTypesConfig<T>[K]>;
};

export type ArrayType =
  | Float32Array
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array;

export type TypedArrayConstructor =
  | typeof Float32Array
  | typeof Uint8Array
  | typeof Int8Array
  | typeof Uint16Array
  | typeof Int16Array
  | typeof Uint32Array
  | typeof Int32Array;

export type Vec<T extends number> = T extends 1
  ? number
  : T extends 2
  ? [number, number]
  : T extends 3
  ? [number, number, number]
  : T extends 4
  ? [number, number, number, number]
  : number;

export type WrapperConfig<T extends WrapperStruct> = {
  struct: WrapperStructConfig<T>;
  types: WrapperStructTypesConfig<T>;
  capacity: number; // number of total elements
  chunkSize?: number; // minimum number of bytes in a chunk. data must have a byteLength that is a multiple of chunkSize
};

export type WrapperConfigOffsets<T extends WrapperStruct> = {
  offsets: {
    [k in keyof T]: number;
  };
};
