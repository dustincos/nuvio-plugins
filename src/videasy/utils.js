import { TMDB_API_KEY } from './constants.js';

export async function getMediaDetails(tmdbId, mediaType) {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`;
    const res = await fetch(url);
    const data = await res.json();

    const title = mediaType === 'tv' ? data.name : data.title;
    const date = mediaType === 'tv' ? data.first_air_date : data.release_date;
    const year = date ? date.split("-")[0] : "";
    const imdbId = (data.external_ids && data.external_ids.imdb_id) ? data.external_ids.imdb_id : "";

    return { title, year, imdbId };
}

export function doubleEncode(title) {
    return encodeURIComponent(encodeURIComponent(title));
}

export function capitalizeServer(name) {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getIndexQuality(qualityStr) {
    if (!qualityStr) return "Auto";
    const q = qualityStr.toLowerCase();
    if (q.includes("2160") || q.includes("4k") || q.includes("uhd")) return "4K";
    if (q.includes("1080")) return "1080p";
    if (q.includes("720")) return "720p";
    if (q.includes("480")) return "480p";
    if (q.includes("360")) return "360p";
    return qualityStr;
}

export function getStreamType(url) {
    if (!url) return null;
    if (url.includes(".m3u8")) return "m3u8";
    if (url.includes(".mp4") || url.includes(".mkv")) return "video";
    return null;
}
