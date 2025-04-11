// ----------------------
// Core Primitive Types
// ----------------------

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

export type WrapperConfigOffsets<T extends ProxyShape> = {
  offsets: { [K in keyof T]: number };
};

export interface StrategyConfig<T extends ProxyShape> {
  struct: WrapperStructConfig<T>;
  offsets: WrapperConfigOffsets<T>["offsets"];
  stride: number;
  capacity: number;
  alignment?: number;
}

export type StrategyConstructor<T extends ProxyShape = any> = new (
  config: StrategyConfig<T>
) => ProxyAccessStrategy<T>;

export type WrapperConfig<T extends ProxyShape> = {
  struct: WrapperStructConfig<T>;
  capacity: number;
  strategy: StrategyConstructor<T>;
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
  get<K extends keyof T>(key: K, index: number): T[K];
  set<K extends keyof T>(key: K, value: T[K], index: number): void;

  readonly byteLength: number;

  getBuffer(): ArrayBufferLike;
  destroy(): void;
}

export type ManagedProxy<T extends ProxyShape> = ProxyContext & T;
