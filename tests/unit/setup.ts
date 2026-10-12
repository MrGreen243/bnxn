import "fake-indexeddb/auto";

if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (v: unknown) => JSON.parse(JSON.stringify(v));
}
