// Tailwind config for the single-file export: same theme, scoped to the
// Cortex components the standalone entry actually renders.
import base from "../tailwind.config";

export default {
  ...base,
  content: ["./src/components/cortex/**/*.tsx", "./src/standalone/**/*.tsx", "./src/data/**/*.ts"],
};
