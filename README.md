# BufferWrap

BufferWrap is a TypeScript library that simplifies working with structured binary data inside `ArrayBuffer`s. It provides a proxy-based interface over raw buffers, making it ideal for GPU-style data pipelines, interleaved memory formats, particle systems, WebGPU/WebGL data, and more.

If you’re a developer building systems where performance and data layout matter, BufferWrap will save you time and eliminate bugs caused by manual memory handling. It offers the power of C-like struct access in JavaScript/TypeScript, with modern tools like generator-based iteration, lazy attribute extraction, and full support for shared memory.

---

## 🧭 What is this for?

BufferWrap is designed for developers who need high-performance, structured memory access in JavaScript or TypeScript. If you're building:

- A game engine with interleaved vertex attributes
- A WebGPU/WebGL pipeline with UBOs or SSBOs
- A physics simulation with spatially organized memory
- A worker-threaded computation model using SharedArrayBuffer
- A custom memory layout system (e.g., ECS, data-oriented design)

...then BufferWrap gives you a fast, memory-efficient, and type-safe abstraction.

It replaces verbose `DataView` and `TypedArray` logic with structured field access while preserving the performance of raw binary access.

---

## 📦 Installation

```bash
npm install buffwrap
```

---

## 🔧 Basic Usage

```ts
import { BufferWrap } from "buffwrap";

const buffer = new BufferWrap({
  capacity: 10,
  struct: {
    a: { type: Uint8Array, length: 1 },
    b: { type: Float32Array, length: 2 },
  },
});

buffer.at(0).a = 1;
buffer.at(0).b = [1.1, 2.2];
```

---

## 👥 Contributors

- Contributions welcome! Open an issue or PR 💡

---

## 🧪 Running Tests & Local Development

To run the BufferWrap test suite and work on the project locally:

### 📥 Clone the Repository

```bash
git clone https://github.com/Jumballaya/buffwrap.git
cd buffwrap
npm install
```

### 🧪 Run the Test Suite

BufferWrap uses **Jest** for testing. The tests are located in the `tests/` directory and are organized by feature.

```bash
npm test
```

To run a specific test file:

```bash
npx jest tests/unit/slice.test.ts
```

Or a specific test name:

```bash
npx jest -t "swapped proxies are still valid"
```

### 💡 Watch Mode (Live Re-running)

During development, you can use watch mode:

```bash
npx jest --watch
```

This will automatically re-run affected tests when files change.

---

### 📦 Building

You need to build the library before the tests will run against your updates. The tests run against the built code in the /dist folder.

```bash
npm run build
```

---

### 📂 Project Structure

```txt
src/
  └─ BuffWrap.ts        # Main class
  └─ index.ts           # Main entry to the library
  └─ types.ts           # Core types used throughout

tests/
  └─ unit/              # Unit tests grouped by feature
  └─ integration/       # Full lifecycle and cross-feature tests

README.md               # This file
package.json            # npm package config
tsconfig.json           # typescript config
jest.config.js          # jest testing config
```

Happy hacking!

---

## 📘 `BufferWrap<T>` API Reference

### Constructor

```ts
new BufferWrap(config: WrapperConfig<T> & Partial<WrapperConfigOffsets<T>>)
```

### `WrapperConfig<T>`

```ts
{
  capacity: number;
  struct: {
    [K in keyof T]: {
      type: TypedArrayConstructor;
      length: number;
    };
  };
  alignment?: number;
  buffer?: ArrayBuffer;
}
```

### `WrapperConfigOffsets<T>`

```ts
{
  offsets: {
    [K in keyof T]: number;
  };
}
```

---

### Public Properties

- `buffer: ArrayBuffer` — the raw buffer
- `stride: number` — total bytes per struct
- `byteLength: number` — total byte length of the buffer

---

### Methods

---

### **`at(idx: number): WrapperStructCompiled<T>`**

```ts
const item = buffer.at(0);
item.id = 7;
```

- Returns a proxy for the struct at logical index `idx`.

**Throws**

- `"at(): Index ${idx} is out of bounds"` — if `idx < 0 || idx >= capacity`

