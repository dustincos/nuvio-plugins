/**
 * vidfast - Built from src/vidfast/
 * Generated: 2026-05-19T15:45:43.176Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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

// src/vidfast/constants.js
var VIDFAST_API = "https://vidfast.pro";
var DECRYPT_API = "https://enc-dec.app/api";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": "https://vidfast.pro/",
  "X-Requested-With": "XMLHttpRequest"
};

// src/vidfast/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(`[VidFast] Fetching streams for ${mediaType} ${tmdbId}`);
    try {
      const isMovie = mediaType !== "tv" && season == null;
      const pageUrl = isMovie ? `${VIDFAST_API}/movie/${tmdbId}/` : `${VIDFAST_API}/tv/${tmdbId}/${season}/${episode}/`;
      console.log(`[VidFast] Loading page: ${pageUrl}`);
      const pageResp = yield fetch(pageUrl, { headers: HEADERS });
      const pageHtml = yield pageResp.text();
      const encodedMatch = pageHtml.match(/\\"en\\":\\"(.*?)\\"/);
      if (!encodedMatch || !encodedMatch[1]) {
        console.log(`[VidFast] No encoded token found in page`);
        return [];
      }
      const encodedText = encodedMatch[1];
      const decApiUrl = `${DECRYPT_API}/enc-vidfast?text=${encodedText}&version=1`;
      const decConfigResp = yield fetch(decApiUrl);
      const decConfigJson = yield decConfigResp.json();
      const decConfig = decConfigJson.result;
      if (!decConfig || !decConfig.servers || !decConfig.stream || !decConfig.token) {
        console.log(`[VidFast] Incomplete decryption config`);
        return [];
      }
      const serversUrl = decConfig.servers;
      const streamBaseUrl = decConfig.stream;
      const csrfToken = decConfig.token;
      const authedHeaders = __spreadProps(__spreadValues({}, HEADERS), {
        "X-CSRF-Token": csrfToken
      });
      const serversEncResp = yield fetch(serversUrl, {
        method: "POST",
        headers: authedHeaders
      });
      const serversEncrypted = yield serversEncResp.text();
      const serversDecResp = yield fetch(`${DECRYPT_API}/dec-vidfast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": HEADERS["User-Agent"] },
        body: JSON.stringify({ text: serversEncrypted, version: "1" })
      });
      const serversDecJson = yield serversDecResp.json();
      const serversList = serversDecJson.result;
      if (!Array.isArray(serversList) || serversList.length === 0) {
        console.log(`[VidFast] No servers in decrypted response`);
        return [];
      }
      console.log(`[VidFast] Found ${serversList.length} server(s)`);
      const streamPromises = serversList.map(
        (server) => fetchServerStream(server, streamBaseUrl, authedHeaders).catch(() => [])
      );
      const results = yield Promise.all(streamPromises);
      const streams = [];
      for (const result of results) {
        if (result.length > 0) {
          streams.push(...result);
        }
      }
      console.log(`[VidFast] Returning ${streams.length} streams`);
      return streams;
    } catch (error) {
      console.error(`[VidFast] Error: ${error.message}`);
      return [];
    }
  });
}
function fetchServerStream(server, streamBaseUrl, authedHeaders) {
  return __async(this, null, function* () {
    try {
      const serverHash = server.data;
      if (!serverHash)
        return [];
      const serverName = server.name || "Default";
      const serverDesc = server.description || "";
      const finalStreamUrl = `${streamBaseUrl}/${serverHash}`;
      const streamEncResp = yield fetch(finalStreamUrl, {
        method: "POST",
        headers: authedHeaders
      });
      const streamEncrypted = yield streamEncResp.text();
      if (!streamEncrypted || streamEncrypted.trim() === "")
        return [];
      const streamDecResp = yield fetch(`${DECRYPT_API}/dec-vidfast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": HEADERS["User-Agent"] },
        body: JSON.stringify({ text: streamEncrypted, version: "1" })
      });
      const streamDecJson = yield streamDecResp.json();
      const streamData = streamDecJson.result;
      if (!streamData || !streamData.url)
        return [];
      const fileUrl = streamData.url;
      const is4k = streamData["4kAvailable"] === true || serverDesc && serverDesc.toLowerCase().includes("4k");
      const quality = is4k ? "4K" : "1080p";
      const streams = [{
        name: `Vidfast [${serverName}]`,
        title: `${serverDesc || quality}`,
        url: fileUrl,
        quality,
        type: fileUrl.includes(".m3u8") ? "m3u8" : fileUrl.includes(".mp4") || fileUrl.includes(".mkv") ? "video" : null,
        headers: authedHeaders,
        provider: "vidfast"
      }];
      console.log(`[VidFast] ${serverName}: found stream (${quality})`);
      return streams;
    } catch (e) {
      return [];
    }
  });
}
module.exports = { getStreams };
