import * as fs from "node:fs";

Deno.serve(async (req) => {
    try {
        const funcs = fs.readdirSync("/src/functions");
        return Response.json({ funcs });
    } catch (e) {
        return Response.json({ error: e.message });
    }
});