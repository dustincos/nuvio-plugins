import { VIDLINK_API, DECRYPT_API, HEADERS } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[Vidlink] Fetching streams for ${mediaType} ${tmdbId}`);

    try {
        const encUrl = `${DECRYPT_API}/enc-vidlink?text=${tmdbId}`;
        const encResp = await fetch(encUrl);
        const encJson = await encResp.json();
        const encData = encJson.result;

        if (!encData) {
            console.log(`[Vidlink] No encrypted ID returned`);
            return [];
        }

        const isMovie = (mediaType !== 'tv' && season == null);
        const epUrl = isMovie
            ? `${VIDLINK_API}/api/b/movie/${encData}`
            : `${VIDLINK_API}/api/b/tv/${encData}/${season}/${episode}`;

        console.log(`[Vidlink] Fetching playlist from: ${epUrl}`);

        const epResp = await fetch(epUrl, { headers: HEADERS });
        const epJson = await epResp.json();

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
}

module.exports = { getStreams };
