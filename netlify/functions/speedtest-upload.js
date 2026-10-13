/*
 * RAZUM speed-test upload sink — Lambda-backed, legacy path.
 *
 * Kept so installs released before the edge function exists keep working.
 * New work should target the edge function at /speedtest/upload, which
 * streams the body and has no payload ceiling; see
 * netlify/edge-functions/speedtest-upload.js for why that matters.
 *
 * Hard limit here: AWS caps the Lambda invocation payload at 6 MB and binary
 * bodies arrive base64-encoded, so uploads above roughly 4.5 MB of actual
 * bytes fail at the platform before this handler is ever called. Do not
 * raise the app's upload size against this endpoint expecting it to work.
 *
 * Nothing is stored. The body is counted and discarded.
 *
 * (This file previously began with a UTF-8 BOM. Node strips a leading BOM
 * when loading a CommonJS module, so it ran, but it had no business being
 * in a source file.)
 */

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
      body: "Method Not Allowed",
    };
  }

  const body = event.body || "";
  const received = event.isBase64Encoded
    ? Buffer.byteLength(body, "base64")
    : Buffer.byteLength(body, "utf8");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ ok: true, received }),
  };
};
