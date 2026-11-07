let audioContext: AudioContext | null = null;

const getContext = () => {
  audioContext ??= new AudioContext();
  return audioContext;
};

// Unlock audio on first real interaction (call once, e.g. in your root component)
export const unlockAudio = () => {
  const unlock = () => {
    void getContext().resume();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
};

export const playTraceCue = async (cue: "start" | "end", volume = 0.44) => {
  try {
    const context = getContext();
    if (context.state !== "running") await context.resume();
    if (context.state !== "running") {
      console.warn("Audio blocked, state:", context.state);
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = cue === "start" ? 0.1 : 0.44;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(cue === "start" ? 300 : 300, now);

    if (cue === "end") {
      oscillator.frequency.linearRampToValueAtTime(660, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch (e) {
    console.warn("Trace cue failed", e);
  }
};
