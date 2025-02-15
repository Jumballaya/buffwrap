import { BufferWrap } from "./BuffWrap";

type VertexStruct = {
  position: [number, number, number];
  texCoord: [number, number];
  normal: [number, number, number];
};

function create_quad_buffers_from() {
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
  const quadIndices = new Uint16Array([0, 1, 3, 0, 3, 2]);

  quadWrapper.from(
    new Float32Array([
      -1, -1, 0, 0, 0, 0, 0, 1, -1, 1, 0, 0, 1, 0, 0, 1, 1, -1, 0, 1, 0, 0, 0,
      1, 1, 1, 0, 1, 1, 0, 0, 1,
    ])
  );

  console.log(quadWrapper.at(1).position);
  return {
    vertices: new Float32Array(quadWrapper.buffer),
    indices: quadIndices,
  };
}

function create_quad_buffers() {
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
  const quadIndices = new Uint16Array([0, 1, 3, 0, 3, 2]);

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

  console.log(new Float32Array(quadWrapper.buffer));

  return {
    vertices: new Float32Array(quadWrapper.buffer),
    indices: quadIndices,
  };
}

create_quad_buffers_from();
