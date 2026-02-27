export default async function fetch(req) {
  const dir = [];
  for await (const dirEntry of Deno.readDir('./entities')) {
    dir.push(dirEntry.name);
  }
  return Response.json(dir);
}