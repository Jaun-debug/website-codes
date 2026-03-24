
import * as cheerio from 'cheerio';
import { extractEmails } from '../utils/extractEmails';

export async function scrapeGoogle(query: string) {
    // Note: Standard Google search blocks simple fetch. We use a fallback proxy or search API (Serper/SerpApi) ideally, 
    // but for this MVP, we scrape Bing instead as a proxy for "Google" or use a DuckDuckGo HTML endpoint to avoid blocks.
    return scrapeBing(query); // Bridged for stability without API keys
}

export async function scrapeBing(query: string) {
    const searchUrl = `https://lite.duckduckgo.com/lite/`;
    
    try {
        const response = await fetch(searchUrl, {
            method: 'POST',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ q: query }).toString()
        });
        
        const html = await response.text();
        const $ = cheerio.load(html);
        const results: any[] = [];
        
        $('tr').each((i, el) => {
            const linkTag = $(el).find('.result-snippet').length > 0 ? null : $(el).find('a[rel="nofollow"]');
            
            if (linkTag && linkTag.length > 0) {
                const url = linkTag.attr('href');
                const title = linkTag.text().trim();
                
                // DDG Lite puts the snippet on the NEXT table row
                const snippetRow = $(el).next();
                const snippet = snippetRow.find('.result-snippet').text().trim() || "";
                
                const emails = extractEmails(snippet);
                
                if (url && !url.includes('duckduckgo.com')) {
                    // duckduckgo proxy bypass
                    let finalLink = url;
                    if(finalLink.includes('uddg=')) {
                        try {
                            finalLink = decodeURIComponent(finalLink.split('uddg=')[1].split('&')[0]);
                        } catch(e) {}
                    }
                    results.push({ title, url: finalLink, emails, snippet });
                }
            }
        });
        
        return results;
    } catch(err) {
        console.error("Lite Duckduckgo scraping error", err);
        return [];
    }
}
