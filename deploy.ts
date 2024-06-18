import { lookup } from "https://deno.land/x/media_types/mod.ts";

Deno.serve(async ({ url }) => {
  let path = "." + new URL(url).pathname;
  if (path.endsWith("/")) {
    path += "index.html";
  }
  return new Response(await Deno.readFile(path), {
    headers: { "content-type": lookup(path) || "application/octet-stream" },
  });
});
