import { ProxyManager } from "../../src/ProxyManager";

type TestProxyShape = {
  a: number;
  b: number[];
};

describe("ProxyManager", () => {
  let access: {
    get: jest.Mock;
    set: jest.Mock;
    getBuffer: jest.Mock;
    destroy: jest.Mock;
    getByteLength: jest.Mock;
    getStride: jest.Mock;
    ensureCapacity: jest.Mock;
    move: jest.Mock;
    swap: jest.Mock;
    insertBlank: jest.Mock;
    from: jest.Mock;
    clone: jest.Mock;
  };
  let manager: ProxyManager<TestProxyShape, ArrayBuffer>;

  beforeEach(() => {
    access = {
      get: jest.fn((key, idx) => `${key}-${idx}`),
      set: jest.fn((key, value, idx) => {}),
      getBuffer: jest.fn(() => new ArrayBuffer()),
      destroy: jest.fn(() => {}),
      getByteLength: jest.fn(() => 0),
      getStride: jest.fn(() => 0),
      ensureCapacity: jest.fn(() => {}),
      move: jest.fn(() => {}),
      swap: jest.fn(() => {}),
      insertBlank: jest.fn(() => {}),
      from: jest.fn(() => {}),
      clone: jest.fn(() => {}),
    };
    manager = new ProxyManager<TestProxyShape, ArrayBuffer>(access);
  });

  describe("getProxy", () => {
    it("returns a proxy for an index", () => {
      const proxy = manager.getProxy(1);
      expect(proxy.a).toBe("a-1");
      expect(proxy.b).toBe("b-1");
    });

    it("reuses the same proxy for same index", () => {
      const proxy1 = manager.getProxy(2);
      const proxy2 = manager.getProxy(2);
      expect(proxy1).toBe(proxy2);
    });
  });

  describe("move", () => {
    it("moves a proxy to a new index", () => {
      const proxy = manager.getProxy(3);
      manager.move(3, 7);
      expect(proxy.currentIndex).toBe(7);
      expect(manager.getProxy(7)).toBe(proxy);
    });

    it("does nothing if from === to", () => {
      const proxy = manager.getProxy(4);
      manager.move(4, 4);
      expect(proxy.currentIndex).toBe(4);
    });
  });

  describe("swap", () => {
    it("swaps proxies at two indices", () => {
      const a = manager.getProxy(1);
      const b = manager.getProxy(2);
      manager.swap(1, 2);
      expect(a.currentIndex).toBe(2);
      expect(b.currentIndex).toBe(1);
    });

    it("does nothing if indices are equal", () => {
      const a = manager.getProxy(5);
      manager.swap(5, 5);
      expect(a.currentIndex).toBe(5);
    });
  });

  describe("insert", () => {
    it("shifts proxies forward after insertion", () => {
      const p1 = manager.getProxy(2);
      const p2 = manager.getProxy(3);
      manager.insert(2, 1);
      expect(p1.currentIndex).toBe(3);
      expect(p2.currentIndex).toBe(4);
    });

    it("does not touch proxies before insertion point", () => {
      const p1 = manager.getProxy(0);
      const p2 = manager.getProxy(1);
      manager.insert(1, 2);
      expect(p1.currentIndex).toBe(0);
      expect(p2.currentIndex).toBe(3);
    });
  });

  describe("copy", () => {
    it("copies a single field between indices", () => {
      manager.copy(2, 5, ["a"]);
      expect(access.get).toHaveBeenCalledWith("a", 2);
      expect(access.set).toHaveBeenCalledWith("a", "a-2", 5);
    });

    it("copies multiple fields between indices", () => {
      manager.copy(1, 4, ["a", "b"]);
      expect(access.get).toHaveBeenCalledWith("a", 1);
      expect(access.get).toHaveBeenCalledWith("b", 1);
      expect(access.set).toHaveBeenCalledWith("a", "a-1", 4);
      expect(access.set).toHaveBeenCalledWith("b", "b-1", 4);
    });

    it("does nothing if from === to", () => {
      manager.copy(3, 3, ["a", "b"]);
      expect(access.get).not.toHaveBeenCalled();
      expect(access.set).not.toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("clears all cached proxies", () => {
      manager.getProxy(1);
      manager.getProxy(2);
      manager.clear();
      expect(manager["cache"].size).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("allows inserting 0 proxies", () => {
      manager.getProxy(3);
      manager.insert(3, 0);
      expect(manager.getProxy(3).currentIndex).toBe(3);
    });

    it("can copy to the same index", () => {
      manager.getProxy(8);
      manager.copy(8, 8, ["a", "b"]);
      expect(access.get).not.toHaveBeenCalled();
      expect(access.set).not.toHaveBeenCalled();
    });
  });
});
