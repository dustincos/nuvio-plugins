/**
 * videasy - Built from src/videasy/
 * Generated: 2026-05-16T18:53:08.242Z
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

// src/videasy/constants.js
var VIDEASY_API = "https://api.videasy.net";
var DECRYPT_API = "https://enc-dec.app/api";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var HEADERS = {
  "Accept": "*/*",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Origin": "https://www.cineby.sc",
  "Referer": "https://www.cineby.sc/"
};
var SERVERS = [
  "myflixerzupcloud",
  "1movies",
  "moviebox",
  "primewire",
  "m4uhd",
  "hdmovie",
  "cdn",
  "primesrcme",
  "visioncine",
  "overflix",
  "superflix",
  "cuevana",
  "lamovie",
  "mb-flix"
];

// src/videasy/utils.js
function getMediaDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`;
    const res = yield fetch(url);
    const data = yield res.json();
    const title = mediaType === "tv" ? data.name : data.title;
    const date = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = date ? date.split("-")[0] : "";
    const imdbId = data.external_ids && data.external_ids.imdb_id ? data.external_ids.imdb_id : "";
    return { title, year, imdbId };
  });
}
function doubleEncode(title) {
  return encodeURIComponent(encodeURIComponent(title));
}
function capitalizeServer(name) {
  if (!name)
    return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}
function getIndexQuality(qualityStr) {
  if (!qualityStr)
    return "Auto";
  const q = qualityStr.toLowerCase();
  if (q.includes("2160") || q.includes("4k") || q.includes("uhd"))
    return "4K";
  if (q.includes("1080"))
    return "1080p";
  if (q.includes("720"))
    return "720p";
  if (q.includes("480"))
    return "480p";
  if (q.includes("360"))
    return "360p";
  return qualityStr;
}
function getStreamType(url) {
  if (!url)
    return null;
  if (url.includes(".m3u8"))
    return "m3u8";
  if (url.includes(".mp4") || url.includes(".mkv"))
    return "video";
  return null;
}

// src/videasy/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(`[Videasy] Fetching streams for ${mediaType} ${tmdbId}`);
    try {
      const media = yield getMediaDetails(tmdbId, mediaType);
      if (!media.title) {
        console.warn(`[Videasy] Could not resolve title for TMDB ID ${tmdbId}`);
        return [];
      }
      console.log(`[Videasy] Resolved: "${media.title}" (${media.year})`);
      const encTitle = doubleEncode(media.title);
      const isMovie = mediaType !== "tv" && season == null;
      const serverPromises = SERVERS.map(
        (server) => fetchFromServer(server, encTitle, isMovie, media, tmdbId, season, episode).catch(() => [])
      );
      const results = yield Promise.all(serverPromises);
      const streams = [];
      for (const result of results) {
        if (result.length > 0) {
          streams.push(...result);
        }
      }
      console.log(`[Videasy] Returning ${streams.length} streams from ${SERVERS.length} servers`);
      return streams;
    } catch (error) {
      console.error(`[Videasy] Error: ${error.message}`);
      return [];
    }
  });
}
function fetchFromServer(server, encTitle, isMovie, media, tmdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = isMovie ? `${VIDEASY_API}/${server}/sources-with-title?title=${encTitle}&mediaType=movie&year=${media.year}&tmdbId=${tmdbId}&imdbId=${media.imdbId}` : `${VIDEASY_API}/${server}/sources-with-title?title=${encTitle}&mediaType=tv&year=${media.year}&tmdbId=${tmdbId}&episodeId=${episode}&seasonId=${season}&imdbId=${media.imdbId}`;
      const encResp = yield fetch(url, { headers: HEADERS });
      const encData = yield encResp.text();
      if (!encData || encData.trim() === "")
        return [];
      const decResp = yield fetch(`${DECRYPT_API}/dec-videasy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": HEADERS["User-Agent"]
        },
        body: JSON.stringify({ text: encData, id: tmdbId })
      });
      if (!decResp.ok)
        return [];
      const decJson = yield decResp.json();
      const result = decJson.result;
      if (!result || !result.sources)
        return [];
      const streams = [];
      const sourcesArray = Array.isArray(result.sources) ? result.sources : [];
      const serverLabel = capitalizeServer(server);
      for (const src of sourcesArray) {
        const sourceUrl = src.url;
        if (!sourceUrl)
          continue;
        const quality = src.quality || "Auto";
        const qualityLabel = getIndexQuality(quality);
        streams.push({
          name: `Videasy [${serverLabel}]`,
          title: `${qualityLabel}`,
          url: sourceUrl,
          quality: qualityLabel,
          type: getStreamType(sourceUrl),
          headers: HEADERS,
          provider: "videasy"
        });
      }
      if (streams.length > 0) {
        console.log(`[Videasy] ${serverLabel}: found ${streams.length} stream(s)`);
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
module.exports = { getStreams };
