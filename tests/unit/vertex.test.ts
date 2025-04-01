import BufferWrap from "../../dist";

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
