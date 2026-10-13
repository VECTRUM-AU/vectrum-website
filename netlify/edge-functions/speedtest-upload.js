/*
 * RAZUM speed-test upload sink — streaming, at the edge.
 *
 * Why this exists alongside netlify/functions/speedtest-upload.js
 * ---------------------------------------------------------------
 * The Lambda-backed function buffers the whole request body into the
 * invocation payload before the handler runs, and binary bodies are
 * base64-encoded on the way in. AWS caps that payload at 6 MB, so the real
 * ceiling on an upload test there is about 4.5 MB of actual bytes.
 *
 * That ceiling is a measurement problem, not just a limit. On a fast uplink
 * a 2 MB upload finishes in a fraction of a second, which is mostly TCP
 * slow-start — the test measures the ramp rather than the link. Running the
 * upload for a fixed interval instead needs far more headroom than 4.5 MB
 * (10 s at 50 Mbit/s is ~62 MB).
 *
 * Edge functions run on Deno and get the request as a stream, so there is no
 * payload limit to hit: read, count, discard. Nothing is stored anywhere.
 *
 * The Lambda function stays deployed at its own path so existing installs
 * keep working through the transition.
 */

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
    });
  }

  let received = 0;

  if (request.body) {
    const reader = request.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength; // counted, then dropped
      }
    } catch (err) {
      // A client that stops early is the normal case for a time-boxed
      // upload, not an error. Report what did arrive so the app can still
      // compute a throughput figure from a cut-short run.
      return new Response(
        JSON.stringify({ ok: false, received, error: String(err) }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }
  }

  // Echoing the byte count lets the app check the server agrees with what it
  // believes it sent, rather than trusting its own write loop.
  return new Response(JSON.stringify({ ok: true, received }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

export const config = { path: "/speedtest/upload" };
