// Cloudflare Worker + KV — single-document store for the planner's "own endpoint" option.
// Deploy: create a Worker, bind a KV namespace as PLAN, set TOKEN as a secret (optional).
// Endpoint URL to paste into Sync: https://<worker>.workers.dev/journey
const CORS = {
  "Access-Control-Allow-Origin": "*",              // tighten to your Pages origin if you like
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Max-Age": "86400"
};

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (env.TOKEN) {
      const auth = req.headers.get("Authorization") || "";
      if (auth !== "Bearer " + env.TOKEN) return new Response("forbidden", { status: 403, headers: CORS });
    }

    const key = new URL(req.url).pathname.slice(1) || "journey";

    if (req.method === "GET") {
      const v = await env.PLAN.get(key);
      if (v === null) return new Response(null, { status: 204, headers: CORS });
      return new Response(v, { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }

    if (req.method === "PUT") {
      const body = await req.text();
      try { JSON.parse(body); } catch { return new Response("invalid json", { status: 400, headers: CORS }); }
      if (body.length > 1_000_000) return new Response("too large", { status: 413, headers: CORS });
      await env.PLAN.put(key, body);
      return new Response(body, { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    return new Response("method not allowed", { status: 405, headers: CORS });
  }
};
