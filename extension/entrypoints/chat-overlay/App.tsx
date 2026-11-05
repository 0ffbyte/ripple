import RippleEffect from "../../components/ripple-effect";
import ChatOverlayShell from "../../components/chat-overlay-shell";

// Main
export default function ChatOverlay({
  screenshot,
}: {
  screenshot: ImageBitmap | null;
}) {
  return (
    <div className="fixed inset-0 z-99 w-screen h-screen flex items-end justify-center pb-8 font-sans text-zinc-50 pointer-events-none">
      <RippleEffect image={screenshot} />
      <ChatOverlayShell />
    </div>
  );
}
