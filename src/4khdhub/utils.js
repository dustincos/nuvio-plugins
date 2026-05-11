export const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";

export const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    "Cookie": "xla=s4t"
};

export async function getLatestDomains() {
    try {
        const res = await fetch("https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json");
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (e) {
        return {
            "4khdhub": "https://4khdhub.link",
            "hubcloud": "https://hubcloud.foo"
        };
    }
}

export const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

export function atob(value) {
  if (!value) return "";
  let input = String(value).replace(/=+$/, "");
  let output = "";
  let bc = 0, bs, buffer, idx = 0;
  while (buffer = input.charAt(idx++)) {
    buffer = BASE64_CHARS.indexOf(buffer);
    if (~buffer) {
      bs = bc % 4 ? bs * 64 + buffer : buffer;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
      }
    }
  }
  return output;
}

export function rot13(value) {
  return value.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}

export function cleanTitle(title) {
  let name = title.replace(/\.[a-zA-Z0-9]{2,4}$/, "");
  
  const normalized = name
    .replace(/WEB[-_. ]?DL/gi, "WEB-DL")
    .replace(/WEB[-_. ]?RIP/gi, "WEBRIP")
    .replace(/H[ .]?265/gi, "H265")
    .replace(/H[ .]?264/gi, "H264")
    .replace(/(DDP|DD\+|EAC3|AC3)[ .]?([0-9][._ ]?[0-9])/gi, "$1$2")
    .replace(/(DDP|DD\+|EAC3|AC3)[ .]?([0-9])/gi, "$1$2")
    .replace(/([0-9])[._ ]([0-9])(?=(?:p|GB|MB|KB))/gi, "$1.$2");

  const parts = normalized.split(/[\s_.\[\]()]/);
  
  const sourceTags = new Set(["WEB-DL", "WEBRIP", "BLURAY", "HDRIP", "DVDRIP", "HDTV", "CAM", "TS", "BRRIP", "BDRIP"]);
  const codecTags = new Set(["H264", "H265", "X264", "X265", "HEVC", "AVC"]);
  const audioTags = ["AAC", "AC3", "DTS", "MP3", "FLAC", "DD", "DDP", "EAC3"];
  const audioExtras = new Set(["ATMOS"]);
  const hdrTags = new Set(["SDR", "HDR", "HDR10", "HDR10+", "DV", "DOLBYVISION"]);

  const filtered = parts.map(part => {
    const p = part.toUpperCase();
    if (sourceTags.has(p)) return p;
    if (codecTags.has(p)) return p;
    if (audioTags.some(tag => p.startsWith(tag))) return p;
    if (audioExtras.has(p)) return p;
    if (hdrTags.has(p)) return p === "DOLBYVISION" || p === "DV" ? "DOLBYVISION" : p;
    if (p === "NF" || p === "CR") return p;
    return null;
  }).filter(Boolean);

  return [...new Set(filtered)].join(" ");
}

export function getIndexQuality(str) {
    if (!str) return "Unknown";
    const match = str.match(/(\d{3,4})[pP]/);
    if (match) return match[0];
    
    const lower = str.toLowerCase();
    if (lower.includes("2160p") || lower.includes("4k")) return "2160p";
    if (lower.includes("1080p")) return "1080p";
    if (lower.includes("720p")) return "720p";
    
    return "Auto";
}
