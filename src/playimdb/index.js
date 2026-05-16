import cheerio from 'cheerio-without-node-native';
import { PLAYIMDB_API, HEADERS, TMDB_API_KEY } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[PlayImdb] Fetching streams for ${mediaType} ${tmdbId}`);

    try {
        const imdbId = await getImdbId(tmdbId, mediaType);
        if (!imdbId) {
            console.warn(`[PlayImdb] Could not resolve IMDB ID for TMDB ${tmdbId}`);
            return [];
        }

        console.log(`[PlayImdb] Resolved IMDB ID: ${imdbId}`);

        const isMovie = (mediaType !== 'tv' && season == null);
        const embedUrl = isMovie
            ? `${PLAYIMDB_API}/embed/${imdbId}`
            : `${PLAYIMDB_API}/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`;

        console.log(`[PlayImdb] Fetching embed page: ${embedUrl}`);

        const embedResp = await fetch(embedUrl, { headers: HEADERS });
        const embedHtml = await embedResp.text();
        const $ = cheerio.load(embedHtml);

        let iframe = $('#player_iframe').attr('src') || '';
        if (!iframe) {
            console.log(`[PlayImdb] No #player_iframe found`);
            return [];
        }

        if (!iframe.includes('https:')) {
            iframe = 'https:' + iframe;
        }

        console.log(`[PlayImdb] Found iframe: ${iframe}`);

        const streams = await extractFromIframe(iframe);

        console.log(`[PlayImdb] Returning ${streams.length} streams`);
        return streams;

    } catch (error) {
        console.error(`[PlayImdb] Error: ${error.message}`);
        return [];
    }
}

async function getImdbId(tmdbId, mediaType) {
    try {
        const type = mediaType === 'tv' ? 'tv' : 'movie';
        const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        return data.imdb_id || null;
    } catch (e) {
        return null;
    }
}

async function extractFromIframe(iframeUrl) {
    try {
        const resp = await fetch(iframeUrl, {
            headers: {
                ...HEADERS,
                "Referer": PLAYIMDB_API + "/"
            }
        });
        const html = await resp.text();

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
            const $ = cheerio.load(html);
            let nestedSrc = $('iframe').attr('src') || '';
            if (nestedSrc && !nestedSrc.includes('about:blank')) {
                if (!nestedSrc.startsWith('http')) {
                    nestedSrc = nestedSrc.startsWith('//') ? 'https:' + nestedSrc : new URL(nestedSrc, iframeUrl).href;
                }
                console.log(`[PlayImdb] Found nested iframe: ${nestedSrc}`);

                const nestedResp = await fetch(nestedSrc, {
                    headers: { ...HEADERS, "Referer": iframeUrl }
                });
                const nestedHtml = await nestedResp.text();

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
}

module.exports = { getStreams };
