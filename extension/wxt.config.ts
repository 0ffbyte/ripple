import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Ripple",
    version: "1.0.0",
    permissions: [
      "storage",
      "bookmarks",
      "history",
      "activeTab",
      "scripting",
      "tabs",
    ],
    commands: {
      "toggle-chat": {
        suggested_key: {
          default: "Alt+Z",
          mac: "Alt+Z",
        },
        description: "Toggle Chat Overlay",
      },
    },
    host_permissions: ["<all_urls>"],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
});
