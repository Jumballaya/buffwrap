import type {
  ArrayType,
  BufferList,
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
  private map: Map<number, WrapperStructCompiled<T>> = new Map();
  private buffers: BufferList<T> = {} as BufferList<T>; // @TODO: better typing
  public buffer: ArrayBuffer;
  private stride = 0;

  //
  //
  //  BufferWrap constructor
  //
  //
  constructor(config: WrapperConfig<T>) {
    const offsets: Record<string, number> = {};
    let stride = 0;
    for (const k of Object.keys(config.struct)) {
      offsets[k] = stride;
      stride += config.struct[k] * config.types[k].BYTES_PER_ELEMENT;
    }
    this.stride = stride;

    this.config = {
      ...config,
      offsets: offsets as { [k in keyof T]: number },
    };

    const byteLength = this.stride * config.capacity;
    this.buffer = new ArrayBuffer(byteLength);
  }

  //
  // Get an instance of the struct at index `idx`
  //
  // This build and caches a plain object with a
  // setter and getter for each of the attribute
  // fields. This will give the user an interface to
  // update and read just a single instance
  public at(idx: number) {
    //
    // If we found the cached entry, just send it
    // The closure has everything it needs, so this
    // will only need to be ran once for each entry
    const found = this.map.get(idx);
    if (found) {
      return found;
    }

    const _getAttr = this.getElementAttribute.bind(this); // @TODO: Find a better way to build the attributes to avoid this
    const _setAttr = this.setElementAttribute.bind(this); // @TODO: Find a better way to build the attributes to avoid this

    //
    // Create an array of objects where the key
    // is each of the keys of the struct and the
    // value for each key is a pair of getters/setters.
    const attributes = Object.keys(this.config.struct).map((k: keyof T) => {
      const out = {
        get [k](): number | number[] {
          return _getAttr(k, idx);
        },
        set [k](v: number | number[]) {
          _setAttr(k, v, idx);
        },
      } as { [k in keyof T]: T[k] };
      return out;
    }) satisfies Array<{ [k in keyof T]: T[k] }>;

    //
    //  Fold the array above into a single object.
    //  This is all done to preserve the getters/setters
    const obj: WrapperStructCompiled<T> = attributes.reduce(
      (res, attribute) => {
        Object.defineProperties(
          res,
          (Object as any).getOwnPropertyDescriptors(attribute) // @TODO: Fix typing
        );
        return res;
      },
      {} as WrapperStructCompiled<T>
    );

    // Cache the object and return it
    this.map.set(idx, obj);
    return obj;
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
      const start = this.stride * i + offset;
      const end = start + len * type.BYTES_PER_ELEMENT;
      buffer.set(new type(this.buffer.slice(start, end)), i * len);
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
      this.map.clear();
      return;
    }

    // TypedArray (e.g. Float32Array, Uint8Array, etc.)
    if (buffer.buffer) {
      this.buffer = buffer.buffer.slice().buffer;
      this.map.clear();
      return;
    }

    // Otherwise we have the partial bufferlist to build from
    const keys: Array<keyof T> = Object.keys(buffer);
    for (const k of keys) {
      const inDataBuffer = buffer[k]!;
      const stride = this.stride;
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

    this.map.clear();
  }

  // @TODO: Think about the following methods:
  //
  //      slice    (create a BuffWrapSlice)
  //      insert   (insert a list of structs at an index, given a buffer, a struct of buffers, another BuffWrap or a BuffWrapSlice)
  //      copyInto (copies data into a struct of buffers, a single buffer, into another BuffWrap, or a BuffWrapSlice)
  //

  //
  // Private internal helper methods
  //

  private getElementAttribute(key: keyof T, index: number): number | number[] {
    const offset = this.config.offsets[key];
    const len = this.config.struct[key];
    const startByte = index * this.stride + offset;
    const endByte = startByte + len * this.config.types[key].BYTES_PER_ELEMENT;
    const buffer = new this.config.types[key](
      this.buffer.slice(startByte, endByte)
    );

    if (len === 1) {
      return buffer[0];
    }
    return Array.from(buffer);
  }

  private setElementAttribute(
    key: keyof T,
    v: number | number[],
    index: number
  ) {
    const offset = this.config.offsets[key];
    const value = new this.config.types[key](typeof v === "number" ? [v] : v);
    const startByte = index * this.stride + offset;

    // make sure to update the main buffer
    new Uint8Array(this.buffer, 0, this.buffer.byteLength).set(
      new Uint8Array(value.buffer),
      startByte
    );

    // as well as to update the individual attribute buffer
    if (this.buffers[key]) {
      const attrOffset = index * value.length;
      this.buffers[key].set(value, attrOffset);
    }
  }
}