---

### **`move(from: number | WrapperStructCompiled<T>, to: number): void`**

```ts
buffer.move(0, 1);
```

- Moves one struct's data to another position.

**Throws**

- `"move(): Source index not found."` — if `from` proxy cannot be resolved
- `"move(): Indices out of bounds"` — if invalid indices

---

### **`swap(a: number, b: number): void`**

```ts
buffer.swap(1, 2);
```

- Swaps data at `a` and `b`.
- Proxies retain identity and are updated.

**Throws**

- `"swap(): Indices out of bounds"` — if either index is out of bounds

---

### **`slice(start: number, end?: number): BufferWrap<T>`**

```ts
const slice = buffer.slice(0, 2);
```

- Creates a new BufferWrap that shares the same buffer.
- Internally updates `baseOffset`.

---

### **`insert(idx: number, data: ArrayBuffer | BufferList<T> | BufferWrap<T>): void`**

```ts
buffer.insert(1, otherBuffer);
```

- Inserts data into the buffer and shifts existing structs.

**Throws**

- `"insert(): Index is out of bounds"`
- `"insert(): BufferWrap struct mismatch"`
- `"insert(): Invalid type for field ..."`

---

### **`copyInto(target: ArrayBuffer | BufferWrap<T> | BufferList<T>): void`**

```ts
buffer.copyInto(destBuffer);
```

- Copies the entire buffer into another destination.

**Throws**

- `"Target BufferWrap is too small"`
- `"Target ArrayBuffer is too small"`

---

### **`getAttributeBuffer(key: keyof T): ArrayType`**

```ts
const ids = buffer.getAttributeBuffer("id");
```

- Returns a typed array for the specified attribute (e.g., all `id`s)

---

### **`iterate(): Generator<WrapperStructCompiled<T>>`**

```ts
for (const item of buffer.iterate()) {
  console.log(item.id);
}
```

- Iterates over all structs, yielding proxies.

---

## 🧠 How It Works

### 🔁 Proxy System

- `at()` returns a proxy that maps property access to buffer memory.
- Proxies store `currentIndex`, which allows updates when they're remapped (e.g., during `swap()`).
- Proxies are cached using logical index as the key.

---

### 🧩 Slicing

- `slice(start, end)` creates a new `BufferWrap` with:
  - shared buffer
  - updated `baseOffset`
- Slices share the same `proxyCache`, meaning updates are reflected.
- Slices are lightweight views — no memory is copied.

**Pitfall**: If you create a slice, and modify a shared proxy across slices, be mindful of cache state.

---

### 💾 Buffer Types

BufferWrap supports:

| Type                | Supported? | Notes                              |
| ------------------- | ---------- | ---------------------------------- |
| `ArrayBuffer`       | ✅         | Default buffer type                |
| `SharedArrayBuffer` | ✅         | Works as long as layout is shared  |
| `TypedArray.buffer` | ✅         | Internally resolved to ArrayBuffer |

---

## 🧼 `proxyCache` Lifecycle

| Action     | Effect on proxyCache           |
| ---------- | ------------------------------ |
| `at()`     | Creates or reuses proxy        |
| `swap()`   | Updates internal proxy mapping |
| `move()`   | Remaps proxy to new index      |
| `insert()` | Clears all proxies             |
| `from()`   | Clears all proxies             |
| `slice()`  | Shares parent's proxyCache     |

---

## ⚠️ Proxy Safety Rules

| ✅ Do This                         | ❌ Avoid This                             |
| ---------------------------------- | ----------------------------------------- |
| Use `.at()` after `.insert()`      | Holding stale proxies across inserts      |
| Regenerate proxies after `.from()` | Using proxies after slicing without `.at` |
| Use `currentIndex` internally only | Mutating `currentIndex` directly          |

---

## 🧮 Logical vs Byte Offset

- **Logical index**: passed to `.at()`, used in `proxyCache`
- **Byte offset**: `baseOffset + stride * idx`, used for memory math

---

## 🔁 `copyInto` vs `move` vs `swap`

