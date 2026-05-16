import cheerio from 'cheerio-without-node-native';
import { AUTOEMBED_API, HEADERS, TMDB_API_KEY } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[AutoEmbed] Fetching streams for ${mediaType} ${tmdbId}`);

    try {
        const imdbId = await getImdbId(tmdbId, mediaType);
        if (!imdbId) {
            console.warn(`[AutoEmbed] Could not resolve IMDB ID for TMDB ${tmdbId}`);
            return [];
        }

        console.log(`[AutoEmbed] Resolved IMDB ID: ${imdbId}`);

        const isMovie = (mediaType !== 'tv' && season == null);
        const url = isMovie
            ? `${AUTOEMBED_API}/embed/movie/${imdbId}`
            : `${AUTOEMBED_API}/embed/tv/${imdbId}/${season}/${episode}`;

        console.log(`[AutoEmbed] Fetching embed page: ${url}`);

        const resp = await fetch(url, { headers: HEADERS });
        const text = await resp.text();

        const embedMatch = text.match(/var\s+embedUrlValue\s*=\s*"([^"]+)";/);
        if (!embedMatch || !embedMatch[1]) {
            console.log(`[AutoEmbed] No embedUrlValue found in page`);
            return [];
        }

        let embedUrl = embedMatch[1];
        if (!embedUrl.startsWith('http')) {
            embedUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : 'https://' + embedUrl;
        }

        console.log(`[AutoEmbed] Extracted embed URL: ${embedUrl}`);

        const streams = await extractFromEmbed(embedUrl);

        console.log(`[AutoEmbed] Returning ${streams.length} streams`);
        return streams;

    } catch (error) {
        console.error(`[AutoEmbed] Error: ${error.message}`);
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

async function extractFromEmbed(embedUrl) {
    try {
        const resp = await fetch(embedUrl, {
            headers: { ...HEADERS, "Referer": AUTOEMBED_API + "/" }
        });
        const html = await resp.text();
        const streams = [];
        const origin = new URL(embedUrl).origin;

        const m3u8Matches = html.match(/(?:file|source|src|url|playlist)\s*[:=]\s*["']([^"']*\.m3u8[^"']*)/gi) || [];
        for (const match of m3u8Matches) {
            const urlMatch = match.match(/["']([^"']*\.m3u8[^"']*)/);
            if (urlMatch && urlMatch[1]) {
                streams.push({
                    name: "AutoEmbed",
                    title: "Adaptive",
                    url: urlMatch[1],
                    quality: "Auto",
                    headers: { "Referer": embedUrl, "Origin": origin, "User-Agent": HEADERS["User-Agent"] },
                    provider: "autoembed"
                });
            }
        }

        const mp4Matches = html.match(/(?:file|source|src|url)\s*[:=]\s*["']([^"']*\.mp4[^"']*)/gi) || [];
        for (const match of mp4Matches) {
            const urlMatch = match.match(/["']([^"']*\.mp4[^"']*)/);
            if (urlMatch && urlMatch[1]) {
                streams.push({
                    name: "AutoEmbed",
                    title: "Direct",
                    url: urlMatch[1],
                    quality: "Auto",
                    headers: { "Referer": embedUrl, "Origin": origin, "User-Agent": HEADERS["User-Agent"] },
                    provider: "autoembed"
                });
            }
        }

        if (streams.length === 0) {
            const $ = cheerio.load(html);
            let nestedSrc = $('iframe').attr('src') || '';
            if (nestedSrc && !nestedSrc.includes('about:blank')) {
                if (!nestedSrc.startsWith('http')) {
                    nestedSrc = nestedSrc.startsWith('//') ? 'https:' + nestedSrc : new URL(nestedSrc, embedUrl).href;
                }
                console.log(`[AutoEmbed] Found nested iframe: ${nestedSrc}`);

                const nestedResp = await fetch(nestedSrc, {
                    headers: { ...HEADERS, "Referer": embedUrl }
                });
                const nestedHtml = await nestedResp.text();
                const nestedOrigin = new URL(nestedSrc).origin;

                const nestedM3u8 = nestedHtml.match(/(?:file|source|src|url|playlist)\s*[:=]\s*["']([^"']*\.m3u8[^"']*)/i);
                if (nestedM3u8 && nestedM3u8[1]) {
                    streams.push({
                        name: "AutoEmbed",
                        title: "Adaptive",
                        url: nestedM3u8[1],
                        quality: "Auto",
                        headers: { "Referer": nestedSrc, "Origin": nestedOrigin, "User-Agent": HEADERS["User-Agent"] },
                        provider: "autoembed"
                    });
                }

                const nestedMp4 = nestedHtml.match(/(?:file|source|src|url)\s*[:=]\s*["']([^"']*\.mp4[^"']*)/i);
                if (nestedMp4 && nestedMp4[1]) {
                    streams.push({
                        name: "AutoEmbed",
                        title: "Direct",
                        url: nestedMp4[1],
                        quality: "Auto",
                        headers: { "Referer": nestedSrc, "Origin": nestedOrigin, "User-Agent": HEADERS["User-Agent"] },
                        provider: "autoembed"
                    });
                }
            }
        }

        return streams;
    } catch (e) {
        console.error(`[AutoEmbed] Embed extraction error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
