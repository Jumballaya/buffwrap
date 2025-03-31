import type {
  ArrayType,
  BufferList,
  TypedArrayConstructor,
  WrapperConfig,
  WrapperConfigOffsets,
  WrapperStruct,
  WrapperStructCompiled,
  WrapperStructTypesConfig,
} from "./types";

//
// BufferWrap
//
//    BufferWrap makes it easy to deal with a buffer of structured data.
//    This could be particles in a particle system, messages passed from
//    web workers, information from a WebGPU compute pipeline, lighting
//    data in a uniform buffer, etc. etc.
//
//    @TODO: use the DataView 'view' attribute instead of the 'buffer' ArrayBuffer
//           attribute wherever possible. This is to make sure a BufferWrap created
//           from a .slice() call works as intended.
export class BufferWrap<T extends WrapperStruct> {
  private config: WrapperConfig<T> & WrapperConfigOffsets<T>;
  private proxyCache: Map<number, WrapperStructCompiled<T>> = new Map();
  private buffers: BufferList<T> = {} as BufferList<T>; // @TODO: better typing
  public buffer: ArrayBuffer;
  private view: DataView;
  private _stride = 0;

  constructor(config: WrapperConfig<T>) {
    const offsets: Record<string, number> = {};
    let stride = 0;
    for (const k of Object.keys(config.struct)) {
      offsets[k] = stride;
      stride += config.struct[k] * config.types[k].BYTES_PER_ELEMENT;
    }
    this._stride = stride;

    this.config = {
      ...config,
      offsets: offsets as { [k in keyof T]: number },
    };

    const byteLength = this._stride * config.capacity;
    this.buffer = new ArrayBuffer(byteLength);
    this.view = new DataView(this.buffer);
  }

  public get byteLength(): number {
    return this.view.byteLength;
  }

  public get stride(): number {
    return this.stride;
  }

  public attributeStride(name: string): number {
    const key = name as keyof T;
    if (key in this.config.types) {
      return this.config.types[key].BYTES_PER_ELEMENT * this.config.struct[key];
    }
    return 0;
  }

  // Generates a proxy object that represents your struct at
  // the given index. updating this proxy will update the
  // underlying buffer
  public at(idx: number): WrapperStructCompiled<T> {
    let found = this.proxyCache.get(idx);
    if (found) {
      return found;
    }

    found = new Proxy({} as WrapperStructCompiled<T>, {
      get: (_, key: string) => {
        if (!(key in this.config.struct)) return undefined;
        return this.getElementAttribute(key as keyof T, idx);
      },
      set: (_, key: string, value) => {
        if (!(key in this.config.struct)) return false;
        this.setElementAttribute(key as keyof T, value, idx);
        return true;
      },
    });

    this.proxyCache.set(idx, found);
    return found;
  }

  //
  //  Get Attribute Buffer
  //
  //  Builds out a buffer for just a single attribute of
  //  the type given in the config
  public getAttributeBuffer(key: keyof T): ArrayType {
    if (this.buffers[key]) {
      return this.buffers[key];
    }

    const len = this.config.struct[key];
    const type = this.config.types[key];
    const offset = this.config.offsets[key];
    const buffer = new type(len * this.config.capacity);

    for (let i = 0; i < this.config.capacity; i++) {
      const start = this._stride * i + offset;
      const end = start + len * type.BYTES_PER_ELEMENT;
      buffer.set(new type(this.buffer.slice(start, end)), i * len);
    }

    this.buffers[key] = buffer as InstanceType<
      WrapperStructTypesConfig<T>[typeof key]
    >;
    return buffer;
  }

  //
  //  From:
  //
  //  Take in an interleved buffer or struct of buffers
  //  and use that as the data for this configured
  //  BuffWrap
  public from(buffer: ArrayBuffer | Partial<BufferList<T>>) {
    // Actual ArrayBuffer class
    if (buffer instanceof ArrayBuffer) {
      this.buffer = buffer.slice();
      this.proxyCache.clear();
      return;
    }

    // TypedArray (e.g. Float32Array, Uint8Array, etc.)
    if (buffer.buffer) {
      this.buffer = buffer.buffer.slice().buffer;
      this.proxyCache.clear();
      return;
    }

    // Otherwise we have the partial bufferlist to build from
    const keys: Array<keyof T> = Object.keys(buffer);
    for (const k of keys) {
      const inDataBuffer = buffer[k]!;
      const stride = this._stride;
      const offset = this.config.offsets[k];
      const type = this.config.types[k];
      const len = this.config.struct[k];
      for (let i = 0; i < this.config.capacity; i++) {
        const ptr = stride * i + offset;
        new Uint8Array(this.buffer, ptr, len * type.BYTES_PER_ELEMENT).set(
          new Uint8Array(
            inDataBuffer.buffer,
            i * len * type.BYTES_PER_ELEMENT,
            len * type.BYTES_PER_ELEMENT
          ),
          0
        );
      }
    }

    this.proxyCache.clear();
  }

  // Move an element from one location to another.
  // You can do somehing like .move(struct, 10) which would move your struct to
  // the index 10 and that would be reflected in the underlying data buffer
  // or you can do something like .move(42, 10) which will move the struct
  // data at index 42 to index 10
  public move(fromId: number | WrapperStructCompiled<T>, toId: number) {
    if (fromId === toId) return;

    const from =
      typeof fromId === "number"
        ? fromId
        : [...this.proxyCache.entries()].find(([, v]) => v === fromId)?.[0];
    if (from === undefined || from === toId) return;

    const fromStart = from * this._stride;
    const toStart = toId * this._stride;

    new Uint8Array(this.buffer, toStart, this._stride).set(
      new Uint8Array(this.buffer, fromStart, this._stride)
    );

    const proxy = this.proxyCache.get(from);
    if (proxy) {
      this.proxyCache.set(toId, proxy);
      this.proxyCache.delete(from);
    }
  }

