import * as path from "node:path";
import * as fs from "node:fs";

async function readDirDeep(dir, depth=0) {
    let results = [];
    if (depth > 5) return results;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
              if (entry.name !== "node_modules" && entry.name !== ".git") {
                  results.push(...await readDirDeep(fullPath, depth+1));
              }
          } else {
              results.push(fullPath);
          }
      }
    } catch (e) {}
    return results;
}

Deno.serve(async (req) => {
    try {
        const cwd = Deno.cwd();
        // just list files in cwd
        const files = await readDirDeep("/app"); // the standard path is usually /app or something, let's just use cwd for now. wait, I'll pass it in the payload.
        return Response.json({ cwd, rootFiles: fs.readdirSync(cwd) });
    } catch (e) {
        return Response.json({ error: e.message });
    }
});