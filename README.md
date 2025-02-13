# BuffWrap

TODO:

1. Fix typing issues
2. Add option for interleved vs split (the 'layout' option)
3. Add the ability to interleve the data or split it
   This would generate one or the other and toggle the 'layout'
4. Add an index buffer and `atIndexed(idx: number)` to get the item at an index
5. Read in a binary
6. Saving a binary
7. Non-fixed-length arrays
8. Nested structs
9. Array of structs
10. DSL to generate a binary file parser
11. Decorator based binary -> classes
    The struct becomes a heirarchy of class constructors

## Examples

### Basic

```ts
type VertexStruct = {
  position: [number, number, number];
  texCoord: [number, number];
  normal: [number, number, number];
};

const quadWrapper = new BufferWrap<VertexStruct>({
  type: Float32Array,
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
