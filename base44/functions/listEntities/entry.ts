Deno.serve(async (req) => {
  try {
    const dir = [];
    for await (const dirEntry of Deno.readDir('./entities')) {
      dir.push(dirEntry.name);
    }
    return Response.json(dir);
  } catch (err) {
    return Response.json({ error: err.message });
  }
});