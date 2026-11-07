import { useEffect, useState } from "react";
import "../../assets/tailwind.css";

/* ---------- model status: the background broadcasts STATE on a "status" port ---------- */
type ModelState = { phase: string; progress: number; error: string };

export function useModelStatus() {
  const [state, setState] = useState<ModelState>({
    phase: "idle",
    progress: 0,
    error: "",
  });

  useEffect(() => {
    const port = browser.runtime.connect({ name: "status" });
    port.onMessage.addListener((m) => {
      if (m.type === "STATE") {
        setState({
          phase: m.phase,
          progress: m.progress ?? 0,
          error: m.error ?? "",
        });
      }
    });
    return () => port.disconnect();
  }, []);

  return state;
}

export default function Popup() {
  const { progress, phase } = useModelStatus();
  return (
    <div className="w-60 h-60 bg-blue-500 rounded-md">
      <p>{progress}</p>
    </div>
  );
}
