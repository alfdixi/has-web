// CloudFront Function — viewer-request handler.
// Two responsibilities:
//   1. Redirect root "/" to "/<best-locale>/" using Accept-Language header.
//   2. Rewrite "/path/" → "/path/index.html" so S3 (private + OAC) serves the right object.
//
// CloudFront Functions run on every viewer request, are billed per million invocations
// at a fraction of Lambda@Edge cost, and have a strict 1ms / 10KB / no-network limit.
// Keep this file ES5-only and dependency-free.

var SUPPORTED = __SUPPORTED_LOCALES__;
var FALLBACK = __DEFAULT_LOCALE__;

function pickLocale(headers) {
  if (!headers["accept-language"]) return FALLBACK;
  var raw = headers["accept-language"].value;
  if (!raw) return FALLBACK;

  var parts = raw.split(",");
  var entries = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (!p) continue;
    var bits = p.split(";");
    var code = bits[0].toLowerCase().split("-")[0];
    var q = 1.0;
    for (var j = 1; j < bits.length; j++) {
      var kv = bits[j].split("=");
      if (kv[0].trim() === "q") {
        var parsed = parseFloat(kv[1]);
        if (!isNaN(parsed)) q = parsed;
      }
    }
    entries.push({ code: code, q: q, idx: i });
  }
  entries.sort(function (a, b) {
    if (b.q !== a.q) return b.q - a.q;
    return a.idx - b.idx;
  });

  for (var k = 0; k < entries.length; k++) {
    for (var s = 0; s < SUPPORTED.length; s++) {
      if (SUPPORTED[s] === entries[k].code) return entries[k].code;
    }
  }
  return FALLBACK;
}

function handler(event) {
  var request = event.request;
  var uri = request.uri || "/";

  if (uri === "/" || uri === "") {
    var picked = pickLocale(request.headers || {});
    return {
      statusCode: 302,
      statusDescription: "Found",
      headers: {
        location: { value: "/" + picked + "/" },
        "cache-control": { value: "no-cache, no-store, must-revalidate" },
        vary: { value: "Accept-Language" },
      },
    };
  }

  if (uri.charAt(uri.length - 1) === "/") {
    request.uri = uri + "index.html";
    return request;
  }

  var lastSlash = uri.lastIndexOf("/");
  var lastSegment = lastSlash >= 0 ? uri.substring(lastSlash + 1) : uri;
  if (lastSegment.indexOf(".") < 0) {
    request.uri = uri + "/index.html";
    return request;
  }

  return request;
}
