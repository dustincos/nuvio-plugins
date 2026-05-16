/**
 * playimdb - Built from src/playimdb/
 * Generated: 2026-05-16T18:53:08.241Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/playimdb/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/playimdb/constants.js
var PLAYIMDB_API = "https://streamimdb.me";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": "https://streamimdb.me/"
};
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";

// src/playimdb/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(`[PlayImdb] Fetching streams for ${mediaType} ${tmdbId}`);
    try {
      const imdbId = yield getImdbId(tmdbId, mediaType);
      if (!imdbId) {
        console.warn(`[PlayImdb] Could not resolve IMDB ID for TMDB ${tmdbId}`);
        return [];
      }
      console.log(`[PlayImdb] Resolved IMDB ID: ${imdbId}`);
      const isMovie = mediaType !== "tv" && season == null;
      const embedUrl = isMovie ? `${PLAYIMDB_API}/embed/${imdbId}` : `${PLAYIMDB_API}/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`;
      console.log(`[PlayImdb] Fetching embed page: ${embedUrl}`);
      const embedResp = yield fetch(embedUrl, { headers: HEADERS });
      const embedHtml = yield embedResp.text();
      const $ = import_cheerio_without_node_native.default.load(embedHtml);
      let iframe = $("#player_iframe").attr("src") || "";
      if (!iframe) {
        console.log(`[PlayImdb] No #player_iframe found`);
        return [];
      }
      if (!iframe.includes("https:")) {
        iframe = "https:" + iframe;
      }
      console.log(`[PlayImdb] Found iframe: ${iframe}`);
      const streams = yield extractFromIframe(iframe);
      console.log(`[PlayImdb] Returning ${streams.length} streams`);
      return streams;
    } catch (error) {
      console.error(`[PlayImdb] Error: ${error.message}`);
      return [];
    }
  });
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const type = mediaType === "tv" ? "tv" : "movie";
      const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
      const resp = yield fetch(url);
      const data = yield resp.json();
      return data.imdb_id || null;
    } catch (e) {
      return null;
    }
  });
}
function extractFromIframe(iframeUrl) {
  return __async(this, null, function* () {
    try {
      const resp = yield fetch(iframeUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": PLAYIMDB_API + "/"
        })
      });
      const html = yield resp.text();
      const streams = [];
      const m3u8Matches = html.match(/(?:file|source|src|url)\s*[:=]\s*["']([^"']*\.m3u8[^"']*)/gi) || [];
      for (const match of m3u8Matches) {
        const urlMatch = match.match(/["']([^"']*\.m3u8[^"']*)/);
        if (urlMatch && urlMatch[1]) {
          streams.push({
            name: "PlayImdb",
            title: "Adaptive",
            url: urlMatch[1],
            quality: "Auto",
            type: "m3u8",
            headers: {
              "Referer": iframeUrl,
              "Origin": new URL(iframeUrl).origin,
              "User-Agent": HEADERS["User-Agent"]
            },
            provider: "playimdb"
          });
        }
      }
      const mp4Matches = html.match(/(?:file|source|src|url)\s*[:=]\s*["']([^"']*\.mp4[^"']*)/gi) || [];
      for (const match of mp4Matches) {
        const urlMatch = match.match(/["']([^"']*\.mp4[^"']*)/);
        if (urlMatch && urlMatch[1]) {
          streams.push({
            name: "PlayImdb",
            title: "Direct",
            url: urlMatch[1],
            quality: "Auto",
            type: "video",
            headers: {
              "Referer": iframeUrl,
              "Origin": new URL(iframeUrl).origin,
              "User-Agent": HEADERS["User-Agent"]
            },
            provider: "playimdb"
          });
        }
      }
      if (streams.length === 0) {
        const $ = import_cheerio_without_node_native.default.load(html);
        let nestedSrc = $("iframe").attr("src") || "";
        if (nestedSrc && !nestedSrc.includes("about:blank")) {
          if (!nestedSrc.startsWith("http")) {
            nestedSrc = nestedSrc.startsWith("//") ? "https:" + nestedSrc : new URL(nestedSrc, iframeUrl).href;
          }
          console.log(`[PlayImdb] Found nested iframe: ${nestedSrc}`);
          const nestedResp = yield fetch(nestedSrc, {
            headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": iframeUrl })
          });
          const nestedHtml = yield nestedResp.text();
          const nestedM3u8 = nestedHtml.match(/(?:file|source|src|url)\s*[:=]\s*["']([^"']*\.m3u8[^"']*)/i);
          if (nestedM3u8 && nestedM3u8[1]) {
            streams.push({
              name: "PlayImdb",
              title: "Adaptive",
              url: nestedM3u8[1],
              quality: "Auto",
              type: "m3u8",
              headers: {
                "Referer": nestedSrc,
                "Origin": new URL(nestedSrc).origin,
                "User-Agent": HEADERS["User-Agent"]
              },
              provider: "playimdb"
            });
          }
          const nestedMp4 = nestedHtml.match(/(?:file|source|src|url)\s*[:=]\s*["']([^"']*\.mp4[^"']*)/i);
          if (nestedMp4 && nestedMp4[1]) {
            streams.push({
              name: "PlayImdb",
              title: "Direct",
              url: nestedMp4[1],
              quality: "Auto",
              type: "video",
              headers: {
                "Referer": nestedSrc,
                "Origin": new URL(nestedSrc).origin,
                "User-Agent": HEADERS["User-Agent"]
              },
              provider: "playimdb"
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error(`[PlayImdb] Iframe extraction error: ${e.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
