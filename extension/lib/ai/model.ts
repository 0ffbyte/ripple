import { transformersJS } from "@browser-ai/transformers-js";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";

const BASE_MODEL = "onnx-community/gemma-4-E2B-it-ONNX";

export type State = {
  phase: "idle" | "loading" | "ready" | "error";
  progress: number;
  error?: string;
};

const baseModel = transformersJS(BASE_MODEL, {
  device: "webgpu",
  dtype: "q4f16",
});

export const model = wrapLanguageModel({
  model: baseModel,
  middleware: extractReasoningMiddleware({
    tagName: { opening: "<think>thought\n", closing: "</think>" },
  }),
});

let state: State = { phase: "idle", progress: 0 };
const listeners = new Set<(s: State) => void>();

export const getState = () => state;

export function subscribe(fn: (s: State) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setState(s: State) {
  state = s;
  listeners.forEach((fn) => fn(s));
}

let loading: Promise<void> | null = null;
let lastPct = -1;

export function load() {
  loading ??= (async () => {
    if ((await baseModel.availability()) === "unavailable") {
      throw new Error("This browser does not support WebGPU inference.");
    }
    setState({ phase: "loading", progress: 0 });
    await baseModel.createSessionWithProgress((p: any) => {
      const pct = Math.round(
        (typeof p === "number" ? p : (p?.progress ?? 0)) * 100,
      );
      if (pct !== lastPct) {
        lastPct = pct;
        setState({ phase: "loading", progress: pct });
      }
    });
    setState({ phase: "ready", progress: 100 });
  })().catch((e) => {
    loading = null;
    setState({ phase: "error", progress: 0, error: e?.message ?? String(e) });
    throw e;
  });
  return loading;
}

export const warmUp = () => void load().catch(() => {});
