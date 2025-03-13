# BuffWrap

BufferWrap makes it easy to deal with a buffer of structured data. This could be particles in a particle system, messages passed from web workers, information from a WebGPU compute pipeline, lighting data in a uniform buffer, etc. etc.

# TODO
1. Add the id to the proxied struct
2. Add the ability to move data from one index to another, preserving the already existing links. (BufferWrap.move(idxA, idxB) or BufferWrap.move(proxy, toIdx))
3. Add more examples and patterns (like a BufferWrap manager that sits over a BufferWrap instance)
4. Add a `byteLength() => number`, `.stride() => number` and `.attributeStride(attr: string) => number` methods
5. Add a function that returns a generator that iterates through the items so it can be used with `for (x in buffer.iterate()) { ... }` or something

## Examples

### Basic

#### Generate Vertex Data

```ts
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
```

#### Manage particles in a particle system

```ts
type VertexStruct = {
  position: [number, number, number];
  texCoord: [number, number];
  normal: [number, number, number];
};

const particleWrapper = new BufferWrap<VertexStruct>({
  types: {
    position: Float32Array,
    rotation: Float32Array,
    color: Float32Array,
    maxLife: Float32Array,
    curLife: Float32Array,
  },
  capacity: 1000,
  struct: {
    position: 3,
    rotation: 4,
    color: 4,
    maxLife: 1,
    curLife: 1,
  },
});

for (let i = 0; i < 1000; i++) {
  particleWrapper.at(i).position = [
    Math.random(),
    Math.random(),
    Math.random(),
    1,
  ];
  // ... etc
}
```
