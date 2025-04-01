import BufferWrap from "../dist";

test("BufferWrap clear errors", () => {
  const config = {
    struct: { vec: { length: 3, type: Float32Array } },
    capacity: 1,
  };
  const wrap = new BufferWrap(config);

  expect(() => wrap.at(-1)).toThrow("Index -1 is out of bounds");
  expect(() => wrap.insert(2, new ArrayBuffer(4))).toThrow(
    "insert(): Index 2 is out of bounds"
  );
  expect(() => wrap.move(0, -1)).toThrow("move(): Indices out of bounds");
  expect(() => {
    wrap.at(0).vec = [1, 2];
  }).toThrow("expects array of length 3");
});
