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

- [@pburris](https://github.com/pburris)
- Contributions welcome! Open an issue or PR 💡

---

## 📘 API: `BufferWrap<T>` Class

### **`constructor(config: WrapperConfig<T> & Partial<WrapperConfigOffsets<T>>)`**

Creates a new instance of `BufferWrap` with the given struct and capacity.

- Automatically computes layout and alignment.
- Accepts an optional shared `ArrayBuffer`.

---

### **`at(idx: number): WrapperStructCompiled<T>`**

```ts
const item = buffer.at(3);
item.a = 5;
```

- Returns a proxy object for reading/writing values at a given logical index.
- Proxies are cached internally and reused.
- Tracked using `currentIndex` to ensure slice/index safety.

**Throws:**

- `at(): Index ${idx} is out of bounds` – When index is invalid.

---

### **`move(from: number | WrapperStructCompiled<T>, to: number): void`**

```ts
buffer.move(5, 10);
```

- Moves the struct at index `from` to `to`, preserving the underlying memory structure.
- If a proxy is passed as `from`, it resolves the logical index using `currentIndex`.
- Updates the proxy cache so the moved proxy stays valid.
- Does nothing if `from === to`.

**Throws:**

- `move(): Indices out of bounds` – If either index is invalid.

---

### **`swap(a: number, b: number): void`**

```ts
buffer.swap(1, 2);
```

- Swaps the binary data at two indices.
- Updates proxy cache so that proxies retain identity.
- `proxy.currentIndex` is updated internally.

**Throws:**

- `swap(): Indices out of bounds` – If either index is invalid.

---

### **`slice(start: number, end?: number): BufferWrap<T>`**

```ts
const sub = buffer.slice(2, 5);
```

- Returns a new `BufferWrap` sharing the same underlying memory.
- Maintains `baseOffset` to ensure correct offset math.
- Shares proxy cache, so changes reflect across views.

**Note:** Deep nesting is supported, but be cautious of overlapping access and lifetimes.

---

### **`insert(idx: number, data: ArrayBuffer | BufferList<T> | BufferWrap<T>): void`**

```ts
buffer.insert(1, otherBuffer);
```

- Inserts one or more structs into the buffer.
- Works with:
  - raw `ArrayBuffer`
  - struct-like `{ a: Uint8Array, b: Float32Array }`
  - another compatible `BufferWrap`
- Shifts existing data to make space.

**Throws:**

- `insert(): Index out of bounds`
- `insert(): BufferWrap struct mismatch between source and target`
- `insert(): Invalid type for field ...`

---

### **`copyInto(target: ArrayBuffer | BufferWrap<T> | BufferList<T>): void`**

```ts
buffer.copyInto(targetBuffer);
```

- Copies data into another structure.
- For `BufferWrap`, ensures compatibility before copying.
- Can also copy to raw `ArrayBuffer` or an object of typed arrays.

---

### **`getAttributeBuffer(key: keyof T): ArrayType`**

```ts
const positions = buffer.getAttributeBuffer("b");
```

- Returns a typed array of a specific attribute.
- Useful for uploading interleaved data to a GPU buffer.
- Lazily computed and cached per attribute.

---

### **`iterate(): Generator<WrapperStructCompiled<T>>`**

```ts
for (const item of buffer.iterate()) {
  console.log(item.a);
}
```

- Yields proxies for each struct in the buffer.
- Fully respects slicing and `baseOffset`.

---

### **Public Properties**

- `buffer: ArrayBuffer` – The raw binary data.
- `stride: number` – Total bytes per struct.
- `byteLength: number` – Size of the underlying buffer.

---

## 🧠 How It Works

### 🔁 Proxy System

- `at(idx)` returns a `Proxy` with traps for `get`/`set` to read/write buffer fields.
- A `currentIndex` is embedded into each proxy to allow updates when moved/swapped.
- Proxies are reused via `proxyCache`.

---

### 🧩 Slices

- `.slice(start, end)` returns a new BufferWrap sharing the same memory.
- It maintains `baseOffset` so all reads/writes map correctly.
- Deep slices are supported and safe.

**Pitfall:** Modifying overlapping slices can create logical confusion if proxy cache is not revalidated with `.at()`.

---

### 🧼 Proxy Cache Lifecycle

| Event       | Behavior                  |
| ----------- | ------------------------- |
| `.at(idx)`  | Creates or reuses a proxy |
| `.move()`   | Updates proxy mapping     |
| `.swap()`   | Updates both proxies      |
| `.insert()` | Clears all proxies        |
| `.from()`   | Clears all proxies        |
| `.slice()`  | Shares parent cache       |

---

### ⚠️ ProxyCache Safety Rules

| Rule                                                     |
| -------------------------------------------------------- |
| Always access data via `.at(idx)`                        |
| Never reuse proxies across `.insert()` or `.from()`      |
| After `.move()` or `.swap()`, proxies are updated safely |
| Shared slices use the same cache — changes are reflected |
| Never mutate `proxy.currentIndex` manually               |

---

### 🔄 Buffer Sharing

- Works with `ArrayBuffer`, `SharedArrayBuffer`, or any `TypedArray.buffer`
- All `BufferWrap`s must use the same layout (`stride`, `offsets`)
- Shared buffer means shared memory — changes are visible to all slices and instances

---

### 📊 Comparison: `copyInto` vs `move` vs `swap`

| Method     | Copies? | Overwrites? | Proxy Update? | Use case                       |
| ---------- | ------- | ----------- | ------------- | ------------------------------ |
| `copyInto` | ✅      | ✅          | ❌            | Export data to external target |
| `move`     | ✅      | ✅          | ✅            | Relocate a struct's data       |
| `swap`     | 🔁      | 🔁          | ✅            | Exchange positions             |

---

### 💡 Logical Index vs Byte Offset

- **Logical index**: the position used with `.at()` (e.g., 0, 1, 2)
- **Byte offset**: `baseOffset + idx * stride` — memory math for `DataView`
- Proxies use logical index keys internally in the `proxyCache`

---

## ❓ Q&A

### Why is `.at()` returning stale data?

You may be reusing a proxy that was invalidated by `.insert()` or `.from()`. Always call `.at()` again after structural changes.

---

### Can I use `.from()` with a `SharedArrayBuffer`?

Yes – just ensure the layout and offsets are identical. The buffer must have enough capacity.

---

### What happens if I `.slice()` and then `.insert()`?

`.insert()` will shift data and clear the proxy cache — so any old proxies (even in slices) may go stale. Call `.at()` again to ensure consistency.

---

### When is `proxyCache` cleared?

- After `.from()` or `.insert()`
- Not after `.move()` or `.swap()` (proxies are remapped)
- Slices share cache, so changes propagate

---

### Why use proxies at all?

Proxies let you write structured values (`obj.a = 5`, `obj.b = [1, 2]`) directly into raw binary buffers, without managing `DataView` offsets yourself. They provide zero-cost abstraction over binary memory.

---

## 📄 License

MIT License — free to use, modify, and distribute.
