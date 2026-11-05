import server from "@/lib/server/_index";

export default defineBackground({
  type: "module",
  main() {
    server();
  },
});
