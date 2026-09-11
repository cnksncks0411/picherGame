import init, { WieWeb, extractAppMetadata } from "@pkg";

export type { ImportedAppMetadata } from "@pkg";
export { WieWeb, extractAppMetadata };

let ready: Promise<void> | undefined;

/**
 * wasm-pack --target web needs an explicit init before any export is callable.
 * Every entry point awaits this, so the first one pays the cost and the rest
 * share the same promise.
 */
export const initWasm = (): Promise<void> => {
  if (!ready) {
    ready = init().then(() => undefined);
  }
  return ready;
};
