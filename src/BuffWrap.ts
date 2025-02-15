import type {
  ArrayType,
  BufferList,
  WrapperConfig,
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
//
//
//      @TODO: Auto interleve/non-interleve when asked for.
//             a common pattern in the API should be passing in a buffer
//             (Float32Array, Uint32Array, etc.) or passing in a struct
//            of buffers (plain object with a string key and buffer value)
//            with the idea that it will be written into or read from
//            depending on the method called.
//
//
export class BufferWrap<T extends WrapperStruct> {
  private config: WrapperConfig<T>;
  private map: Map<number, WrapperStructCompiled<T>> = new Map();
  public buffer: ArrayBuffer;
  // public buffers: BufferList<T> = {} as BufferList<T>; // @TODO: better typing
  private stride = 0;

  //
  //
  //  BufferWrap constructor
  //
  //
  constructor(config: WrapperConfig<T>) {
    this.config = config;
    for (const k of Object.keys(config.struct)) {
      this.stride += config.struct[k] * config.types[k].BYTES_PER_ELEMENT;
    }
    const byteLength = this.stride * config.capacity;
    this.buffer = new ArrayBuffer(byteLength);
  }

  //
  // Get an instance of the struct at index `idx`
  //
  //
  public at(idx: number) {
    //
    // If we found the cached entry, just send it
    // The closure has everything it needs, so this
    // will only need to be ran once for each entry
    const found = this.map.get(idx);
    if (found) {
      return found;
    }

    //
    // This is what we need in scope from the BufferWrap class
    // as well as keeping track of the overall offset
    const _getAttr = this.getElementAttribute.bind(this); // @TODO: Find a better way to build the attributes to avoid this
    const _setAttr = this.setElementAttribute.bind(this); // @TODO: Find a better way to build the attributes to avoid this
    let offset = 0;

    //
    // This section creates an array of objects where the
    // key is each of the keys of the struct and the value
    // for each key is a pair of getters/setters.
    const attributes = Object.keys(this.config.struct).map((k: keyof T) => {
      const off = offset;
      const out = {
        //
        //  Getter: if the data is interleved then use the buffer
        //  varialble. otherwise use the buffers variable
        //
        get [k](): number | number[] {
          return _getAttr(k, off, idx);
        },
        //
        //  Setter: if the data is interleved then use the buffer
        //  varialble. otherwise use the buffers variable
        //
        set [k](v: number | number[]) {
          _setAttr(k, v, off, idx);
        },
      } as { [k in keyof T]: T[k] };
      offset += this.config.struct[k] * this.config.types[k].BYTES_PER_ELEMENT;
      return out;
    }) satisfies Array<{ [k in keyof T]: T[k] }>;

    //
    //  This is where we fold the array above
    //  into a single object.
    //
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
  // Interleve Data:
  //  if config.interleve is true, this does nothing
  //  otherwise it will interleve the data into a single buffer
  //
  // @TODO: The idea here is to create a single ArrayBuffer
  //        from the capacity * stride in bytes
  //        then create type apropriate views of the buffer
  //        and fill them with the non-interleved data
  public interleveData() {}

  //
  // Split data:
  // if config.interleve is false, this does nothing
  // otherwise it will split an interleved data buffer
  // into 1 buffer per attribute
  //
  // @TODO: The implementation idea is to create the
  //        set of array buffers for each attribute
  //        and then read the interleved ArrayBuffer
  //        to fill out the various buffers
  public splitData() {}

  //
  //  From:
  //
  //  Take in an interleved buffer or struct of buffers
  //  and use that as the data for this configured
  //  BuffWrap
  //
  //  @TODO: Take in a buffer or buffers and:
  //
  //         single buffer: copy the data over
  //         to the BuffWrap's buffer, or buffers
  //         if its non-interleved
  //
  //         struct of buffers:
  //         walk through the struct and copy the
  //         data if non-interleved, or copy it into
  //         the single buffer if interleved.
  public from(buffer: ArrayType) {}

  // @TODO: Think about the following methods:
  //
  //      slice    (create a BuffWrapSlice)
  //      insert   (insert a list of structs at an index, given a buffer, a struct of buffers, another BuffWrap or a BuffWrapSlice)
  //      copyInto (copies data into a struct of buffers, a single buffer, into another BuffWrap, or a BuffWrapSlice)
  //
  public slice(start: number, end = Infinity): BuffWrapSlice<T> {
    return new BuffWrapSlice<T>();
  }

  public insert(start: number, data: ArrayType) {}

  public copyInto() {}

  //
  // Private internal helper methods
  //

  //
  //  Get Element
  //
  //  Gets a single element's attribute's value
  //
  private getElementAttribute(
    key: keyof T,
    offset: number, // byte offset into the individual struct
    index: number
  ): number | number[] {
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

  //
  //  Set Element
  //
  //  Sets the data on an element's attribute
  //
  private setElementAttribute(
    key: keyof T,
    v: number | number[],
    offset: number, // byte offset into the individual struct
    index: number
  ) {
    const value = new this.config.types[key](typeof v === "number" ? [v] : v);
    const startByte = index * this.stride + offset;
    new Uint8Array(this.buffer, 0, this.buffer.byteLength).set(
      new Uint8Array(value.buffer),
      startByte
    );
  }
}

class BuffWrapSlice<T extends WrapperStruct> {}

// const out = {
//   //
//   //  Getter: if the data is interleved then use the buffer
//   //  varialble. otherwise use the buffers variable
//   //
//   get [k](): number | number[] {
//     let out = generate_struct_out(len);
//     if (interleved) {
//       for (let i = 0; i < len; i++) {
//         if (typeof out === "number") {
//           out = buffer[index + off + i];
//         } else if (out instanceof Array) {
//           out[i] = buffer[index + off + i];
//         }
//       }
//       return out;
//     }
//     const singleBuffer = buffers[k];
//     if (singleBuffer) {
//       const index = idx * struct[k];
//       for (let i = 0; i < len; i++) {
//         if (typeof out === "number") {
//           out = singleBuffer[index + off + i];
//         } else if (out instanceof Array) {
//           out[i] = singleBuffer[index + off + i];
//         }
//       }
//     }
//     return out;
//   },
//   //
//   //  Setter: if the data is interleved then use the buffer
//   //  varialble. otherwise use the buffers variable
//   //
//   set [k](v: number | number[]) {
//     if (interleved) {
//       for (let i = 0; i < len; i++) {
//         buffer[index + off + i] = (typeof v === "number" ? v : v[i]) ?? 0;
//       }
//       return;
//     }
//     const singleBuffer = buffers[k];
//     for (let i = 0; i < len; i++) {
//       singleBuffer[index + off + i] =
//         (typeof v === "number" ? v : v[i]) ?? 0;
//     }
//   },
// } as { [k in keyof T]: T[k] };
