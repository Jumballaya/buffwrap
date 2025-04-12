import { ProxyManager } from "./ProxyManager";
import type {
  ArrayType,
  BufferList,
  WrapperConfig,
  WrapperStructConfig,
  ManagedProxy,
  ProxyAccessStrategy,
  ProxyShape,
  BufferType,
  CopyTarget,
} from "./types";

//
// BufferWrap
//
//    BufferWrap makes it easy to deal with a buffer of structured data.
//    This could be particles in a particle system, messages passed from
//    web workers, information from a WebGPU compute pipeline, lighting
//    data in a uniform buffer, etc. etc.
export class BufferWrap<T extends ProxyShape, B extends BufferType> {
  private config: WrapperConfig<T, B>;
  private strategy: ProxyAccessStrategy<T, B>;
  private proxyManager: ProxyManager<T, B>;
  private buffers: BufferList<T> = {} as BufferList<T>; // @TODO: better typing
  private baseOffset = 0;
  private _stride = 0;

  constructor(config: WrapperConfig<T, B>) {
    this.config = config;
    const alignment = config.alignment ?? 4;

    if (!config.offsets) {
      const [offsets, stride] = generateOffsetsAndStride(
        config.struct,
        alignment
      );
      this._stride = stride;
      this.config.offsets = offsets;
    }

    this.strategy = new config.strategy({
      struct: this.config.struct,
      offsets: this.config.offsets!,
      stride: this.stride,
      capacity: this.config.capacity,
      alignment: this.config.alignment,
      ...(config.strategyArgs ?? {}),
    });

    this.proxyManager = new ProxyManager<T, B>(this.strategy);
  }

  public get stride(): number {
    return this.strategy.getStride();
  }

  public get byteLength(): number {
    return this.strategy.getByteLength();
  }

