import type {
  ArrayType,
  BufferList,
  TypedArrayConstructor,
  WrapperConfig,
  WrapperConfigOffsets,
  WrapperStruct,
  WrapperStructCompiled,
} from "./types";

//
// BufferWrap
//
//    BufferWrap makes it easy to deal with a buffer of structured data.
//    This could be particles in a particle system, messages passed from
//    web workers, information from a WebGPU compute pipeline, lighting
//    data in a uniform buffer, etc. etc.
export class BufferWrap<T extends WrapperStruct> {
  private config: WrapperConfig<T> & WrapperConfigOffsets<T>;
  private proxyCache: Map<number, WrapperStructCompiled<T>> = new Map();
  private buffers: BufferList<T> = {} as BufferList<T>; // @TODO: better typing
  public buffer: ArrayBuffer;
  private view: DataView;
  private _stride = 0;
  private baseOffset = 0;

  constructor(config: WrapperConfig<T> & Partial<WrapperConfigOffsets<T>>) {
    const alignment = config.alignment ?? 4;

    if (!config.offsets) {
      const offsets: Record<string, number> = {};
      let stride = 0;
      for (const key in config.struct) {
        const { type, length } = config.struct[key];
        const typeAlignment = type.BYTES_PER_ELEMENT;

        stride = alignOffset(stride, Math.max(alignment, typeAlignment));
        offsets[key] = stride;
        stride += length * typeAlignment;
      }

      this._stride = stride;

      this.config = {
        ...config,
        offsets: offsets as WrapperConfigOffsets<T>["offsets"],
      };
    } else {
      this.config = config as WrapperConfig<T> & WrapperConfigOffsets<T>;
      this._stride = Object.entries(this.config.offsets).reduce(
        (acc, [key, val]) => {
          const { length, type } = this.config.struct[key as keyof T];
          return Math.max(acc, val + length * type.BYTES_PER_ELEMENT);
        },
        0
      );
    }

    const byteLength = this._stride * config.capacity;
    this.buffer = config.buffer ?? new ArrayBuffer(byteLength);
    this.view = new DataView(this.buffer);
  }

  public get byteLength(): number {
    return this.view.byteLength;
  }

  public get stride(): number {
    return this._stride;
  }

  public attributeStride(name: string): number {
    const key = name as keyof T;
    if (key in this.config.struct) {
      const { type, length } = this.config.struct[key];
      return type.BYTES_PER_ELEMENT * length;
    }
    return 0;
  }

  // Generates a proxy object that represents your struct at
  // the given index. updating this proxy will update the
  // underlying buffer
  public at(idx: number): WrapperStructCompiled<T> {
    if (idx < 0 || idx >= this.config.capacity) {
      throw new Error(
        `at(): Index ${idx} is out of bounds (capacity: ${this.config.capacity}).`
      );
    }
    const cacheKey = this.baseOffset + idx * this._stride;
    let found = this.proxyCache.get(cacheKey);
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

    if (!this.proxyCache.has(cacheKey)) {
      this.proxyCache.set(cacheKey, found);
    }

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

    const { type, length } = this.config.struct[key];
    const offset = this.config.offsets[key];
    const buffer = new type(length * this.config.capacity);

    for (let i = 0; i < this.config.capacity; i++) {
      const start = this._stride * i + offset;
      const end = start + length * type.BYTES_PER_ELEMENT;
      buffer.set(new type(this.buffer.slice(start, end)), i * length);
    }

    this.buffers[key] = buffer;
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
      this.view = new DataView(this.buffer);
      this.proxyCache.clear();
      this.buffers = {} as BufferList<T>;
      return;
    }

    // TypedArray (e.g. Float32Array, Uint8Array, etc.)
    if (buffer.buffer) {
      this.buffer = buffer.buffer.slice().buffer;
      this.view = new DataView(this.buffer);
      this.proxyCache.clear();
      this.buffers = {} as BufferList<T>;
      return;
    }

    // Otherwise we have the partial bufferlist to build from
    const keys: Array<keyof T> = Object.keys(buffer);
    for (const k of keys) {
      const inDataBuffer = buffer[k]!;
      const stride = this._stride;
      const offset = this.config.offsets[k];
      const { type, length } = this.config.struct[k];
      for (let i = 0; i < this.config.capacity; i++) {
        const ptr = stride * i + offset;
        new Uint8Array(this.buffer, ptr, length * type.BYTES_PER_ELEMENT).set(
          new Uint8Array(
            inDataBuffer.buffer,
            i * length * type.BYTES_PER_ELEMENT,
            length * type.BYTES_PER_ELEMENT
          ),
          0
        );
      }
    }

