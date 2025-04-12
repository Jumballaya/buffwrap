import { BaseStrategy } from "../BaseStrategy";
import { ProxyShape, StrategyConfig } from "../types";

export class NodeBufferStrategy<T extends ProxyShape> extends BaseStrategy<
  T,
  Buffer
> {
  private buffer: Buffer;

  constructor(config: StrategyConfig<T, Buffer>) {
    super(config);
    const byteLength = config.capacity * config.stride;
    this.buffer = config.buffer ?? Buffer.alloc(byteLength);
  }

  get<K extends keyof T>(key: K, index: number): T[K] {
    const { offsets, struct, stride } = this.config;
    const offset = index * stride + offsets[key];
    const { type, length } = struct[key];

    if (length === 1) {
      return this.readPrimitive(type, offset) as T[K];
    }

    const result = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.readPrimitive(type, offset + i * type.BYTES_PER_ELEMENT);
    }
    return result as T[K];
  }

  set<K extends keyof T>(key: K, value: T[K], index: number): void {
    if (value === undefined) {
      throw new Error(`set(): Cannot set undefined for key "${String(key)}"`);
    }

    const { offsets, struct, stride } = this.config;
    const offset = index * stride + offsets[key];
    const { type, length } = struct[key];

    if (length === 1) {
      const val =
        typeof value === "number"
          ? value
          : Array.isArray(value)
          ? value[0]
          : (value as any)[0];
      this.writePrimitive(type, offset, val);
      return;
    }

    const arr = value as any;
    if (Array.isArray(arr)) {
      if (arr.length !== length) {
        throw new Error(
          `set(): Field "${String(
            key
          )}" expects array of length ${length}, got ${arr.length}`
        );
      }
    } else if (arr instanceof type) {
      if (arr.length !== length) {
        throw new Error(
          `set(): Field "${String(
            key
          )}" expects typed array of length ${length}, got ${arr.length}`
        );
      }
    } else {
      throw new Error(
        `set(): Field "${String(key)}" must be a JS array or ${type.name}`
      );
    }

    for (let i = 0; i < length; i++) {
      this.writePrimitive(type, offset + i * type.BYTES_PER_ELEMENT, arr[i]);
    }
  }

  getBuffer(): Buffer {
    return this.buffer;
  }

  getByteLength(): number {
    return this.buffer.byteLength;
  }

  getStride(): number {
    return this.config.stride;
  }

  ensureCapacity(newCapacity: number): void {
    const oldCap = this.capacity;
    if (newCapacity <= oldCap) return;

    const { stride } = this.config;
    const newByteLength = newCapacity * stride;
    const newBuffer = Buffer.alloc(newByteLength);
    this.buffer.copy(newBuffer, 0, 0, oldCap * stride);

    this.buffer = newBuffer;
    this.capacity = newCapacity;
  }

  destroy(): void {
    this.buffer = Buffer.alloc(0);
    this.capacity = 0;
  }

  protected readPrimitive(type: any, offset: number): number {
    switch (type) {
      case Float32Array:
        return this.buffer.readFloatLE(offset);
      case Uint8Array:
        return this.buffer.readUInt8(offset);
      case Int8Array:
        return this.buffer.readInt8(offset);
      case Uint16Array:
        return this.buffer.readUInt16LE(offset);
      case Int16Array:
        return this.buffer.readInt16LE(offset);
      case Uint32Array:
        return this.buffer.readUInt32LE(offset);
      case Int32Array:
        return this.buffer.readInt32LE(offset);
      default:
        throw new Error(`Unsupported type: ${type.name}`);
    }
  }

  protected writePrimitive(type: any, offset: number, value: number): number {
    switch (type) {
      case Float32Array:
        return this.buffer.writeFloatLE(value, offset);
      case Uint8Array:
        return this.buffer.writeUInt8(value, offset);
      case Int8Array:
        return this.buffer.writeInt8(value, offset);
      case Uint16Array:
        return this.buffer.writeUInt16LE(value, offset);
      case Int16Array:
        return this.buffer.writeInt16LE(value, offset);
      case Uint32Array:
        return this.buffer.writeUInt32LE(value, offset);
      case Int32Array:
        return this.buffer.writeInt32LE(value, offset);
      default:
        throw new Error(`Unsupported type: ${type.name}`);
    }
  }
}
