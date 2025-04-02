export type ProxyPrimitive =
  | number
  | number[]
  | string
  | string[]
  | boolean
  | boolean[]
  | bigint
  | bigint[]
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array;

export type ProxyShape = Record<string, ProxyPrimitive>;

export interface ProxyContext {
  currentIndex: number;
}

export type ProxyHandlerShape<T extends ProxyShape> = ProxyContext &
  Partial<Record<keyof T, ProxyPrimitive>>;

export interface ProxyAccessStrategy<T extends ProxyShape> {
  get(key: keyof T, index: number): T[keyof T];
  set(key: keyof T, value: T[keyof T], index: number): void;
}

export type ManagedProxy<T extends ProxyShape> = ProxyContext & T;
