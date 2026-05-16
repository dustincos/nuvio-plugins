/**
 * vidlink - Built from src/vidlink/
 * Generated: 2026-05-16T18:34:14.005Z
 */
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

// src/vidlink/constants.js
var VIDLINK_API = "https://vidlink.pro";
var DECRYPT_API = "https://enc-dec.app/api";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Connection": "keep-alive",
  "Referer": "https://vidlink.pro/",
  "Origin": "https://vidlink.pro"
};

// src/vidlink/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(`[Vidlink] Fetching streams for ${mediaType} ${tmdbId}`);
    try {
      const encUrl = `${DECRYPT_API}/enc-vidlink?text=${tmdbId}`;
      const encResp = yield fetch(encUrl);
      const encJson = yield encResp.json();
      const encData = encJson.result;
      if (!encData) {
        console.log(`[Vidlink] No encrypted ID returned`);
        return [];
      }
      const isMovie = mediaType !== "tv" && season == null;
      const epUrl = isMovie ? `${VIDLINK_API}/api/b/movie/${encData}` : `${VIDLINK_API}/api/b/tv/${encData}/${season}/${episode}`;
      console.log(`[Vidlink] Fetching playlist from: ${epUrl}`);
      const epResp = yield fetch(epUrl, { headers: HEADERS });
      const epJson = yield epResp.json();
      const playlist = epJson && epJson.stream && epJson.stream.playlist;
      if (!playlist) {
        console.log(`[Vidlink] No playlist in response`);
        return [];
      }
      const streams = [{
        name: "Vidlink",
        title: "Adaptive",
        url: playlist,
        quality: "Auto",
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": `${VIDLINK_API}/`,
          "Origin": VIDLINK_API
        },
        provider: "vidlink"
      }];
      console.log(`[Vidlink] Found playlist stream`);
      return streams;
    } catch (error) {
      console.error(`[Vidlink] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
