import { runParityCheck } from "./run.js";

const result = await runParityCheck();
console.log(result.lines.join("\n"));
process.exit(result.ok ? 0 : 1);
