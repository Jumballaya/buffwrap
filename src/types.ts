// Allowed Typed Arrays
export type TypedArrayConstructor =
  | typeof Float32Array
  | typeof Uint8Array
  | typeof Int8Array
  | typeof Uint16Array
  | typeof Int16Array
  | typeof Uint32Array
  | typeof Int32Array;

export type ArrayType = InstanceType<TypedArrayConstructor>;

// Represents possible fixed-length tuples for vectors/matrices
export type StructValue =
  | number // scalar
  | [number, number] // vec2
  | [number, number, number] // vec3
  | [number, number, number, number] // vec4 or mat2
  | [number, number, number, number, number, number, number, number, number] // mat3
  | [
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
    ] // mat4
  | number[]; // variable-length arrays

// Defines struct configuration for BufferWrap
export type WrapperStruct = Record<string, StructValue>;

// Compiled Struct Type (same as definition)
export type WrapperStructCompiled<T extends WrapperStruct> = {
  [K in keyof T]: T[K];
};

// BufferList - Typed arrays mapped by keys of struct
export type BufferList<T extends WrapperStruct> = {
  [K in keyof T]?: ArrayType;
};

// Configuration for each struct field with explicit length and type
export type StructFieldConfig = {
  length: number; // actual number of elements
  type: TypedArrayConstructor; // typed array type
};

// Struct definition mapping keys to detailed field config
export type WrapperStructConfig<T extends WrapperStruct> = {
  [K in keyof T]: StructFieldConfig;
};

// Main configuration type for BufferWrap constructor
export type WrapperConfig<T extends WrapperStruct> = {
  struct: WrapperStructConfig<T>;
  capacity: number;
  alignment?: number;
  buffer?: ArrayBuffer;
};

// Offsets definition for struct fields
export type WrapperConfigOffsets<T extends WrapperStruct> = {
  offsets: { [K in keyof T]: number };
};
