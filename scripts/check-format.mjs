import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const roots = ["app", "lib", "tests", "scripts"];
const exts = new Set([".ts", ".tsx", ".mjs", ".css", ".md"]);
const failures = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (exts.has(path.extname(entry.name))) {
      const text = await readFile(full, "utf8");
      if (/\r\n/.test(text)) failures.push(`${full}: CRLF line endings`);
      if (!text.endsWith("\n")) failures.push(`${full}: missing trailing newline`);
      const lines = text.split("\n");
      lines.forEach((line, index) => {
        if (/[ \t]+$/.test(line)) failures.push(`${full}:${index + 1}: trailing whitespace`);
      });
    }
  }
}

for (const root of roots) await walk(root);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Format check passed: no CRLF, missing trailing newlines, or trailing whitespace in source files.");