| Method     | Operation       | Proxy Remap | Mutation Scope  |
| ---------- | --------------- | ----------- | --------------- |
| `copyInto` | Deep copy       | ❌          | External target |
| `move`     | Copy & remap    | ✅          | Internal        |
| `swap`     | Exchange values | ✅          | Internal        |

---

## 🔍 Error Reference

| Message                                                             | Method        |
| ------------------------------------------------------------------- | ------------- |
| `"at(): Index ${idx} is out of bounds"`                             | `.at()`       |
| `"move(): Source index not found."`                                 | `.move()`     |
| `"move(): Indices out of bounds"`                                   | `.move()`     |
| `"swap(): Indices out of bounds"`                                   | `.swap()`     |
| `"insert(): Index is out of bounds"`                                | `.insert()`   |
| `"insert(): BufferWrap struct mismatch between source and target."` | `.insert()`   |
| `"insert(): Invalid type for field ..."`                            | `.insert()`   |
| `"Target BufferWrap is too small"`                                  | `.copyInto()` |
| `"Target ArrayBuffer is too small"`                                 | `.copyInto()` |

---

### 💡 Logical Index vs Byte Offset

- **Logical index**: the position used with `.at()` (e.g., 0, 1, 2)
- **Byte offset**: `baseOffset + idx * stride` — memory math for `DataView`
- Proxies use logical index keys internally in the `proxyCache`

---

### 💡 Frequently Asked Questions

---

### Why is `.at()` returning stale data?

Proxies can become stale after structural changes like `.insert()` or `.from()`. These operations clear the proxy cache, so any previously retrieved proxies may no longer reflect the correct buffer location. Always call `.at()` again after modifying the buffer structure.

---

### Why does my proxy stop updating after `insert()`?

The `insert()` method shifts internal memory and clears the `proxyCache`, invalidating all proxies (including those in slices). To maintain correctness, re-access your item with `.at(index)` to get a new proxy.

---

### Why are there no proxies at some index?

Proxies are created lazily — they only exist after you call `.at(index)`. If you're checking the internal `proxyCache`, don't be surprised if some entries are missing until accessed.

---

### Can I use `.from()` with a `SharedArrayBuffer`?

Yes, as long as the layout (stride, offsets, alignment) is compatible. Make sure the buffer has sufficient capacity, and remember that `SharedArrayBuffer` has some security restrictions in browsers (e.g., requires COOP/COEP headers).

---

### Can slices see changes in the original buffer?

Yes. Slices are views over the same memory (`ArrayBuffer` or `SharedArrayBuffer`) and share the same internal `proxyCache`. Mutating one affects the other.

---

### What happens if I `.slice()` and then `.insert()`?

Inserting data will shift memory and **clear the proxy cache**. Any proxy, even those accessed from a slice, may become stale. Use `.at()` again to get a fresh and valid proxy.

---

### How are vector types (like `Float32Array[3]`) supported?

Define the field in your struct like this:

```ts
b: { type: Float32Array, length: 3 }
```

BufferWrap will map it to a `float3`-style field. You can read/write arrays directly:

```ts
buffer.at(0).b = [1, 2, 3];
```

---

### When is the `proxyCache` cleared or reused?

| Operation   | Effect on `proxyCache`                |
| ----------- | ------------------------------------- |
| `.from()`   | Cleared (proxies stale)               |
| `.insert()` | Cleared (proxies stale)               |
| `.move()`   | Reused and remapped (proxies updated) |
| `.swap()`   | Reused and remapped (proxies updated) |
| `.slice()`  | Shares the same proxy cache           |

Use `.at()` to regenerate proxies safely after cache invalidation.

---

### What’s the benefit of using proxies?

Proxies let you interact with binary data using natural, object-like syntax. Instead of managing offsets manually via `DataView`, you can write:

```ts
buffer.at(3).a = 42;
buffer.at(3).b = [1.0, 2.0];
```

This allows high performance without sacrificing developer ergonomics. It also makes slices, iteration, and copying logic much simpler to write and reason about.

---

## 📄 License

MIT License — free to use, modify, and distribute.
