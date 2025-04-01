# BufferWrap

**BufferWrap** is a TypeScript library for managing a pool of structured data inside an `ArrayBuffer`. It enables high-performance operations on binary memory, making it ideal for graphics engines, physics simulations, GPU compute pipelines, and more.

---

## Features

- Proxy-based access to structs backed by a shared `ArrayBuffer`
- Efficient memory manipulation using `DataView` and `TypedArray.set()`
- Dynamic insertion, slicing, moving, and copying of struct data
- Supports bulk hydration from binary formats or structured buffers
- Minimal allocations and maximum performance

---

## Installation

```bash
npm install buffwrap
```

---

## Getting Started

```ts
import { BufferWrap } from "buffwrap";

const struct = {
  position: 3,
  velocity: 3,
};

const types = {
  position: Float32Array,
  velocity: Float32Array,
};

const buffer = new BufferWrap({ struct, types, capacity: 100 });

const e = buffer.at(0);
e.position = [1.0, 2.0, 3.0];
e.velocity = [0.5, 0.5, 0.0];

console.log(e.position); // [1.0, 2.0, 3.0]
```

---

## API Overview

### Constructor

```ts
new BufferWrap<T>(config: WrapperConfig<T>)
```

### Methods

| Method                     | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `.at(index)`               | Access a struct proxy at given index                      |
| `.getAttributeBuffer(key)` | Get a typed array of a specific attribute                 |
| `.from(buffer)`            | Hydrate from binary buffer or attribute buffers           |
| `.move(from, to)`          | Move struct data from one index to another                |
| `.slice(start, end)`       | Create a new view sharing memory with the original buffer |
| `.insert(index, data)`     | Insert data into buffer, with automatic resizing          |
| `.copyInto(target)`        | Copy data into another buffer or BufferWrap               |
| `.iterate()`               | Iterate all elements in the buffer                        |

### Properties

| Property               | Description                       |
| ---------------------- | --------------------------------- |
| `buffer`               | The underlying ArrayBuffer        |
| `byteLength`           | Total byte size of the buffer     |
| `stride`               | Byte size per struct              |
| `attributeStride(key)` | Byte size of a specific attribute |

---

## Example Use Cases

- Game engine entity/component systems
- Particle system simulation
- WebGPU/WebGL instance buffer management
- SharedArrayBuffer data pooling
- Networked multiplayer data hydration

---

# **BufferWrap Documentation**

Install via npm:

```sh
npm install buffwrap
```

Import into your TypeScript or JavaScript project:

```ts
import { BufferWrap } from "buffwrap";
```

---

## **Class: `BufferWrap<T>`**

### **Constructor**

```ts
constructor(config: WrapperConfig<T>)
```

- Initializes a new `BufferWrap` with a specified structure and type configuration.
- **Parameters**:
  - `config`: Defines the structure, types, and capacity of the buffer.

---

## **Methods**

### **1. `at(idx: number): WrapperStructCompiled<T>`**

```ts
const entity = buffer.at(5);
entity.position = [1.0, 2.0, 3.0];
```

- Returns a **proxy object** representing the struct at a given index.
- Accessing properties reads from the buffer, and setting them writes to the buffer.

---

### **2. `getAttributeBuffer(key: keyof T): ArrayType`**

```ts
const positions = buffer.getAttributeBuffer("position");
```

- Returns a **separate buffer** containing only the specified attribute data.

---

### **3. `from(data: ArrayBuffer | Partial<BufferList<T>>): void`**

```ts
buffer.from(anotherArrayBuffer);
```

- Populates the buffer from an existing `ArrayBuffer` or a structured buffer list.

---

### **4. `move(from: number | WrapperStructCompiled<T>, to: number): void`**

```ts
buffer.move(5, 10);
```

- Moves the struct at index `from` to index `to`, preserving the underlying memory structure.

---

### **5. `slice(start: number, end?: number): BufferWrap<T>`**

```ts
const subBuffer = buffer.slice(10, 20);
```

- Creates a **new `BufferWrap` instance that shares memory** with the original buffer.

---

### **6. `insert(idx: number, data: ArrayBuffer | Partial<BufferList<T>> | BufferWrap<T>): void`**

```ts
buffer.insert(2, { position: [3.0, 4.0, 5.0], velocity: [0.1, 0.2, 0.3] });
```

- Inserts new elements into the buffer, resizing if necessary.

---

### **7. `copyInto(target: ArrayBuffer | Partial<BufferList<T>> | BufferWrap<T>): void`**

```ts
const newBuffer = new ArrayBuffer(buffer.byteLength);
buffer.copyInto(newBuffer);
```

- Copies the data from this `BufferWrap` into another buffer.

---

### **8. `iterate(): Generator<WrapperStructCompiled<T>>`**

```ts
for (const entity of buffer.iterate()) {
  console.log(entity.position);
}
```

- Iterates over all elements in the buffer.

---
