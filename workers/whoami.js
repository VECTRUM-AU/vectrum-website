/**
 * VECTRUM /whoami — egress identity for RAZUM.
 *
 * Deployed as a Cloudflare Worker on the route vectrum.com.au/whoami. It is a
 * Worker rather than a Netlify function for one reason: Cloudflare fronts this
 * zone, so Netlify sees Cloudflare's address as the client, and only code
 * running AT Cloudflare sees the real one. request.cf also carries the AS
 * organisation, which no Netlify API exposes.
 *
 * WHAT THIS IS FOR
 * RAZUM already knows where the handset is, from GPS. This tells it where the
 * handset's traffic LEAVES the operator's network. On mobile those are
 * routinely different places — central breakout and CGNAT put the egress tens
 * or hundreds of kilometres away — and the gap explains latency the radio
 * cannot account for. No consumer speed test shows it.
 *
 * PRIVACY
 * Nothing is stored and nothing is logged beyond Cloudflare's own request
 * records. This creates no new data flow: every speed test already connects to
 * vectrum.com.au, so Cloudflare already receives this IP. The Worker reads what
 * it is already given and hands it back to the person it belongs to.
 *
 * no-store is REQUIRED, not tidiness. The response is specific to one client;
 * a cached copy served to the next user would report someone else's network
 * and location as theirs.
 */
export default {
  async fetch(request) {
    const cf = request.cf ?? {};
    const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

    const body = {
      ip:      request.headers.get("CF-Connecting-IP"),
      asn:     cf.asn ?? null,
      isp:     cf.asOrganization ?? null,   // e.g. "Telstra Limited"
      colo:    cf.colo ?? null,             // serving PoP, e.g. "SYD"
      city:    cf.city ?? null,
      region:  cf.region ?? null,
      country: cf.country ?? null,
      lat:     num(cf.latitude),
      lon:     num(cf.longitude),
      tz:      cf.timezone ?? null,
    };

    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  },
};
