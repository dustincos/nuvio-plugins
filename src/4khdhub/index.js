import cheerio from 'cheerio-without-node-native';
import { getLatestDomains, TMDB_API_KEY } from './utils.js';
import { loadExtractor } from './extractors.js';

async function getMediaMetadata(tmdbId, mediaType) {
    try {
        const type = mediaType === 'tv' ? 'tv' : 'movie';
        const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        const data = await res.json();

        const title = mediaType === 'tv' ? data.name : data.title;
        const date = mediaType === 'tv' ? data.first_air_date : data.release_date;
        const year = date ? date.split("-")[0] : "";

        return { title, year };
    } catch (e) {
        return { title: "", year: "" };
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[4Khdhub] Triggering fetch for ID ${tmdbId}`);
    const streams = [];

    try {
        const domains = await getLatestDomains();
        const base4k = domains["4khdhub"] || "https://4khdhub.link";
        const baseHub = domains["hubcloud"] || "https://hubcloud.foo";

        const meta = await getMediaMetadata(tmdbId, mediaType);
        if (!meta.title) return [];

        const searchQuery = encodeURIComponent(meta.title);
        const searchUrl = `${base4k}/?s=${searchQuery}`;
        console.log(`[4Khdhub] Searching: ${searchUrl}`);

        const searchResp = await fetch(searchUrl);
        const searchHtml = await searchResp.text();
        const $search = cheerio.load(searchHtml);

        let detailPageUrl = "";

        $search('div.card-grid > a').each((i, el) => {
            const content = $search(el).find('div.movie-card-content').text().toLowerCase();
            const href = $search(el).attr('href');

            const matchTitle = meta.title ? content.includes(meta.title.toLowerCase()) : true;
            const matchYear = meta.year ? content.includes(meta.year) : true;
            if (matchTitle && matchYear) {
                detailPageUrl = href;
                return false;
            }
        });

        if (!detailPageUrl) {
            console.warn(`[4Khdhub] No local match found for query "${meta.title}".`);
            return [];
        }

        if (!detailPageUrl.startsWith("http")) {
            detailPageUrl = base4k.replace(/\/+$/, '') + "/" + detailPageUrl.replace(/^\/+/, '');
        }

        console.log(`[4Khdhub] Found target details page: ${detailPageUrl}`);

        const pageResp = await fetch(detailPageUrl);
        const pageHtml = await pageResp.text();
        const $page = cheerio.load(pageHtml);

        const linksToProcess = [];

        if (mediaType === 'movie' || season == null) {
            $page('div.download-item a').each((i, el) => {
                const href = $page(el).attr('href');
                if (href) linksToProcess.push(href);
            });
        } else {
            const sStr = String(season).padStart(2, '0');
            const eStr = String(episode).padStart(2, '0');
            const targetTag = `S${sStr}E${eStr}`;

            console.log(`[4Khdhub] Locating specific episode code: ${targetTag}`);

            $page('div.episode-download-item').each((i, el) => {
                const rowHtml = $page(el).html();
                if (rowHtml && rowHtml.includes(targetTag)) {
                    $page(el).find('div.episode-links > a').each((j, linkEl) => {
                        const href = $page(linkEl).attr('href');
                        if (href) linksToProcess.push(href);
                    });
                }
            });
        }

        console.log(`[4Khdhub] Identified ${linksToProcess.length} raw download anchors to follow.`);

        for (let entryUrl of linksToProcess) {
            try {
                console.log(`[DEBUG] Processing anchor: ${entryUrl}`);

                const extracted = await loadExtractor(entryUrl, detailPageUrl);
                if (extracted && extracted.length > 0) {
                    extracted.forEach(link => {
                        const qualityStr = typeof link.quality === 'number' ? `${link.quality}p` : link.quality;
                        const sizeStr = link.size ? `${(link.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : "";
                        const tagsStr = link.tags ? link.tags.trim() : "";
                        
                        const nameParts = [link.server || link.source || "HubCloud", tagsStr].filter(p => p && p.trim() !== "");
                        const titleParts = [qualityStr, sizeStr].filter(p => p && p.trim() !== "");

                        streams.push({
                            name: nameParts.join(" • "),
                            title: titleParts.join(" • "),
                            url: link.url,
                            quality: qualityStr,
                            size: sizeStr,
                            provider: "4khdhub"
                        });
                    });
                }
            } catch (err) {
                console.warn(`[4Khdhub] Skipping single node extraction failure.`);
            }
        }

    } catch (error) {
        console.error(`[4Khdhub] Critical crash during run:`, error.message);
    }

    console.log(`[4Khdhub] Successfully produced ${streams.length} finalized streams.`);
    return streams;
}

module.exports = { getStreams };
