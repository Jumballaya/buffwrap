import { BufferWrap } from "./BuffWrap";

type VertexStruct = {
  position: [number, number, number];
  texCoord: [number, number];
  normal: [number, number, number];
};

const quadWrapper = new BufferWrap<VertexStruct>({
  types: {
    position: Float32Array,
    texCoord: Float32Array,
    normal: Float32Array,
  },
  capacity: 4,
  interleve: false,
  struct: {
    position: 3,
    texCoord: 2,
    normal: 3,
  },
});

quadWrapper.at(0).position = [-1, -1, 0];
quadWrapper.at(1).position = [1, -1, 0];
quadWrapper.at(2).position = [1, 1, 0];
quadWrapper.at(3).position = [-1, 1, 0];

quadWrapper.at(0).texCoord = [0, 0];
quadWrapper.at(1).texCoord = [1, 0];
quadWrapper.at(2).texCoord = [1, 1];
quadWrapper.at(3).texCoord = [0, 1];

quadWrapper.at(0).normal = [0, 0, 1];
quadWrapper.at(1).normal = [0, 0, 1];
quadWrapper.at(2).normal = [0, 0, 1];
quadWrapper.at(3).normal = [0, 0, 1];

console.log(quadWrapper.buffers);
