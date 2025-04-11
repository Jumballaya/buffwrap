import {
  ManagedProxy,
  ProxyAccessStrategy,
  ProxyContext,
  ProxyHandlerShape,
  ProxyShape,
} from "./types";

export class ProxyManager<T extends ProxyShape> {
  private cache = new Map<number, ManagedProxy<T>>();
  private access: ProxyAccessStrategy<T>;

  constructor(access: ProxyAccessStrategy<T>) {
    this.access = access;
  }

  public getProxy(logicalIndex: number): ManagedProxy<T> {
    const found = this.cache.get(logicalIndex);
    if (found) {
      return found;
    }
    const ctx: ProxyContext = {
      currentIndex: logicalIndex,
    };
    const handler: ProxyHandler<ProxyHandlerShape<T>> = {
      get: (_, key: string) => {
        if (key === "currentIndex") return ctx.currentIndex;
        return this.access.get(key as keyof T, ctx.currentIndex);
      },
      set: (_, key: string, value: any) => {
        if (key === "currentIndex") {
          ctx.currentIndex = value;
          return true;
        }
        this.access.set(key as keyof T, ctx.currentIndex as T[keyof T], value);
        return true;
      },
    };
    const proxy = new Proxy(ctx, handler) as ManagedProxy<T>;
    this.cache.set(logicalIndex, proxy);
    return proxy;
  }

  public move(from: number, to: number): void {
    const proxy = this.getProxy(from);
    proxy.currentIndex = to;
    this.cache.delete(from);
    this.cache.set(to, proxy);
  }

  public swap(a: number, b: number): void {
    if (a === b) return;

    const aProxy = this.getProxy(a);
    const bProxy = this.getProxy(b);

    aProxy.currentIndex = b;
    bProxy.currentIndex = a;

    this.cache.set(b, aProxy);
    this.cache.set(a, bProxy);
  }

  // inserts blank proxies, shifting existing proxies to the end
  //              Insert 2 into index 5
  //                 |
  //                \/
  //    [ _, _, p, p, p, _, p, _, p, p, _, ... ]
  //
  //                |     shifted
  //               \/    ---->
  //    [ _, _, p, _, _, p, p, _, p, _, p, ... ]
  //               \ /
  //            inserted
  //
  public insert(at: number, count: number): void {
    const indices = Array.from(this.cache.keys())
      .filter((index) => index >= at)
      .sort((a, b) => b - a);

    for (const index of indices) {
      const proxy = this.cache.get(index)!;
      proxy.currentIndex = index + count;
      this.cache.delete(index);
      this.cache.set(index + count, proxy);
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  public remap(from: number, to: number): void {
    const proxy = this.getProxy(from);
    proxy.currentIndex = to;
    this.cache.delete(from);
    this.cache.set(to, proxy);
  }

  public copy(from: number, to: number, keys: (keyof T)[]): void {
    if (from === to) return;

    for (const key of keys) {
      const val = this.access.get(key, from);
      this.access.set(key, val, to);
    }
  }

  public *proxies(): Generator<[number, ManagedProxy<T>]> {
    for (const entry of this.cache.entries()) {
      yield entry;
    }
  }
}
