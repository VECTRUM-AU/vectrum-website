#!/usr/bin/env node
/*
 * Generates the RAZUM speed-test download payloads at build time.
 *
 * Why generated rather than committed
 * -----------------------------------
 * The file this replaces (speedtest/testfile-10mb.bin) was 10 MB of zeroes.
 * It gzipped to 10,226 bytes — a ratio of about 1025:1. Any compression
 * anywhere in the path (the CDN, a proxy, a future config change) would mean
 * the client "downloads 10 MB" having pulled ~10 KB over the air, and the
 * reported throughput would be wrong by up to three orders of magnitude.
 *
 * That it happens to be safe today, because Netlify does not compress
 * application/octet-stream, is not a property worth depending on: it is one
 * header rule away from silently falsifying every download measurement in
 * the app, with no error and no symptom beyond implausibly good numbers.
 *
 * Random bytes are incompressible, so the question stops existing. They are
 * also unsuitable for git — incompressible by the same token, and 91 MB of
 * it — so they are built here instead of committed, and .gitignore'd.
 *
 * Run by netlify.toml's build command. To work on the site locally with the
 * payloads present, run it by hand: node tools/gen-speedtest-files.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Sizes the app can choose between. Small ones keep a slow link's test short
// and spare the user's data; large ones let a fast link run long enough to
// get past TCP slow-start, where a too-small file measures the ramp rather
// than the link.
const SIZES_MB = [1, 5, 10, 25, 50];

const BLOCK_BYTES = 1024 * 1024;
const OUT_DIR = path.join(__dirname, "..", "speedtest");

fs.mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
for (const mb of SIZES_MB) {
  const file = path.join(OUT_DIR, `testfile-${mb}mb.bin`);
  const fd = fs.openSync(file, "w");
  try {
    // A block at a time: 50 MB in one randomBytes() call is a 50 MB
    // allocation and a single blocking draw on the CSPRNG.
    for (let i = 0; i < mb; i++) {
      fs.writeSync(fd, crypto.randomBytes(BLOCK_BYTES));
    }
  } finally {
    fs.closeSync(fd);
  }
  total += mb;
  console.log(`speedtest: wrote testfile-${mb}mb.bin (${mb} MB, random)`);
}

console.log(`speedtest: ${SIZES_MB.length} payloads, ${total} MB total`);