  public slice(start: number, end = this.config.capacity) {
    const config = { ...this.config, capacity: end - start };
    const bw = new BufferWrap<T>(config);

    bw.buffer = this.buffer;
    bw.view = this.view;

    bw.config.offsets = Object.fromEntries(
      Object.entries(this.config.offsets).map(([key, offset]) => [
        key as keyof T,
        offset + start * this._stride,
      ])
    ) as { [k in keyof T]: number };

    return bw;
  }

  // if you dont insert an ArrayBuffer, the assumption is you are inserting
  // only 1 element
  public insert(
    idx: number,
    data: ArrayBuffer | Partial<BufferList<T>> | BufferWrap<T>
  ) {
    const insertCount = data instanceof BufferWrap ? data.config.capacity : 1;
    const requiredCapacity = this.config.capacity + insertCount;
    this.config.capacity = requiredCapacity;

    if (requiredCapacity * this._stride > this.buffer.byteLength) {
      const newBufferSize = Math.max(
        this.byteLength * 2,
        requiredCapacity * this._stride
      );
      const newBuffer = new ArrayBuffer(newBufferSize);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
      this.view = new DataView(newBuffer);
    }

    // just moving everything forward from where were want to insert
    for (let i = this.config.capacity - 1; i >= idx; i--) {
      const fromOffset = i * this._stride;
      const toOffset = (i + insertCount) * this._stride;
      new Uint8Array(this.buffer, toOffset, this._stride).set(
        new Uint8Array(this.buffer, fromOffset, this._stride)
      );
    }

    if (data instanceof BufferWrap) {
      for (let i = 0; i < data.config.capacity; i++) {
        const fromOffset = i * data._stride;
        const toOffset = (idx + i) * this._stride;
        new Uint8Array(this.buffer, toOffset, this._stride).set(
          new Uint8Array(data.buffer, fromOffset, this._stride)
        );
      }
      return;
    }

    if (data instanceof ArrayBuffer) {
      new Uint8Array(this.buffer, idx * this._stride, data.byteLength).set(
        new Uint8Array(data)
      );
      return;
    }

    for (const key in data) {
      const value = data[key];
      if (!value) continue;
      const type = this.config.types[key];
      const len = this.config.struct[key];
      const offset = this.config.offsets[key];

      for (let i = 0; i < len; i++) {
        this.view.setUint8(
          idx * this._stride + offset + i * type.BYTES_PER_ELEMENT,
          value[i]
        );
      }
    }
  }

  public copyInto(
    target: ArrayBuffer | Partial<BufferList<T>> | BufferWrap<T>
  ) {
    if (target instanceof ArrayBuffer) {
      if (target.byteLength < this.buffer.byteLength) {
        throw new Error(
          "Target ArrayBuffer is too small to hold the copied data"
        );
      }
      new Uint8Array(target).set(new Uint8Array(this.buffer));
      return;
    }

    if (target instanceof BufferWrap) {
      if (target.config.capacity < this.config.capacity) {
        throw new Error(
          "Target BufferWrap is too small to hold the copied data"
        );
      }
      for (let i = 0; i < this.config.capacity; i++) {
        const fromOffset = i * this._stride;
        const toOffset = i * target._stride;
        new Uint8Array(target.buffer, toOffset, this._stride).set(
          new Uint8Array(this.buffer, fromOffset, this._stride)
        );
      }
      return;
    }

    for (const k in target) {
      const buffer = target[k];
      if (!buffer) continue;

      const type = this.config.types[k];
      const len = this.config.struct[k];
      const offset = this.config.offsets[k];

      const bufferView = new Uint8Array(buffer.buffer);

      for (let i = 0; i < this.config.capacity; i++) {
        const srcOffset = i * this._stride + offset;
        const dstOffset = i * len * type.BYTES_PER_ELEMENT;
        bufferView.set(
          new Uint8Array(this.buffer, srcOffset, len * type.BYTES_PER_ELEMENT),
          dstOffset
        );
      }
    }
  }

  public *iterate(): Generator<WrapperStructCompiled<T>, void, unknown> {
    for (let i = 0; i < this.config.capacity; i++) {
      yield this.at(i);
    }
  }

  //
  // Private internal helper methods
  //

  private getElementAttribute(key: keyof T, index: number): number | number[] {
    const offset = this.config.offsets[key] + index * this._stride;
    const len = this.config.struct[key];
    const type = this.config.types[key];

    if (len === 1) {
      return this.readData(type, offset);
    }

    const result: number[] = [];
    for (let i = 0; i < len; i++) {
      result.push(this.readData(type, offset + i * type.BYTES_PER_ELEMENT));
    }
    return result;
  }

  private setElementAttribute(
    key: keyof T,
    v: number | number[],
    index: number
  ) {
    const offset = this.config.offsets[key] + index * this._stride;
    const type = this.config.types[key];

    if (typeof v === "number") {
      this.writeData(type, offset, v);
    } else {
      for (let i = 0; i < v.length; i++) {
        this.writeData(type, offset + i * type.BYTES_PER_ELEMENT, v[i]);
      }
    }

    // Update the attribute buffer if it exists
    if (this.buffers[key]) {
      const attrOffset = index * (typeof v === "number" ? 1 : v.length);
      this.buffers[key].set(typeof v === "number" ? [v] : v, attrOffset);
    }
  }

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
        throw new Error("Unsupported type");
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
