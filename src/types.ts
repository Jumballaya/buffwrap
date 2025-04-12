// ----------------------
// Core Primitive Types
// ----------------------

import type { BufferWrap } from "./BufferWrap";

// Generic fixed-length tuple utility
export type Tuple<
  T,
  N extends number,
  R extends T[] = []
> = R["length"] extends N ? R : Tuple<T, N, [T, ...R]>;

// Semantic tuple aliases
export type Vec2 = Tuple<number, 2>;
export type Vec3 = Tuple<number, 3>;
export type Vec4 = Tuple<number, 4>;
export type Mat3 = Tuple<number, 9>;
export type Mat4 = Tuple<number, 16>;

// Supported values within a proxy
export type ProxyPrimitive =
  | number
  | string
  | boolean
  | bigint
  | number[]
  | string[]
  | boolean[]
  | bigint[]
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array
  | Vec2
  | Vec3
  | Vec4
  | Mat3
  | Mat4;

// Shape of user-facing proxy structs
export type ProxyShape = Record<string, ProxyPrimitive>;

// ----------------------
// Struct & Buffer Types
// ----------------------

export type TypedArrayConstructor =
  | typeof Float32Array
  | typeof Uint8Array
  | typeof Int8Array
  | typeof Uint16Array
  | typeof Int16Array
  | typeof Uint32Array
  | typeof Int32Array;

export type ArrayType = InstanceType<TypedArrayConstructor>;

export type BufferType =
  | Buffer
  | ArrayBuffer
  | SharedArrayBuffer
  | WebGLBuffer
  | AudioBuffer;

export type CopyTarget<T extends ProxyShape, B extends BufferType> =
  | BufferStrategy<T, B>
  | BufferWrap<T, B>
  | Partial<BufferList<T>>
  | BufferType;

export type BufferList<T extends ProxyShape> = {
  [K in keyof T]?: ArrayType;
};

export type StructFieldConfig = {
  length: number;
  type: TypedArrayConstructor;
};

export type WrapperStructConfig<T extends ProxyShape> = {
  [K in keyof T]: StructFieldConfig;
};

export interface StrategyConfig<T extends ProxyShape, B extends BufferType> {
  struct: WrapperStructConfig<T>;
  offsets: { [K in keyof T]: number };
  stride: number;
  capacity: number;
  alignment?: number;
  extensions?: Record<string, any>;
  buffer?: B;
}

export type StrategyConstructor<
  T extends ProxyShape = any,
  B extends BufferType = ArrayBuffer
> = new (config: StrategyConfig<T, B>) => BufferStrategy<T, B>;

export type WrapperConfig<T extends ProxyShape, B extends BufferType> = {
  struct: WrapperStructConfig<T>;
  capacity: number;
  strategy: StrategyConstructor<T, B>;
  offsets?: { [K in keyof T]: number };
  strategyArgs?: any[];
  alignment?: number;
  buffer?: ArrayBuffer;
};

// ----------------------
// Proxy Runtime Types
// ----------------------

export interface ProxyContext {
  currentIndex: number;
}

export type ProxyHandlerShape<T extends ProxyShape> = ProxyContext &
  Partial<Record<keyof T, ProxyPrimitive>>;

export interface ProxyAccessStrategy<T extends ProxyShape> {
  get<K extends keyof T>(key: K, index: number): T[K]; // Gets a single field's data on a single struct at index (e.g. get position struct #6: [3,2,1])
  set<K extends keyof T>(key: K, value: T[K], index: number): void; // Sets a single field's data on a single struct at index (e.g. set position as [1,2,3] on struct #6)
}

export interface BufferStrategy<T extends ProxyShape, B extends BufferType>
  extends ProxyAccessStrategy<T> {
  getByteLength(): number; // return the full byteLength of the underlying buffer
  getStride(): number; // returns the fully aligned stride
  getBuffer(): B; // returns the raw buffer
  ensureCapacity(newCapacity: number): void; // expand space if needed, or handle it somehow
  destroy(): void; // cleanup method

  move(from: number, to: number): void; // overwrites the data in 'to' with the data in 'from'
  swap(a: number, b: number): void; // swaps the struct data between a and b
  insertBlank(index: number, count: number): void; // inserts a 'count' amount of blank struct at index

  from<OB extends BufferType = B>(
    target: CopyTarget<T, OB>,
    sourceStart?: number,
    sourceEnd?: number,
    destStart?: number
  ): void; // writes data from target -> this
  clone<OB extends BufferType = B>(
    target: CopyTarget<T, OB>,
    from?: number,
    to?: number
  ): void; // writes data from this -> target | from and to default to 0 and capacity
}

export type ManagedProxy<T extends ProxyShape> = ProxyContext & T;
