import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as path from "node:path";
import * as fs from "node:fs";

async function searchDir(dir, regex) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".git") {
                results.push(...await searchDir(fullPath, regex));
            }
        } else {
            if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (regex.test(content)) {
                        results.push(fullPath);
                    }
                } catch (e) {}
            }
        }
    }
    return results;
}

Deno.serve(async (req) => {
    try {
        const root = Deno.cwd();
        const matches = await searchDir(root, /demo_mode|is_demo_listing|demo|isDemo/i);
        return Response.json({ matches });
    } catch (e) {
        return Response.json({ error: e.message });
    }
});