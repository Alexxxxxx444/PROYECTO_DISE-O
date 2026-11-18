<?php
/* ==========================================================================
   Noticias en vivo de unab.edu.co (sitio público de la UNAB)
   --------------------------------------------------------------------------
   1. API REST de WordPress: /wp-json/wp/v2/posts (con búsqueda ?search=)
   2. Si no responde: canal RSS /feed/
   Resultado en caché (php/data/news-*.json) durante NEWS_CACHE_MINUTES.
   Las noticias de MiPortalU requieren iniciar sesión y no se consultan aquí.
   ========================================================================== */

declare(strict_types=1);

function http_get(string $url, int $timeout = 6): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_USERAGENT => 'UNAB-Campus-HL/1.0 (proyecto academico)',
            CURLOPT_HTTPHEADER => ['Accept: application/json, application/rss+xml, */*'],
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($body !== false && $code >= 200 && $code < 300) ? (string) $body : null;
    }
    $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'header' => "User-Agent: UNAB-Campus-HL/1.0\r\n"]]);
    $body = @file_get_contents($url, false, $ctx);
    return $body === false ? null : $body;
}

function clean_text(string $html, int $max = 220): string
{
    $t = trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    $t = preg_replace('/\s*\[(…|&hellip;|\.\.\.)\]\s*$/u', '…', $t);
    return mb_strlen($t) > $max ? rtrim(mb_substr($t, 0, $max - 1)) . '…' : $t;
}

/** Intenta la API REST de WordPress. */
function news_from_wp(string $q): ?array
{
    $url = NEWS_SITE . '/wp-json/wp/v2/posts?per_page=18&_embed=1' . ($q !== '' ? '&search=' . rawurlencode($q) : '');
    $body = http_get($url);
    $json = $body ? json_decode($body, true) : null;
    if (!is_array($json)) return null;
    $items = [];
    foreach ($json as $p) {
        if (!isset($p['link'], $p['title']['rendered'])) continue;
        $img = $p['_embedded']['wp:featuredmedia'][0]['media_details']['sizes']['medium_large']['source_url']
            ?? $p['_embedded']['wp:featuredmedia'][0]['source_url'] ?? null;
        $cat = $p['_embedded']['wp:term'][0][0]['name'] ?? 'UNAB';
        $items[] = [
            'titulo' => clean_text($p['title']['rendered'], 160), 'url' => $p['link'], 'fecha' => substr((string) ($p['date'] ?? ''), 0, 10) ?: null,
            'resumen' => clean_text($p['excerpt']['rendered'] ?? ''), 'imagen' => $img, 'categoria' => clean_text((string) $cat, 40),
        ];
    }
    return $items;
}

/** Alternativa: canal RSS. */
function news_from_rss(string $q): ?array
{
    $body = http_get(NEWS_SITE . '/feed/' . ($q !== '' ? '?s=' . rawurlencode($q) : ''));
    if (!$body) return null;
    $xml = @simplexml_load_string($body, 'SimpleXMLElement', LIBXML_NOCDATA);
    if (!$xml || !isset($xml->channel->item)) return null;
    $items = [];
    foreach ($xml->channel->item as $it) {
        $items[] = [
            'titulo' => clean_text((string) $it->title, 160), 'url' => (string) $it->link,
            'fecha' => ($t = strtotime((string) $it->pubDate)) ? date('Y-m-d', $t) : null,
            'resumen' => clean_text((string) $it->description), 'imagen' => null,
            'categoria' => clean_text((string) ($it->category[0] ?? 'UNAB'), 40),
        ];
    }
    return $items;
}

function fetch_unab_news(string $q): array
{
    $q = mb_substr(trim($q), 0, 60);
    $cacheFile = __DIR__ . '/data/news-' . md5(mb_strtolower($q)) . '.json';
    if (is_file($cacheFile) && filemtime($cacheFile) > time() - NEWS_CACHE_MINUTES * 60) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($cached)) return $cached;
    }
    $items = news_from_wp($q);
    $source = 'wp-json';
    if ($items === null) { $items = news_from_rss($q); $source = 'rss'; }
    if ($items === null) {
        return ['items' => [], 'live' => false, 'source' => null, 'error' => 'No fue posible conectar con unab.edu.co.'];
    }
    $out = ['items' => $items, 'live' => true, 'source' => NEWS_SITE . " ($source)", 'actualizado' => date('c')];
    if (!is_dir(dirname($cacheFile))) @mkdir(dirname($cacheFile), 0775, true);
    @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_UNICODE));
    return $out;
}
