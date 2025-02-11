import {
  ArrayType,
  WrapperConfig,
  WrapperStruct,
  WrapperStructCompiled,
  WrapperStructTypesConfig,
} from "./types";

type BufferList<T extends WrapperStruct> = {
  [k in keyof T]:
    | Float32Array
    | Uint8Array
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array; // TypedArray type
};

export class BufferWrap<T extends WrapperStruct> {
  private config: WrapperConfig<T>;
  private map: Map<number, WrapperStructCompiled<T>> = new Map();
  public buffer?: ArrayType;
  public buffers: BufferList<T> = {} as BufferList<T>; // @TODO: better typing
  private stride = 0;

  //
  //
  //  BufferWrap constructor
  //
  //
  constructor(config: WrapperConfig<T>) {
    this.config = config;
    for (const k of Object.keys(config.struct)) {
      this.stride += config.struct[k];
    }
    //
    //  Handle the interleved scenario
    //
    //  This is easy, we just create 1 giant buffer
    //  the size is just the stride from above
    //  multiplied by the capacity.
    //  If the config has the interleve field set to
    //  true, then we can use the type field as a
    //  constructor for our buffer.
    if (config.interleve) {
      let size = this.stride * config.capacity;
      size = Math.max(
        config.chunkSize ?? 4,
        size + (size % (config.chunkSize ?? 4))
      );
      this.buffer = new config.type(size);

      //
      // Handle the Non-interleved scenario
      //
      // We need to create the buffers from
      // the give constructors
      // 1 buffer will exist for each field
      // in the struct.
      // Each buffer is created just like
      // the one above.
    } else {
      for (const k of Object.keys(config.types)) {
        const stride = config.struct[k];
        let size = stride * config.capacity;
        size = Math.max(
          config.chunkSize ?? 4,
          size + (size % (config.chunkSize ?? 4))
        );
        const buffer = new config.types[k](size);
        (this.buffers as any)[k] = buffer; // @TODO: typing
      }
    }
  }

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
    const index = idx * this.stride;
    const buffer = this.buffer || new Float32Array(0);
    const buffers = this.buffers;
    const struct = this.config.struct;
    const interleved = this.config.interleve;
    let offset = 0;

    //
    // This section creates an array of objects where the
    // key is each of the keys of the struct and the value
    // for each key is a pair of getters/setters.
    const attributes = Object.keys(this.config.struct).map((k: keyof T) => {
      const len = this.config.struct[k];
      const off = offset;
      const out = {
        //
        //  Getter: if the data is interleved then use the buffer
        //  varialble. otherwise use the buffers variable
        //
        get [k](): number | number[] {
          let out = generate_struct_out(len);
          if (interleved) {
            for (let i = 0; i < len; i++) {
              if (typeof out === "number") {
                out = buffer[index + off + i];
              } else if (out instanceof Array) {
                out[i] = buffer[index + off + i];
              }
            }
            return out;
          }
          const singleBuffer = buffers[k];
          if (singleBuffer) {
            const index = idx * struct[k];
            for (let i = 0; i < len; i++) {
              if (typeof out === "number") {
                out = singleBuffer[index + off + i];
              } else if (out instanceof Array) {
                out[i] = singleBuffer[index + off + i];
              }
            }
          }
          return out;
        },
        //
        //  Setter: if the data is interleved then use the buffer
        //  varialble. otherwise use the buffers variable
        //
        set [k](v: number | number[]) {
          if (interleved) {
            for (let i = 0; i < len; i++) {
              buffer[index + off + i] = (typeof v === "number" ? v : v[i]) ?? 0;
            }
            return;
          }
          const singleBuffer = buffers[k];
          for (let i = 0; i < len; i++) {
            singleBuffer[index + off + i] =
              (typeof v === "number" ? v : v[i]) ?? 0;
          }
        },
      } as { [k in keyof T]: T[k] };
      offset += len;
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
}

function generate_struct_out(len: number): number | number[] {
  if (len === 1) return 0;
  return Array.from(new Array(len)).map(() => 0);
}
