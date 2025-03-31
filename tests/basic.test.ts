import BufferWrap from "../dist";

type VertexStruct = {
  position: [number, number, number];
  texCoord: [number, number];
  normal: [number, number, number];
};

test("Can create a simple quad", () => {
  const quadWrapper = new BufferWrap<VertexStruct>({
    types: {
      position: Float32Array,
      texCoord: Float32Array,
      normal: Float32Array,
    },
    capacity: 4,
    struct: {
      position: 3,
      texCoord: 2,
      normal: 3,
    },
  });

  const xPos = [-1, 1];
  const yPos = [-1, 1];
  const xUv = [0, 1];
  const yUv = [0, 1];
  const normal: [number, number, number] = [0, 0, 1];

  let c = 0;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      quadWrapper.at(c).position = [xPos[i], yPos[j], 0];
      quadWrapper.at(c).texCoord = [xUv[i], yUv[j]];
      quadWrapper.at(c).normal = normal;
      c++;
    }
  }

  // Positions
  expect(quadWrapper.at(0).position).toStrictEqual([-1, -1, 0]);
  expect(quadWrapper.at(1).position).toStrictEqual([-1, 1, 0]);
  expect(quadWrapper.at(2).position).toStrictEqual([1, -1, 0]);
  expect(quadWrapper.at(3).position).toStrictEqual([1, 1, 0]);

  // Tex Coords
  expect(quadWrapper.at(0).texCoord).toStrictEqual([0, 0]);
  expect(quadWrapper.at(1).texCoord).toStrictEqual([0, 1]);
  expect(quadWrapper.at(2).texCoord).toStrictEqual([1, 0]);
  expect(quadWrapper.at(3).texCoord).toStrictEqual([1, 1]);

  // Normals
  expect(quadWrapper.at(0).normal).toStrictEqual([0, 0, 1]);
  expect(quadWrapper.at(1).normal).toStrictEqual([0, 0, 1]);
  expect(quadWrapper.at(2).normal).toStrictEqual([0, 0, 1]);
  expect(quadWrapper.at(3).normal).toStrictEqual([0, 0, 1]);
});

type TestStruct = {
  a: number;
  b: [number, number];
};

const config = {
  struct: {
    a: 1,
    b: 2,
  },
  types: {
    a: Uint8Array,
    b: Float32Array,
  },
  capacity: 4,
  alignment: 4,
};

test("Can set and get single and vector values", () => {
  const buffer = new BufferWrap<TestStruct>(config);
  const entry = buffer.at(0);

  entry.a = 42;
  entry.b = [1.1, 2.2];

  expect(entry.a).toBe(42);
  expect(entry.b[0]).toBeCloseTo(1.1);
  expect(entry.b[1]).toBeCloseTo(2.2);
});

test("Can move one entry to another index", () => {
  const buffer = new BufferWrap<TestStruct>(config);
  buffer.at(0).a = 123;
  buffer.at(0).b = [3.14, 6.28];

  buffer.move(0, 1);

  expect(buffer.at(1).a).toBe(123);
  expect(buffer.at(1).b[0]).toBeCloseTo(3.14);
  expect(buffer.at(1).b[1]).toBeCloseTo(6.28);
});

test("Slice returns shared view", () => {
  const buffer = new BufferWrap<TestStruct>(config);
  buffer.at(1).a = 100;
  buffer.at(1).b = [9, 9];

  const slice = buffer.slice(1, 2);
  expect(slice.at(0).a).toBe(100);
  expect(slice.at(0).b).toStrictEqual([9, 9]);

  // Modify slice and see changes in original
  slice.at(0).a = 88;
  expect(buffer.at(1).a).toBe(88);
});

test("Can insert raw struct at index", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });

  buffer.insert(0, {
    a: new Uint8Array([99]),
    b: new Float32Array([2.2, 3.3]),
  });

  expect(buffer.at(0).a).toBe(99);
  expect(buffer.at(0).b[0]).toBeCloseTo(2.2);
  expect(buffer.at(0).b[1]).toBeCloseTo(3.3);
});

test("Can copy into another BufferWrap", () => {
  const src = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  const dst = new BufferWrap<TestStruct>({ ...config, capacity: 2 });

  src.at(0).a = 55;
  src.at(0).b = [4, 5];

  src.copyInto(dst);

  expect(dst.at(0).a).toBe(55);
  expect(dst.at(0).b).toStrictEqual([4, 5]);
});

test("Can extract typed attribute buffer", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;

  const aBuffer = buffer.getAttributeBuffer("a");
  expect(aBuffer[0]).toBe(1);
  expect(aBuffer[1]).toBe(2);
});

test("Can populate from another buffer", () => {
  const source = new BufferWrap<TestStruct>({ ...config, capacity: 2 });
  const target = new BufferWrap<TestStruct>({ ...config, capacity: 2 });

  source.at(0).a = 77;
  source.at(0).b = [1.23, 4.56];

  target.from(source.buffer);

  expect(target.at(0).a).toBe(77);
  expect(target.at(0).b[0]).toBeCloseTo(1.23);
  expect(target.at(0).b[1]).toBeCloseTo(4.56);
});

test("Can iterate through all elements", () => {
  const buffer = new BufferWrap<TestStruct>({ ...config, capacity: 3 });
  buffer.at(0).a = 1;
  buffer.at(1).a = 2;
  buffer.at(2).a = 3;

  const values = [...buffer.iterate()].map((entry) => entry.a);
  expect(values).toStrictEqual([1, 2, 3]);
});