    this.proxyCache.clear();
    this.buffers = {} as BufferList<T>;
  }

  // Move an element from one location to another.
  // You can do somehing like .move(struct, 10) which would move your struct to
  // the index 10 and that would be reflected in the underlying data buffer
  // or you can do something like .move(42, 10) which will move the struct
  // data at index 42 to index 10
  public move(fromId: number | WrapperStructCompiled<T>, toId: number) {
    const from =
      typeof fromId === "number"
        ? fromId
        : [...this.proxyCache.entries()].find(([, v]) => v === fromId)?.[0];

    if (from === undefined) {
      throw new Error(`move(): Source index not found.`);
    }

    if (
      from === undefined ||
      from === toId ||
      from < 0 ||
      toId < 0 ||
      from >= this.config.capacity ||
      toId >= this.config.capacity
    ) {
      throw new Error(
        `move(): Indices out of bounds (source: ${from}, target: ${toId}, capacity: ${this.config.capacity}).`
      );
    }

    const fromStart = this.baseOffset + from * this._stride;
    const toStart = this.baseOffset + toId * this._stride;

    new Uint8Array(this.buffer, toStart, this._stride).set(
      new Uint8Array(this.buffer, fromStart, this._stride)
    );

    const proxy = this.proxyCache.get(fromStart);
    this.proxyCache.clear();
    if (proxy) {
      this.proxyCache.set(toStart, proxy);
    }
  }

  public slice(start: number, end = this.config.capacity): BufferWrap<T> {
    const capacity = Math.max(0, end - start);
    const config = {
      ...this.config,
      capacity,
      buffer: this.buffer,
    };
    const bw = new BufferWrap<T>(config);
    bw.view = this.view;
    bw.baseOffset = this.baseOffset + start * this._stride;
    bw.proxyCache = this.proxyCache;
    return bw;
  }

  // if you dont insert an ArrayBuffer, the assumption is you are inserting
  // only 1 element
  public insert(
    idx: number,
    data: ArrayBuffer | Partial<BufferList<T>> | BufferWrap<T>
  ) {
    if (idx < 0 || idx > this.config.capacity) {
      throw new Error(
        `insert(): Index ${idx} is out of bounds (capacity: ${this.config.capacity}).`
      );
    }
    const insertCount = data instanceof BufferWrap ? data.config.capacity : 1;
    const requiredCapacity = this.config.capacity + insertCount;

    if (requiredCapacity * this._stride > this.buffer.byteLength) {
      const newBufferSize = Math.max(
        this.byteLength * 2,
        requiredCapacity * this._stride
      );
      const newBuffer = new ArrayBuffer(newBufferSize);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
      this.view = new DataView(this.buffer);
    }

    // Move existing data forward to make space
    for (let i = this.config.capacity - 1; i >= idx; i--) {
      const fromOffset = i * this._stride;
      const toOffset = (i + insertCount) * this._stride;
      new Uint8Array(this.buffer, toOffset, this._stride).set(
        new Uint8Array(this.buffer, fromOffset, this._stride)
      );
    }

    this.config.capacity = requiredCapacity;
    this.proxyCache.clear();

    if (data instanceof BufferWrap) {
      const sameStruct =
        JSON.stringify(this.config.struct) ===
        JSON.stringify(data.config.struct);
      const sameTypes = Object.keys(this.config.struct).every(
        (k) => this.config.struct[k].type === data.config.struct[k].type
      );

      if (!sameStruct || !sameTypes) {
        throw new Error(
          "insert(): BufferWrap struct mismatch between source and target."
        );
      }

      const isSelfSlice = data.buffer === this.buffer;
      const temp = isSelfSlice
        ? new Uint8Array(data._stride * data.config.capacity)
        : null;
      if (isSelfSlice) {
        temp?.set(
          new Uint8Array(
            data.buffer,
            data.baseOffset,
            data._stride * data.config.capacity
          )
        );
      }

      for (let i = 0; i < data.config.capacity; i++) {
        const fromOffset = isSelfSlice
          ? i * data._stride
          : data.baseOffset + i * data._stride;
        const toOffset = (idx + i) * this._stride;
        new Uint8Array(this.buffer, toOffset, this._stride).set(
          isSelfSlice && temp !== null
            ? new Uint8Array(temp?.buffer, fromOffset, this._stride)
            : new Uint8Array(data.buffer, fromOffset, this._stride)
        );
      }

      return;
    }

    if (data instanceof ArrayBuffer) {
      if (data.byteLength !== this._stride) {
        throw new Error(
          `insert(): ArrayBuffer length mismatch (expected: ${this._stride}, received: ${data.byteLength}).`
        );
      }
      new Uint8Array(this.buffer, idx * this._stride, data.byteLength).set(
        new Uint8Array(data)
      );
      return;
    }

    // Struct of typed arrays (BufferList-style)
    for (const key in data) {
      const value = data[key];
      if (!value) continue;

      const { type, length } = this.config.struct[key];
      const offset = this.config.offsets[key];

      if (!(value instanceof type)) {
        throw new Error(
          `insert(): Invalid type for field "${key}". Expected ${type.name}, received ${value.constructor.name}.`
        );
      }

      for (let i = 0; i < length; i++) {
        const byteOffset =
          idx * this._stride + offset + i * type.BYTES_PER_ELEMENT;
        this.writeData(type, byteOffset, value[i]);
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
        const fromOffset = this.baseOffset + i * this._stride;
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

      const { type, length } = this.config.struct[k];
      const offset = this.config.offsets[k];

      const bufferView = new Uint8Array(buffer.buffer);

      for (let i = 0; i < this.config.capacity; i++) {
        const srcOffset = this.baseOffset + i * this._stride + offset;
        const dstOffset = i * length * type.BYTES_PER_ELEMENT;
        bufferView.set(
          new Uint8Array(
            this.buffer,
            srcOffset,
            length * type.BYTES_PER_ELEMENT
          ),
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

  private getElementAttribute(key: keyof T, idx: number): number | number[] {
    const offset =
      this.baseOffset + this.config.offsets[key] + idx * this._stride;
    const { length, type } = this.config.struct[key];

    if (length === 1) {
      return this.readData(type, offset);
    }

    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      result.push(this.readData(type, offset + i * type.BYTES_PER_ELEMENT));
    }
    return result;
  }

  private setElementAttribute(
    key: keyof T,
    v: number | number[],
    index: number
  ) {
    this.validateAttribute(key, v);
    const offset =
      this.baseOffset + this.config.offsets[key] + index * this._stride;
    const type = this.config.struct[key].type;

    if (typeof v === "number") {
      this.writeData(type, offset, v);
    } else {
      for (let i = 0; i < v.length; i++) {
        this.writeData(type, offset + i * type.BYTES_PER_ELEMENT, v[i]);
      }
    }
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

  private validateAttribute(key: keyof T, value: any) {
    const { length, type } = this.config.struct[key];

    if (typeof value === "number") {
      if (length !== 1) {
        throw new Error(
          `Expected array of length ${length} for "${String(
            key
          )}", but got a scalar value instead`
        );
      }
      if (type !== Float32Array && !Number.isInteger(value)) {
        throw new Error(
          `Attribute "${String(
            key
          )}" expects integer values, but received a non-integer scalar value ${value}.`
        );
      }
    } else if (Array.isArray(value)) {
      if (value.length !== length) {
        throw new Error(
          `Attribute "${String(
            key
          )}" expects array of length ${length}, but received length ${
            value.length
          }.`
        );
      }
      value.forEach((v, i) => {
        if (typeof v !== "number") {
          throw new Error(
            `Attribute "${String(
              key
            )}" received invalid type at index ${i}. Expected number, received ${typeof v}.`
          );
        }
        if (type !== Float32Array && !Number.isInteger(v)) {
          throw new Error(
            `Attribute "${String(
              key
            )}" expects integer values, but received a non-integer value ${v} at index ${i}.`
          );
        }
      });
    } else {
      throw new Error(
        `Attribute "${String(
          key
        )}" received invalid type. Expected number or array, received ${typeof value}.`
      );
    }
  }
}

function alignOffset(offset: number, alignment: number): number {
  return Math.ceil(offset / alignment) * alignment;
}
