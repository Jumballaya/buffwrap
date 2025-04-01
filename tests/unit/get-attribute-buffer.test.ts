import BufferWrap from "../../dist";
import { config, TestStruct } from "../helper";

test("returns correct attribute data for all elements", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 3 });
  buffer.at(0).a = 10;
  buffer.at(1).a = 20;
  buffer.at(2).a = 30;

  const aBuffer = buffer.getAttributeBuffer("a") as Uint8Array;
  expect(aBuffer).toEqual(Uint8Array.from([10, 20, 30]));
});

test("modifying attribute buffer does not mutate BufferWrap data", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 1;
  const aBuf = buffer.getAttributeBuffer("a");
  aBuf[0] = 99;
  expect(buffer.at(0).a).toBe(1);
});

test("attribute buffer respects capacity and stride", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  const bBuf = buffer.getAttributeBuffer("b") as Float32Array;
  expect(bBuf.length).toBe(4); // 2 elements * 2 components
});

test("buffers are cached and reused", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 1 });
  const buf1 = buffer.getAttributeBuffer("a");
  const buf2 = buffer.getAttributeBuffer("a");
  expect(buf1).toBe(buf2);
});

test("vector field buffer layout is contiguous and correct", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).b = [1.1, 2.2];
  buffer.at(1).b = [3.3, 4.4];
  const bBuf = buffer.getAttributeBuffer("b") as Float32Array;
  expect(bBuf[0]).toBeCloseTo(1.1);
  expect(bBuf[1]).toBeCloseTo(2.2);
  expect(bBuf[2]).toBeCloseTo(3.3);
  expect(bBuf[3]).toBeCloseTo(4.4);
});
