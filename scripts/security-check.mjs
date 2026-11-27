import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

const failures = [];
const warnings = [];

function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

const sourceFiles = walkFiles(SRC_DIR).filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f));

// 1. Scan src/ for dangerous execution / injection / hardcoded secret patterns
const forbiddenPatterns = [
  { name: "eval()", regex: /\beval\s*\(/ },
  { name: "new Function()", regex: /\bnew\s+Function\s*\(/ },
  { name: "child_process import", regex: /from\s+["'](?:node:)?child_process["']/ },
  { name: "direct innerHTML assignment", regex: /\.innerHTML\s*=/ },
  { name: "direct outerHTML assignment", regex: /\.outerHTML\s*=/ },
  { name: "document.write()", regex: /\bdocument\.write\s*\(/ },
  { name: "hardcoded private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

for (const file of sourceFiles) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, "utf8");

  for (const rule of forbiddenPatterns) {
    if (rule.regex.test(content)) {
      failures.push(`[SAST] ${rel}: matched forbidden pattern "${rule.name}"`);
    }
  }

  if (content.includes("dangerouslySetInnerHTML") && rel !== "src/components/seo/JsonLd.tsx") {
    failures.push(`[SAST] ${rel}: unexpected dangerouslySetInnerHTML outside JsonLd.tsx`);
  }
}

// 2. Verify every /api/admin/**/route.ts enforces requireAdmin()
const adminApiDir = path.join(SRC_DIR, "app", "api", "admin");
const adminRoutes = walkFiles(adminApiDir).filter((f) => path.basename(f) === "route.ts");
for (const routeFile of adminRoutes) {
  const rel = path.relative(ROOT, routeFile);
  const content = fs.readFileSync(routeFile, "utf8");
  if (!content.includes("requireAdmin(")) {
    failures.push(`[AuthZ] ${rel}: missing requireAdmin() server-side session check`);
  }
}

// 3. Verify audit logs remain immutable (no DELETE FROM audit_logs)
const auditLogsRoute = path.join(adminApiDir, "audit-logs", "route.ts");
if (fs.existsSync(auditLogsRoute)) {
  const auditContent = fs.readFileSync(auditLogsRoute, "utf8");
  if (/DELETE\s+FROM\s+audit_logs/i.test(auditContent)) {
    failures.push("[Audit] src/app/api/admin/audit-logs/route.ts still deletes from audit_logs");
  }
}

// 4. Verify Next.js security headers and poweredByHeader: false
const nextConfig = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
for (const requiredToken of [
  "poweredByHeader: false",
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
]) {
  if (!nextConfig.includes(requiredToken)) {
    failures.push(`[Config] next.config.ts missing "${requiredToken}"`);
  }
}

// 5. Verify .env secrets are ignored and not committed to git
const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
if (!/^\.env\*/m.test(gitignore)) {
  failures.push("[Secrets] .gitignore missing .env* rule");
}
const dockerignore = fs.readFileSync(path.join(ROOT, ".dockerignore"), "utf8");
if (!/^\.env/m.test(dockerignore)) {
  failures.push("[Secrets] .dockerignore missing .env rule");
}
try {
  const trackedEnv = execFileSync("git", ["ls-files", ".env"], { encoding: "utf8" }).trim();
  if (trackedEnv) {
    failures.push(`[Secrets] .env is tracked in git: ${trackedEnv}`);
  }
} catch {
  warnings.push("[Git] Unable to check git ls-files .env");
}

// 6. Verify container hardening
const dockerfile = fs.readFileSync(path.join(ROOT, "Dockerfile"), "utf8");
if (!/^USER\s+nextjs/m.test(dockerfile)) {
  failures.push("[Container] Dockerfile does not drop to non-root USER nextjs");
}
const composeProd = fs.readFileSync(path.join(ROOT, "docker-compose.prod.yml"), "utf8");
if (!composeProd.includes("cap_drop:") || !composeProd.includes("no-new-privileges:true")) {
  failures.push("[Container] docker-compose.prod.yml missing cap_drop or no-new-privileges");
}

// 7. Verify RFC 9116 security.txt exists
if (!fs.existsSync(path.join(ROOT, "public", ".well-known", "security.txt"))) {
  failures.push("[Disclosure] Missing public/.well-known/security.txt");
}

console.log(`Scanned ${sourceFiles.length} source files and ${adminRoutes.length} admin API routes.`);
for (const w of warnings) console.warn(`WARN: ${w}`);

if (failures.length > 0) {
  console.error("Security check FAILED:");
  for (const err of failures) console.error(`  - ${err}`);
  process.exit(1);
}

console.log("Security check PASSED (0 policy violations).");
