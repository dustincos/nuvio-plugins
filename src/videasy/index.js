import { VIDEASY_API, DECRYPT_API, HEADERS, SERVERS } from './constants.js';
import { getMediaDetails, doubleEncode, capitalizeServer, getIndexQuality } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[Videasy] Fetching streams for ${mediaType} ${tmdbId}`);

    try {
        const media = await getMediaDetails(tmdbId, mediaType);
        if (!media.title) {
            console.warn(`[Videasy] Could not resolve title for TMDB ID ${tmdbId}`);
            return [];
        }

        console.log(`[Videasy] Resolved: "${media.title}" (${media.year})`);

        const encTitle = doubleEncode(media.title);
        const isMovie = (mediaType !== 'tv' && season == null);

        const serverPromises = SERVERS.map(server =>
            fetchFromServer(server, encTitle, isMovie, media, tmdbId, season, episode)
                .catch(() => [])
        );

        const results = await Promise.all(serverPromises);

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
}

async function fetchFromServer(server, encTitle, isMovie, media, tmdbId, season, episode) {
    try {
        const url = isMovie
            ? `${VIDEASY_API}/${server}/sources-with-title?title=${encTitle}&mediaType=movie&year=${media.year}&tmdbId=${tmdbId}&imdbId=${media.imdbId}`
            : `${VIDEASY_API}/${server}/sources-with-title?title=${encTitle}&mediaType=tv&year=${media.year}&tmdbId=${tmdbId}&episodeId=${episode}&seasonId=${season}&imdbId=${media.imdbId}`;

        const encResp = await fetch(url, { headers: HEADERS });
        const encData = await encResp.text();

        if (!encData || encData.trim() === '') return [];

        const decResp = await fetch(`${DECRYPT_API}/dec-videasy`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "User-Agent": HEADERS["User-Agent"]
            },
            body: JSON.stringify({ text: encData, id: tmdbId })
        });

        if (!decResp.ok) return [];

        const decJson = await decResp.json();
        const result = decJson.result;
        if (!result || !result.sources) return [];

        const streams = [];
        const sourcesArray = Array.isArray(result.sources) ? result.sources : [];
        const serverLabel = capitalizeServer(server);

        for (const src of sourcesArray) {
            const sourceUrl = src.url;
            if (!sourceUrl) continue;

            const quality = src.quality || "Auto";
            const qualityLabel = getIndexQuality(quality);

            streams.push({
                name: `Videasy [${serverLabel}]`,
                title: `${qualityLabel}`,
                url: sourceUrl,
                quality: qualityLabel,
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
}

module.exports = { getStreams };
