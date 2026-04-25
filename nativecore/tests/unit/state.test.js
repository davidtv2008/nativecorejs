import { describe, expect, it, vi } from "vitest";
import { batch, computed, effect, useState } from "../../.nativecore/core/state.js";
describe("useState", () => {
  it("holds an initial value", () => {
    const count = useState(0);
    expect(count.value).toBe(0);
  });
  it("updates when .value is assigned", () => {
    const name = useState("Alice");
    name.value = "Bob";
    expect(name.value).toBe("Bob");
  });
  it("supports updater function via .set()", () => {
    const count = useState(10);
    count.set((n) => n + 5);
    expect(count.value).toBe(15);
  });
  it("notifies watchers on change", () => {
    const flag = useState(false);
    const spy = vi.fn();
    const stop = flag.watch(spy);
    flag.value = true;
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(true);
    stop();
    flag.value = false;
    expect(spy).toHaveBeenCalledOnce();
  });
  it("does not notify when value is unchanged", () => {
    const val = useState(42);
    const spy = vi.fn();
    val.watch(spy);
    val.value = 42;
    expect(spy).not.toHaveBeenCalled();
  });
});
describe("computed", () => {
  it("derives a value from useState", () => {
    const count = useState(4);
    const doubled = computed(() => count.value * 2);
    expect(doubled.value).toBe(8);
    count.value = 5;
    expect(doubled.value).toBe(10);
    doubled.dispose();
  });
  it("tracks multiple dependencies", () => {
    const first = useState("Ada");
    const last = useState("Lovelace");
    const full = computed(() => `${first.value} ${last.value}`);
    expect(full.value).toBe("Ada Lovelace");
    first.value = "Grace";
    expect(full.value).toBe("Grace Lovelace");
    full.dispose();
  });
  it("is read-only \u2014 setting value warns without changing it", () => {
    const src = useState(1);
    const c = computed(() => src.value + 1);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
    });
    c.value = 999;
    expect(c.value).toBe(2);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    c.dispose();
  });
  it("does not recompute after dispose()", () => {
    const src = useState(0);
    let calls = 0;
    const c = computed(() => {
      calls++;
      return src.value;
    });
    const initialCalls = calls;
    c.dispose();
    src.value = 99;
    expect(calls).toBe(initialCalls);
  });
});
describe("effect", () => {
  it("runs immediately on creation", () => {
    const count = useState(0);
    const spy = vi.fn();
    const stop = effect(() => {
      spy(count.value);
    });
    expect(spy).toHaveBeenCalledWith(0);
    stop();
  });
  it("re-runs when a dependency changes", () => {
    const count = useState(0);
    const values = [];
    const stop = effect(() => {
      values.push(count.value);
    });
    count.value = 1;
    count.value = 2;
    stop();
    expect(values).toEqual([0, 1, 2]);
  });
  it("runs the returned cleanup before each re-run", () => {
    const toggle = useState(true);
    const cleanups = [];
    const stop = effect(() => {
      void toggle.value;
      return () => cleanups.push("cleaned");
    });
    toggle.value = false;
    stop();
    expect(cleanups).toEqual(["cleaned", "cleaned"]);
  });
  it("stops reacting after dispose", () => {
    const src = useState(0);
    const spy = vi.fn();
    const stop = effect(() => {
      spy(src.value);
    });
    stop();
    src.value = 99;
    expect(spy).toHaveBeenCalledOnce();
  });
});
describe("batch", () => {
  it("defers notifications until the batch completes", () => {
    const a = useState(0);
    const b = useState(0);
    const notifications = [];
    a.watch(() => notifications.push("a"));
    b.watch(() => notifications.push("b"));
    batch(() => {
      a.value = 1;
      b.value = 2;
      expect(notifications).toHaveLength(0);
    });
    expect(notifications).toEqual(["a", "b"]);
  });
  it("fires each subscriber at most once per batch regardless of write count", () => {
    const count = useState(0);
    const spy = vi.fn();
    count.watch(spy);
    batch(() => {
      count.value = 1;
      count.value = 2;
      count.value = 3;
    });
    expect(spy).toHaveBeenCalledOnce();
    expect(count.value).toBe(3);
  });
  it("handles nested batch calls \u2014 flushes only at the outermost exit", () => {
    const x = useState(0);
    const spy = vi.fn();
    x.watch(spy);
    batch(() => {
      x.value = 1;
      batch(() => {
        x.value = 2;
        expect(spy).not.toHaveBeenCalled();
      });
      expect(spy).not.toHaveBeenCalled();
      x.value = 3;
    });
    expect(spy).toHaveBeenCalledOnce();
    expect(x.value).toBe(3);
  });
  it("flushes even when the batch function throws", () => {
    const count = useState(0);
    const spy = vi.fn();
    count.watch(spy);
    try {
      batch(() => {
        count.value = 5;
        throw new Error("oops");
      });
    } catch {
    }
    expect(spy).toHaveBeenCalledOnce();
    expect(count.value).toBe(5);
  });
});
