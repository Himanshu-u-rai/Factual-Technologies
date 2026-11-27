import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const Module = require("node:module");

const originalResolveFilename = Module._resolveFilename;
const testSrcRoot = path.resolve(process.cwd(), ".tmp-test", "src");
const serverOnlyEmptyPath = path.resolve(process.cwd(), "node_modules", "server-only", "empty.js");

Module._resolveFilename = function resolveWithAtAlias(request, parent, isMain, options) {
  if (request === "server-only") {
    return serverOnlyEmptyPath;
  }
  if (request.startsWith("@/")) {
    const mapped = path.join(testSrcRoot, request.slice(2));
    return originalResolveFilename.call(this, mapped, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
