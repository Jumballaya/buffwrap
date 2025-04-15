[![View Docs](https://img.shields.io/badge/docs-view%20docs-blue)](https://jumballaya.github.io/buffwrap/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![npm version](https://img.shields.io/npm/v/buffwrap)](https://www.npmjs.com/package/buffwrap)

# BufferWrap

BufferWrap is a TypeScript library that simplifies working with structured binary data inside ArrayBuffers. It provides a proxy-based interface over raw buffers, making it ideal for GPU-style data pipelines, interleaved memory formats, particle systems, WebGPU/WebGL data, and more.

If you’re a developer building systems where performance and data layout matter, BufferWrap will save you time and eliminate bugs caused by manual memory handling. It offers the power of C-like struct access in JavaScript/TypeScript, with modern tools like generator-based iteration, lazy attribute extraction, and full support for shared memory.

---

## Links

- 📦 [View on npm](https://www.npmjs.com/package/buffwrap)
- 📘 [View Docs](https://jumballaya.github.io/buffwrap/)

---

## What is this for?

BufferWrap is for developers building high-performance, real-time systems that work directly with memory:

- 🧱 Game engines & ECS architectures
- 🎮 WebGL / WebGPU pipelines (UBOs, SSBOs, attributes)
- 📊 Data visualization and simulation dashboards
- 🎧 Audio graph memory modeling
- 🤖 AI memory and behavior buffers
- 🧵 WASM/shared memory/threaded applications

It provides a `BufferWrap<T>` interface for struct access and mutation, powered by a Proxy layer that maps logical indices to memory regions — fully type-safe and strategy-driven.

---

## Installation

```bash
npm install bufferwrap
```

---

## Basic Usage (ArrayBufferStrategy) - Browser Safe

```ts
import { BufferWrap } from "bufferwrap";
import { ArrayBufferStrategy } from "bufferwrap";

const wrap = new BufferWrap<{ id: number; pos: [number, number] }, ArrayBuffer>({
  struct: {
    id: { type: Uint8Array, length: 1 },
    pos: { type: Float32Array, length: 2 },
  },
  capacity: 100,
  strategy: ArrayBufferStrategy,
});

wrap.at(0).id = 123;
wrap.at(0).pos = [1.1, 2.2];
```

---

## Basic Usage (NodeBufferStrategy) - Node.js only

```ts
import { BufferWrap } from "bufferwrap";
import { NodeBufferStrategy } from "bufferwrap/node";

const wrap = new BufferWrap<{ id: number; pos: [number, number] }, Buffer>({
  struct: {
    id: { type: Uint8Array, length: 1 },
    pos: { type: Float32Array, length: 2 },
  },
  capacity: 100,
  strategy: NodeBufferStrategy,
});

wrap.at(0).id = 123;
wrap.at(0).pos = [1.1, 2.2];
```

---

## Running Tests & Local Development

Clone the repo and run:

```bash
npm install
npm test
```

To build and watch:

```bash
npm run build
npm run dev
```

Project Structure:

- `src/` – Core types, BufferWrap class, strategies, helpers
- `tests/` – Unit, integration, and strategy-specific tests
- `index.ts` / `index.node.ts` / `index.browser.ts` – platform-specific entrypoints

---

## How It Works

BufferWrap manages structured binary memory via 3 coordinated layers:

### Strategy Layer

Owns the actual memory and read/write logic (`ArrayBuffer`, `Node.js Buffer`, etc.)

### ProxyManager

Manages the proxy cache, handles logical-to-physical mapping, updates proxies after inserts, moves, and slices.

### BufferWrap<T>

Combines layout config, slicing logic, indexing API, and memory mutation helpers.

---

### Proxy Lifecycle & Safety

| Operation     | Are Proxies Reused?     | Are Proxies Invalidated? |
| ------------- | ----------------------- | ------------------------ |
| `.at(index)`  | ✅ Yes                  | ❌ No                    |
| `.slice()`    | ✅ Yes (shared manager) | ❌ No                    |
| `.insert()`   | ✅ Remapped             | ❌ No                    |
| `.move()`     | ✅ Remapped             | ❌ No                    |
| `.copyInto()` | ✅ Reused if compatible | ❌ No                    |
| `.from()`     | ❌ Cleared (fresh)      | ✅ Yes                   |

---

## Logical vs Physical Index

- **Logical Index** → The _abstract_ index inside your `BufferWrap<T>` (e.g. `wrap.at(5)`)
- **Physical Offset** → The actual byte position in memory

BufferWrap lets you work only with logical indices. Strategies handle stride math and offset calculations internally.

---

## Error Reference

| Error Message                                        | Method      |
| ---------------------------------------------------- | ----------- |
| `insert(): Index X is out of bounds`                 | `.insert()` |
| `set(): Cannot set undefined for key`                | `.set()`    |
| `set(): Field "X" expects array of length N, got M`  | `.set()`    |
| `set(): Field "X" must be a JS array or TypeArray`   | `.set()`    |
| `insert(): incompatible BufferWrap struct or stride` | `.insert()` |
| `move(): Indices out of bounds`                      | `.move()`   |
| `at(): Index X is out of bounds`                     | `.at()`     |
| `get(): Unknown field key: "X"`                      | `.get()`    |

---

## License

MIT © 2025 Patrick Burris
