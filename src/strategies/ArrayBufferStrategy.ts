import { BaseStrategy } from "../BaseStrategy";
import { ProxyShape, StrategyConfig } from "../types";

export class ArrayBufferStrategy<T extends ProxyShape> extends BaseStrategy<
  T,
  ArrayBuffer
> {
  private buffer: ArrayBuffer;
  private view: DataView;

  constructor(config: StrategyConfig<T, ArrayBuffer>) {
    super(config);
    const byteLength = config.capacity * config.stride;
    this.buffer = config.buffer ?? new ArrayBuffer(byteLength);
    this.view = new DataView(this.buffer);
  }

  get<K extends keyof T>(key: K, index: number): T[K] {
    const { offsets, struct, stride } = this.config;
    const offset = index * stride + offsets[key];
    const { type, length } = struct[key];

    if (length === 1) {
      return this.readPrimitive(this.view, type, offset) as T[K];
    }

    const res = new Array(length) as number[];
    for (let i = 0; i < length; i++) {
      res[i] = this.readPrimitive(
        this.view,
        type,
        offset + i * type.BYTES_PER_ELEMENT
      );
    }
    return res as T[K];
  }

  set<K extends keyof T>(key: K, value: T[K], index: number): void {
    if (value === undefined) {
      throw new Error(
        `[set] Attempted to write undefined to field ${String(
          key
        )} at index ${index}`
      );
    }
    const { offsets, struct, stride } = this.config;
    const base = index * stride;
    const offset = base + offsets[key];
    const { type, length } = struct[key];

    if (length === 1) {
      const primitive =
        typeof value === "number"
          ? value
          : Array.isArray(value)
          ? value[0]
          : (value as any)[0]; // covers Uint8Array, Float32Array, etc.
      this.writePrimitive(this.view, type, offset, primitive as number);
      return;
    }

    const arr = value as number[];
    if (!Array.isArray(arr) || arr.length !== length) {
      throw new Error(
        `set(): Field "${String(
          key
        )}" expects array of length ${length}, but got ${arr.length}`
      );
    }
    for (let i = 0; i < length; i++) {
      this.writePrimitive(
        this.view,
        type,
        offset + i * type.BYTES_PER_ELEMENT,
        arr[i]
      );
    }
  }

  getByteLength(): number {
    return this.buffer.byteLength;
  }

  getStride(): number {
    return this.config.stride;
  }

  getBuffer(): ArrayBuffer {
    return this.buffer;
  }

  ensureCapacity(newCapacity: number): void {
    const oldCapacity = this.capacity;
    if (newCapacity <= oldCapacity) return;

    const { stride } = this.config;
    const newByteLength = newCapacity * stride;
    const newBuffer = new ArrayBuffer(newByteLength);
    const newView = new DataView(newBuffer);

    new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));

    this.buffer = newBuffer;
    this.view = newView;
    this.capacity = newCapacity;
  }

  destroy(): void {
    this.buffer = new ArrayBuffer(0);
    this.view = new DataView(this.buffer);
    this.capacity = 0;
  }
}