  public getStrategy() {
    return this.strategy;
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
  public at(idx: number): ManagedProxy<T> {
    if (idx < 0 || idx >= this.config.capacity) {
      throw new Error(
        `at(): Index ${idx} is out of bounds (capacity: ${this.config.capacity}).`
      );
    }
    const logicalIndex = this.getLogicalIndex(idx);
    return this.proxyManager.getProxy(logicalIndex);
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
    const buffer = new type(length * this.config.capacity);

    for (let i = 0; i < this.config.capacity; i++) {
      const value = this.strategy.get(key, i);
      if (typeof value === "number") {
        buffer[i] = value;
      } else {
        buffer.set(value as number[], i * length);
      }
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
    this.strategy.from(buffer);
    this.proxyManager.clear();
    this.buffers = {} as BufferList<T>;
  }

  // Move an element from one location to another.
  // You can do somehing like .move(struct, 10) which would move your struct to
  // the index 10 and that would be reflected in the underlying data buffer
  // or you can do something like .move(42, 10) which will move the struct
  // data at index 42 to index 10
  public move(fromId: number | ManagedProxy<T>, toId: number) {
    const from = isProxy(fromId)
      ? isProxy(fromId.currentIndex)
        ? -1
        : fromId.currentIndex
      : (fromId as number);

    if (from === toId) return;
    if (from === undefined) {
      throw new Error(`move(): Source index not found.`);
    }

    // Check only within the bounds of the slice
    const sliceStart = this.baseOffset / this._stride;
    const sliceEnd = sliceStart + this.config.capacity;
    if (
      from < sliceStart ||
      from >= sliceEnd ||
      toId < sliceStart ||
      toId >= sliceEnd
    ) {
      throw new Error(
        `move(): Indices out of bounds for slice (from: ${from}, to: ${toId}, slice range: ${sliceStart}-${
          sliceEnd - 1
        })`
      );
    }

    this.proxyManager.move(from, toId);
  }

  //
  //  Generates a slice (like a view) of the selected range of
  //  memory, giving you back a scoped BufferWrap<T> that you
  //  can edit and allow for parent and/or child to update sections
  public slice(start: number, end = this.config.capacity): BufferWrap<T, B> {
    if (start < 0 || end > this.config.capacity || start >= end) {
      throw new Error(
        `slice(): Invalid range (start: ${start}, end: ${end}, capacity: ${this.config.capacity})`
      );
    }

    const capacity = end - start;
    const config = {
      ...this.config,
      capacity,
    };

    // Create a new BufferWrap
    // But avoid invoking the constructor altogether
    // this also avoids creating another strategy
    const slice = Object.create(BufferWrap.prototype) as BufferWrap<T, B>;
    slice.config = config;
    slice._stride = this._stride;
    slice.baseOffset = this.baseOffset + start * this._stride;
    slice.strategy = this.strategy;
    slice.proxyManager = this.proxyManager;
    slice.buffers = {} as BufferList<T>;
    return slice;
  }

  // if you dont insert an ArrayBuffer, the assumption is you are inserting
  // only 1 element.
  public insert<OB extends BufferType = B>(
    idx: number,
    data: CopyTarget<T, OB>
  ) {
    if (idx < 0 || idx > this.config.capacity) {
      throw new Error(
        `insert(): Index ${idx} is out of bounds (capacity: ${this.config.capacity}).`
      );
    }

    const insertCount = data instanceof BufferWrap ? data.config.capacity : 1;
    const newCapacity = this.config.capacity + insertCount;

    this.strategy.ensureCapacity(newCapacity);

    // Move existing data forward
    for (let i = this.config.capacity - 1; i >= idx; i--) {
      this.strategy.move(i, i + insertCount);
    }

    if (data instanceof BufferWrap) {
      const source = data.getStrategy();
      this.strategy.from(source, 0, insertCount);
    } else {
      this.strategy.from(data, idx);
    }

    this.proxyManager.insert(idx, insertCount);
    this.setCapacity(newCapacity);
  }

  // clone or extract the current buffer into a CopyTarget
  public copyInto<OB extends BufferType = B>(target: CopyTarget<T, OB>) {
    const sourceStart = 0;
    const sourceEnd = this.config.capacity;

    if (target instanceof BufferWrap) {
      if (target.config.capacity < this.config.capacity) {
        throw new Error(
          `copyInto(): Target BufferWrap capacity (${target.config.capacity}) is smaller than source (${this.config.capacity})`
        );
      }
    }

    this.strategy.clone(target, sourceStart, sourceEnd);
  }

  // Swap the contents of 2 structs given their ids
  public swap(a: number, b: number) {
    if (a === b) return;
    if (
      a < 0 ||
      b < 0 ||
      a >= this.config.capacity ||
      b >= this.config.capacity
    ) {
      throw new Error(
        `swap(): Indices out of bounds (a: ${a}, b: ${b}, capacity: ${this.config.capacity})`
      );
    }
    this.strategy.swap(a, b);
    this.proxyManager.swap(a, b);
  }

  public *iterate(): Generator<ManagedProxy<T>, void, unknown> {
    for (let i = 0; i < this.config.capacity; i++) {
      yield this.at(i);
    }
  }

  //
  // Private internal helper methods
  //
  private setCapacity(newCapacity: number) {
    this.config.capacity = newCapacity;
    this.buffers = {} as BufferList<T>;
  }

  private getLogicalIndex(localIdx: number): number {
    return localIdx + this.baseOffset / this._stride;
  }
}

function alignOffset(offset: number, alignment: number): number {
  return Math.ceil(offset / alignment) * alignment;
}

/**
 * Computes byte offsets and stride for a struct definition,
 * aligning each field appropriately.
 */
function generateOffsetsAndStride<T extends ProxyShape, B extends BufferType>(
  struct: WrapperStructConfig<T>,
  alignment: number
): [WrapperConfig<T, B>["offsets"], number] {
  const offsets: Record<string, number> = {};
  let stride = 0;
  for (const key in struct) {
    const { type, length } = struct[key];
    const typeAlignment = type.BYTES_PER_ELEMENT;
    const align = Math.max(alignment, typeAlignment);
    stride = alignOffset(stride, align);
    offsets[key] = stride;
    stride += length * typeAlignment;
  }

  return [offsets as WrapperConfig<T, B>["offsets"], stride];
}

function isProxy<T extends ProxyShape>(value: any): value is ManagedProxy<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.currentIndex === "number"
  );
}
