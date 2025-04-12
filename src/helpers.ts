import { BufferWrap } from "./BufferWrap";
import {
  BufferType,
  ManagedProxy,
  ProxyShape,
  WrapperConfig,
  WrapperStructConfig,
} from "./types";

export function structsAreEqual<T extends ProxyShape>(
  a: WrapperStructConfig<T>,
  b: WrapperStructConfig<T>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!b[key]) return false;
    if (a[key].length !== b[key].length || a[key].type !== b[key].type) {
      return false;
    }
  }
  return true;
}

function alignOffset(offset: number, alignment: number): number {
  return Math.ceil(offset / alignment) * alignment;
}

/**
 * Computes byte offsets and stride for a struct definition,
 * aligning each field appropriately.
 */
export function generateOffsetsAndStride<
  T extends ProxyShape,
  B extends BufferType
>(
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

export function isProxy<T extends ProxyShape>(
  value: any
): value is ManagedProxy<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.currentIndex === "number"
  );
}

export function isSameBufferSource(
  a: { getStrategy(): unknown },
  b: { getStrategy(): unknown }
): boolean {
  const as = a.getStrategy();
  const bs = b.getStrategy();
  if (as === null || as === undefined || bs === null || bs === undefined) {
    return false;
  }
  return as === bs;
}
