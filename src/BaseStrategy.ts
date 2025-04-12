import { BufferWrap } from "./BufferWrap";
import {
  BufferList,
  BufferType,
  CopyTarget,
  BufferStrategy,
  ProxyShape,
  StrategyConfig,
} from "./types";

export abstract class BaseStrategy<T extends ProxyShape, B extends BufferType>
  implements BufferStrategy<T, B>
{
  protected config: StrategyConfig<T, B>;

  constructor(config: StrategyConfig<T, B>) {
    this.config = config;
  }

  abstract get<K extends keyof T>(key: K, index: number): T[K];
  abstract set<K extends keyof T>(key: K, value: T[K], index: number): void;

  abstract getByteLength(): number;
  abstract getStride(): number;
  abstract getBuffer(): B;
  abstract ensureCapacity(newCapacity: number): void;
  abstract destroy(): void;

  public get capacity(): number {
    return this.config.capacity;
  }

  public set capacity(c: number) {
    this.config.capacity = c;
  }

  public move(from: number, to: number): void {
    if (from === to) return;
    const keys = Object.keys(this.config.struct) as (keyof T)[];
    for (const key of keys) {
      const val = this.get(key, from);
      this.set(key, val, to);
    }
  }

  public swap(a: number, b: number): void {
    if (a === b) return;
    const keys = Object.keys(this.config.struct) as (keyof T)[];
    for (const key of keys) {
      const tmp = this.get(key, a);
      this.set(key, this.get(key, b), a);
      this.set(key, tmp, b);
    }
  }

  public insertBlank(index: number, count: number): void {
    const originalCapacity = this.capacity;
    this.ensureCapacity(this.capacity + count);
    const keys = Object.keys(this.config.struct) as (keyof T)[];
    for (let i = originalCapacity - 1; i >= index; i--) {
      const to = i + count;
      for (const key of keys) {
        this.set(key, this.get(key, i), to);
      }
    }

    for (let i = 0; i < count; i++) {
      const idx = index + i;
      for (const key of keys) {
        const { length, type } = this.config.struct[key];
        console.log("Insert blank:", key, new type(length));
        this.set(key, new type(length).fill(0) as T[typeof key], idx);
      }
    }
  }

  public from<OB extends BufferType = B>(
    target: CopyTarget<T, OB>,
    sourceStart = 0,
    sourceEnd = this.capacity,
    destStart = 0
  ): void {
    if (target instanceof ArrayBuffer) {
      this.fromArrayBuffer(target, sourceStart, sourceEnd, destStart);
      return;
    }

    if (target instanceof BaseStrategy) {
      this.fromStrategy(target, sourceStart, sourceEnd, destStart);
      return;
    }

    if (target instanceof BufferWrap) {
      this.fromStrategy(
        target.getStrategy(),
        sourceStart,
        sourceEnd,
        destStart
      );
      return;
    }

    this.fromBufferList(
      target as BufferList<T>,
      sourceStart,
      sourceEnd,
      destStart
    );
  }

  public clone<OB extends BufferType = B>(
    target: CopyTarget<T, OB>,
    from = 0,
    to = this.capacity
  ) {
    if (target instanceof BaseStrategy) {
      this.cloneStrategy(target, from, to);
      return;
    }
    if (target instanceof BufferWrap) {
      this.cloneStrategy(target.getStrategy(), from, to);
      return;
    }
    if (target instanceof ArrayBuffer) {
      this.cloneArrayBuffer(target, from, to);
      return;
    }

    this.cloneBufferList(target as BufferList<T>, from, to);
  }

  private fromArrayBuffer(
    data: ArrayBuffer,
    sourceStart = 0,
    sourceEnd = this.capacity,
    destStart = 0
  ): void {
    const view = new DataView(data);
    const stride = this.getStride();
    const keys = Object.keys(this.config.struct) as (keyof T)[];
    for (let i = sourceStart; i < sourceEnd; i++) {
      const destIndex = destStart + (i - sourceStart);
      const base = i * stride;
      for (const key of keys) {
        const { length, type } = this.config.struct[key];
        const offset = this.config.offsets[key];

        if (length == 1) {
          const val = this.readPrimitive(view, type, base + offset);
          this.set(key, val as T[typeof key], destIndex);
          continue;
        }
        const arr = new Array(length);
        for (let j = 0; j < length; j++) {
          arr[j] = this.readPrimitive(
            view,
            type,
            base + offset + j * type.BYTES_PER_ELEMENT
          );
        }
        this.set(key, arr as T[typeof key], destIndex);
      }
    }
  }

  private fromStrategy<OB extends BufferType = B>(
    data: BufferStrategy<T, OB>,
    sourceStart = 0,
    sourceEnd = this.capacity,
    destStart = 0
  ) {
    // Code Smell
    const baseOffset =
      typeof (this as any).baseOffset === "number"
        ? (this as any).baseOffset
        : 0;
    const stride = this.getStride();
    const destOffset = baseOffset / stride;
    //

    const keys = Object.keys(this.config.struct) as (keyof T)[];
    for (let i = sourceStart; i < sourceEnd; i++) {
      const destIndex = destStart + (i - sourceStart) + destOffset;
      for (const key of keys) {
        const val = data.get(key, i);
        this.set(key, val, destIndex);
      }
    }
  }

  private fromBufferList(
    data: Partial<BufferList<T>>,
    sourceStart = 0,
    sourceEnd = this.capacity,
    destStart = 0
  ) {
    const keys = Object.keys(this.config.struct) as (keyof T)[];
    for (const key of keys) {
      const buffer = data[key];
      if (!buffer) continue;
      for (let i = sourceStart; i < sourceEnd; i++) {
        const destIndex = destStart + (i - sourceStart);
        const length = this.config.struct[key].length;
        const slice = Array.from(
          buffer.subarray(i * length, (i + 1) * length)
        ) as T[typeof key];
        this.set(key, slice, destIndex);
      }
    }
  }

  private cloneArrayBuffer(target: ArrayBuffer, from = 0, to = this.capacity) {
    const targetView = new DataView(target);
    const stride = this.getStride();
    const keys = Object.keys(this.config.struct) as (keyof T)[];

    for (let i = from; i < to; i++) {
      const base = i * stride;
      for (const key of keys) {
        const value = this.get(key, i);
        const offset = this.config.offsets[key];
        const { type, length } = this.config.struct[key];

        if (typeof value === "number") {
          this.writePrimitive(targetView, type, base + offset, value);
        } else if (Array.isArray(value)) {
          for (let j = 0; j < length; j++) {
            this.writePrimitive(
              targetView,
              type,
              base + offset + j * type.BYTES_PER_ELEMENT,
              value[j] as number
            );
          }
        }
      }
    }
  }

  private cloneStrategy<OB extends BufferType = B>(
    target: BufferStrategy<T, OB>,
    from = 0,
    to = this.capacity
  ) {
    // Code Smell
    const targetBaseOffset =
      typeof (target as any).baseOffset === "number"
        ? (target as any).baseOffset
        : 0;
    const stride = this.getStride();
    const destOffset = targetBaseOffset / stride;
    //

    const keys = Object.keys(this.config.struct) as (keyof T)[];
    const count = to - from;
    for (let i = 0; i < count; i++) {
      for (const key of keys) {
        const value = this.get(key, from + i);
        target.set(key, value, i + destOffset);
      }
    }
  }

  private cloneBufferList(target: BufferList<T>, from = 0, to = this.capacity) {
    const keys = Object.keys(this.config.struct) as (keyof T)[];
    const list = target as BufferList<T>;
    for (const key of keys) {
      const buffer = list[key];
      if (!buffer) continue;

      const { length } = this.config.struct[key];
      const count = to - from;
      for (let i = 0; i < count; i++) {
        const value = this.get(key, from + i);
        const offset = i * length;
        if (typeof value === "number") {
          buffer[offset] = value;
        } else if (Array.isArray(value)) {
          buffer.set(value as number[], offset);
        }
      }
    }
  }

  // Helper for reading from DataView
  protected readPrimitive(view: DataView, type: any, offset: number): number {
    switch (type) {
      case Float32Array:
        return view.getFloat32(offset, true);
      case Uint8Array:
        return view.getUint8(offset);
      case Int8Array:
        return view.getInt8(offset);
      case Uint16Array:
        return view.getUint16(offset, true);
      case Int16Array:
        return view.getInt16(offset, true);
      case Uint32Array:
        return view.getUint32(offset, true);
      case Int32Array:
        return view.getInt32(offset, true);
      default:
        throw new Error(`Unsupported type: ${type.name}`);
    }
  }

  // Helper for writing into DataView
  protected writePrimitive(
    view: DataView,
    type: any,
    offset: number,
    value: number
  ): void {
    switch (type) {
      case Float32Array:
        view.setFloat32(offset, value, true);
        break;
      case Uint8Array:
        view.setUint8(offset, value);
        break;
      case Int8Array:
        view.setInt8(offset, value);
        break;
      case Uint16Array:
        view.setUint16(offset, value, true);
        break;
      case Int16Array:
        view.setInt16(offset, value, true);
        break;
      case Uint32Array:
        view.setUint32(offset, value, true);
        break;
      case Int32Array:
        view.setInt32(offset, value, true);
        break;
      default:
        throw new Error(`Unsupported type: ${type.name}`);
    }
  }
}
