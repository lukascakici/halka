import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  // Mirror the tsconfig `paths` so tests can import the generated bindings.
  resolve: {
    alias: {
      "@circle-client": resolve("./packages/circle-client/src/index.ts"),
      "@factory-client": resolve("./packages/factory-client/src/index.ts"),
      "@reputation-client": resolve("./packages/reputation-client/src/index.ts"),
    },
  },
});
