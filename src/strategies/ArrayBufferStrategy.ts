import { ProxyAccessStrategy, ProxyShape, StrategyConfig } from "../types";
import { TypedArrayConstructor, WrapperStructConfig } from "../types";

export class ArrayBufferStrategy<T extends ProxyShape>
  implements ProxyAccessStrategy<T>
{
  private buffer: ArrayBuffer;
  private view: DataView;
  private struct: WrapperStructConfig<T>;
  private offsets: { [K in keyof T]: number };
  private stride: number;
  public readonly byteLength;

  constructor(config: StrategyConfig<T>) {
    this.struct = config.struct;
    this.offsets = config.offsets;
    this.stride = config.stride;

    this.stride = Object.entries(this.offsets).reduce((acc, [key, val]) => {
      const { length, type } = this.struct[key as keyof T];
      return Math.max(acc, val + length * type.BYTES_PER_ELEMENT);
    }, 0);

    this.byteLength = this.stride * config.capacity;
    this.buffer = new ArrayBuffer(this.byteLength);
    this.view = new DataView(this.buffer);
  }

  public get<K extends keyof T>(key: K, index: number): T[K] {
    const { length, type } = this.struct[key];
    const offset = this.offsets[key] + index * this.stride;

    if (length === 1) {
      return this.readData(type, offset) as T[K];
    }

    const result = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.readData(type, offset + i * type.BYTES_PER_ELEMENT);
    }
    return result as T[K];
  }

  public set<K extends keyof T>(key: K, value: T[K], index: number): void {
    const { length, type } = this.struct[key];
    const offset = this.offsets[key] + index * this.stride;

    if (typeof value === "number") {
      this.writeData(type, offset, value);
    } else if (value instanceof Array) {
      for (let i = 0; i < length; i++) {
        this.writeData(
          type,
          offset + i * type.BYTES_PER_ELEMENT,
          value[i] as number
        );
      }
    }
  }

  public getBuffer(): ArrayBuffer {
    return this.buffer;
  }

  public destroy(): void {}

  private readData(type: TypedArrayConstructor, offset: number): number {
    switch (type) {
      case Float32Array:
        return this.view.getFloat32(offset, true);
      case Uint8Array:
        return this.view.getUint8(offset);
      case Int8Array:
        return this.view.getInt8(offset);
      case Uint16Array:
        return this.view.getUint16(offset, true);
      case Int16Array:
        return this.view.getInt16(offset, true);
      case Uint32Array:
        return this.view.getUint32(offset, true);
      case Int32Array:
        return this.view.getInt32(offset, true);
      default:
        throw new Error(`Unsupported type: ${type.name}`);
    }
  }

  private writeData(
    type: TypedArrayConstructor,
    offset: number,
    value: number
  ) {
    switch (type) {
      case Float32Array:
        this.view.setFloat32(offset, value, true);
        break;
      case Uint8Array:
        this.view.setUint8(offset, value);
        break;
      case Int8Array:
        this.view.setInt8(offset, value);
        break;
      case Uint16Array:
        this.view.setUint16(offset, value, true);
        break;
      case Int16Array:
        this.view.setInt16(offset, value, true);
        break;
      case Uint32Array:
        this.view.setUint32(offset, value, true);
        break;
      case Int32Array:
        this.view.setInt32(offset, value, true);
        break;
      default:
        throw new Error("Unsupported type");
    }
  }
}
