import * as cheerio from 'cheerio';
import http from 'http';
import { ProxyAgent } from 'undici';

const proxyAgent = new ProxyAgent('http://wofaecmj:twvt6ktgsoyy@38.154.203.95:5863/');

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG UTILITY
// ─────────────────────────────────────────────────────────────────────────────
const DEBUG = process.env.DEBUG !== 'false';

function debugLog(context, message, data = null) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  let logMsg = `[DEBUG] [${timestamp}] [${context}] ${message}`;
  if (data) {
    if (data instanceof Error) {
      logMsg += `\nError Stack: ${data.stack || data.message}`;
    } else {
      logMsg += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
  }
  console.log(logMsg);
}

const _0xc2e = ["", "split", "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/", "slice", "indexOf", "", "", ".", "pow", "reduce", "reverse", "0"];

function _0xe89c(sd, aR, bN) {
  var g = _0xc2e[2][_0xc2e[1]](_0xc2e[0]);
  var h = g[_0xc2e[3]](0, aR);
  var i = g[_0xc2e[3]](0, bN);
  var j = sd[_0xc2e[1]](_0xc2e[0])[_0xc2e[10]]()[_0xc2e[9]](function (zj, wt, Ih) {
    if (h[_0xc2e[4]](wt) !== -1) return zj += h[_0xc2e[4]](wt) * (Math[_0xc2e[8]](aR, Ih))
  }, 0);
  var k = _0xc2e[0];
  while (j > 0) {
    k = i[j % bN] + k;
    j = (j - (j % bN)) / bN
  }
  return k || _0xc2e[11]
}

function decodeKwik(ew, Lx, UC, OA, cF, ao) {
  ao = "";
  for (var i = 0, len = ew.length; i < len; i++) {
    var s = "";
    while (ew[i] !== UC[cF]) {
      s += ew[i];
      i++
    }
    for (var j = 0; j < UC.length; j++) s = s.replace(new RegExp(UC[j], "g"), j);
    ao += String.fromCharCode(_0xe89c(s, cF, 10) - OA)
  }
  return decodeURIComponent(escape(ao))
}

function decodePacker(p, a, c, k, e, d) {
  e = function (c) {
    return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
  };
  if (!''.replace(/^/, String)) {
    while (c--) {
      d[e(c)] = k[c] || e(c)
    }
    k = [function (e_arg) {
      return d[e_arg]
    }];
    e = function () {
      return '\\w+'
    };
    c = 1
  }
  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c])
    }
  }
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// RETRY UTILITY
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    maxAttempts = 4,
    baseDelay   = 800,
    maxDelay    = 8000,
    retryOn     = [503, 429, 502, 504],
    onRetry     = null,
  } = retryOptions;

  const { useProxy = true, ...fetchOptions } = options;
  if (useProxy && proxyAgent) {
    fetchOptions.dispatcher = proxyAgent;
  }

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      debugLog('fetchWithRetry', `Attempt ${attempt}/${maxAttempts} for ${url} (useProxy: ${useProxy})`);
      const response = await fetch(url, fetchOptions);

      if (!retryOn.includes(response.status)) {
        debugLog('fetchWithRetry', `Response status ${response.status} (no retry needed) for ${url}`);
        return response;
      }

      const retryAfterHeader = response.headers.get('Retry-After');
      let delay;
      if (retryAfterHeader) {
        const retryAfterSec = parseFloat(retryAfterHeader);
        delay = isNaN(retryAfterSec)
          ? Math.min(baseDelay * 2 ** (attempt - 1), maxDelay)
          : Math.min(retryAfterSec * 1000, maxDelay);
      } else {
        const exponential = baseDelay * 2 ** (attempt - 1);
        const jitter = exponential * 0.1 * (Math.random() * 2 - 1);
        delay = Math.min(exponential + jitter, maxDelay);
      }

      debugLog('fetchWithRetry', `Retry-triggering status ${response.status} for ${url}. Delaying ${delay}ms before next attempt.`);
      if (onRetry) onRetry(attempt, response.status, url);

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delay));
      } else {
        debugLog('fetchWithRetry', `Max attempts reached with status ${response.status} for ${url}`);
        return response;
      }
    } catch (err) {
      lastError = err;
      debugLog('fetchWithRetry', `Error on attempt ${attempt}/${maxAttempts} for ${url}`, err);
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error(`fetchWithRetry: all ${maxAttempts} attempts failed for ${url}`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function getKwikM3u8FromEmbed(embedUrl, cookies, browserUA, useProxy = true) {
  debugLog('getKwikM3u8FromEmbed', `Starting extraction for ${embedUrl} (useProxy: ${useProxy})`);
  try {
    const response = await fetchWithRetry(embedUrl, {
      useProxy,
      headers: {
        'referer': 'https://animepahe.pw/',
        'cookie': cookies,
        'user-agent': browserUA
      }
    });
    const html = await response.text();
    debugLog('getKwikM3u8FromEmbed', `Fetched HTML length: ${html.length}`);
    const evals = html.match(/eval\(function\(p,a,c,k,e,d\).+?\}\('.+?',\d+,\d+,\s*'.+?'\.split\('\|'\)/g);

    if (evals && evals.length > 0) {
      const lastEval = evals[evals.length - 1];
      debugLog('getKwikM3u8FromEmbed', `Found ${evals.length} eval scripts. Decoding last eval.`);
      const match = lastEval.match(/eval\(function\(p,a,c,k,e,d\).+?\}\('(.+?)',(\d+),(\d+),\s*'(.+?)'\.split\('\|'\)/);

      if (match) {
        const p = match[1];
        const a = parseInt(match[2]);
        const c = parseInt(match[3]);
        const k = match[4].split('|');
        const decoded = decodePacker(p, a, c, k, null, {});
        debugLog('getKwikM3u8FromEmbed', `Decoded packer script successfully.`);

        const sourceMatch = decoded.match(/source='(.+?)'/);
        const qMatch1 = decoded.match(/let q='(.+?)'/);
        const qMatch2 = decoded.match(/var q='(.+?)'/);
        const qMatch3 = decoded.match(/const q='(.+?)'/);
        const genericMatch = decoded.match(/https:\/\/[^'"]+\.m3u8/);

        if (sourceMatch) {
          debugLog('getKwikM3u8FromEmbed', `Found sourceMatch: ${sourceMatch[1]}`);
          return sourceMatch[1];
        }
        if (qMatch1) {
          debugLog('getKwikM3u8FromEmbed', `Found qMatch1: ${qMatch1[1]}`);
          return qMatch1[1];
        }
        if (qMatch2) {
          debugLog('getKwikM3u8FromEmbed', `Found qMatch2: ${qMatch2[1]}`);
          return qMatch2[1];
        }
        if (qMatch3) {
          debugLog('getKwikM3u8FromEmbed', `Found qMatch3: ${qMatch3[1]}`);
          return qMatch3[1];
        }
        if (genericMatch) {
          debugLog('getKwikM3u8FromEmbed', `Found genericMatch: ${genericMatch[0]}`);
          return genericMatch[0];
        }
        debugLog('getKwikM3u8FromEmbed', `No m3u8 pattern matched in decoded script`, decoded);
      } else {
        debugLog('getKwikM3u8FromEmbed', `eval matches found but match regex failed on last eval script: ${lastEval}`);
      }
    } else {
      debugLog('getKwikM3u8FromEmbed', `No packed eval script matches found in embed page HTML`);
    }
  } catch (e) {
    debugLog('getKwikM3u8FromEmbed', `Exception occurred`, e);
    // Fallback logic take over
  }
  return null;
}

async function getKwikMp4(kwikUrl, cookies, browserUA, useProxy = true, attempt = 1) {
  const MAX_RETRIES = 3;
  debugLog('getKwikMp4', `Attempt ${attempt}/${MAX_RETRIES} for ${kwikUrl} (useProxy: ${useProxy})`);
  try {
    const response = await fetchWithRetry(kwikUrl, {
      useProxy,
      headers: {
        'referer': 'https://pahe.win/',
        'user-agent': browserUA,
        'cookie': cookies,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="148", "Brave";v="148", "Not/A)Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-platform-version': '"19.0.0"',
        'sec-ch-ua-arch': '"x86"',
        'sec-ch-ua-bitness': '"64"',
        'sec-ch-ua-full-version-list': '"Chromium";v="148.0.0.0", "Brave";v="148.0.0.0", "Not/A)Brand";v="99.0.0.0"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'sec-gpc': '1',
        'upgrade-insecure-requests': '1'
      }
    }, { maxAttempts: 3, baseDelay: 800 });

    const html = await response.text();
    debugLog('getKwikMp4', `Fetched HTML length: ${html.length}`);

    if (html.length < 100 || html.includes('Just a moment')) {
      debugLog('getKwikMp4', `Cloudflare challenge or empty response detected for ${kwikUrl}`);
      if (useProxy) {
        debugLog('getKwikMp4', `Retrying WITHOUT proxy...`);
        return getKwikMp4(kwikUrl, cookies, browserUA, false, 1);
      }
      if (attempt < MAX_RETRIES) {
        debugLog('getKwikMp4', `Retrying in ${1000 * attempt}ms...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        return getKwikMp4(kwikUrl, cookies, browserUA, useProxy, attempt + 1);
      }
      debugLog('getKwikMp4', `Max retries exceeded after Cloudflare check failed`);
      return null;
    }

    const $ = cheerio.load(html);
    let script = $('script').filter((i, el) => $(el).text().includes('eval')).text();
    
    if (!script) {
      script = $('script').filter((i, el) => {
        const text = $(el).text();
        return text.includes('function') && text.includes('fromCharCode');
      }).text();
    }

    if (!script) {
      debugLog('getKwikMp4', `No script containing eval/fromCharCode found`);
      if (attempt < MAX_RETRIES) {
        debugLog('getKwikMp4', `Retrying in ${1000 * attempt}ms...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        return getKwikMp4(kwikUrl, cookies, browserUA, attempt + 1);
      }
      return null;
    }

    let match = script.match(/\("(.+?)",(\d+),"(.+?)",(\d+),(\d+),(\d+)\)/);
    if (!match) {
      match = script.match(/\('(.+?)',(\d+),'(.+?)',(\d+),(\d+),(\d+)\)/);
    }

    let embedUrl = null;

    if (match) {
      debugLog('getKwikMp4', `Script matched Packer format`);
      const decoded = decodeKwik(match[1], parseInt(match[2]), match[3], parseInt(match[4]), parseInt(match[5]), parseInt(match[6]));
      debugLog('getKwikMp4', `Decoded script length: ${decoded.length}`);
      
      const tokenMatch = decoded.match(/value="([^"]+)"/);
      const actionMatch = decoded.match(/action="([^"]+)"/);

      const embedMatch = decoded.match(/https:\/\/kwik\.[a-z]{2,6}\/e\/[a-zA-Z0-9]+/);
      if (embedMatch) {
        embedUrl = embedMatch[0];
      } else {
        const embedIdMatch = decoded.match(/\/e\/([a-zA-Z0-9]+)/);
        if (embedIdMatch) embedUrl = `https://kwik.cx/e/${embedIdMatch[1]}`;
      }
      debugLog('getKwikMp4', `Extracted embedUrl: ${embedUrl}`);

      let mp4Promise = Promise.resolve(null);
      if (tokenMatch && actionMatch) {
        const token = tokenMatch[1];
        const action = actionMatch[1];
        debugLog('getKwikMp4', `Found token and action URL: ${action}`);

        let newCookies = [];
        if (typeof response.headers.getSetCookie === 'function') {
          newCookies = response.headers.getSetCookie();
        } else {
          const raw = response.headers.get('set-cookie');
          if (raw) newCookies = raw.split(',').map(c => c.trim());
        }
        const setCookiesStr = newCookies.map(c => c.split(';')[0]).join('; ');
        const combinedCookies = [cookies, setCookiesStr].filter(Boolean).join('; ');

        mp4Promise = fetchWithRetry(action, {
          useProxy,
          method: 'POST',
          headers: {
            'referer': kwikUrl,
            'origin': new URL(kwikUrl).origin,
            'cookie': combinedCookies,
            'user-agent': browserUA,
            'content-type': 'application/x-www-form-urlencoded',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'sec-ch-ua': '"Chromium";v="148", "Brave";v="148", "Not/A)Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"19.0.0"',
            'sec-ch-ua-arch': '"x86"',
            'sec-ch-ua-bitness': '"64"',
            'sec-ch-ua-full-version-list': '"Chromium";v="148.0.0.0", "Brave";v="148.0.0.0", "Not/A)Brand";v="99.0.0.0"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'sec-gpc': '1',
            'upgrade-insecure-requests': '1'
          },
          body: `_token=${token}`,
          redirect: 'manual'
        }, { maxAttempts: 3, baseDelay: 600 }).then(async (postRes) => {
          debugLog('getKwikMp4', `POST action response status: ${postRes.status}`);
          if (postRes.status >= 300 && postRes.status < 400) {
            const loc = postRes.headers.get('location');
            debugLog('getKwikMp4', `Redirect location: ${loc}`);
            return loc;
          } else if (postRes.status === 200) {
            const body = await postRes.text();
            const urlMatch = body.match(/https:\/\/[^\s"'<]+\.mp4[^\s"'<]*/);
            debugLog('getKwikMp4', `POST 200 body mp4 match: ${urlMatch ? urlMatch[0] : 'none'}`);
            if (urlMatch) return urlMatch[0];
          }
          return null;
        }).catch((err) => {
          debugLog('getKwikMp4', `POST action failed with error`, err);
          return null;
        });
      } else {
        debugLog('getKwikMp4', `No token or action match in decoded script`);
      }

      let m3u8Promise = Promise.resolve(null);
      if (embedUrl) {
        m3u8Promise = getKwikM3u8FromEmbed(embedUrl, cookies, browserUA, useProxy);
      }

      const [mp4Url, m3u8Url] = await Promise.all([mp4Promise, m3u8Promise]);
      debugLog('getKwikMp4', `mp4Url: ${mp4Url}, m3u8Url: ${m3u8Url}`);

      if (mp4Url || embedUrl) {
        return { mp4Url, embedUrl, m3u8Url };
      }
    } else {
      debugLog('getKwikMp4', `Failed to match Packer script details regex`);
    }

    if (attempt < MAX_RETRIES) {
      debugLog('getKwikMp4', `Retrying in ${1000 * attempt}ms...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return getKwikMp4(kwikUrl, cookies, browserUA, useProxy, attempt + 1);
    }
    return null;
  } catch (error) {
    debugLog('getKwikMp4', `Catch block caught error (attempt ${attempt}/${MAX_RETRIES})`, error);
    if (useProxy) {
      debugLog('getKwikMp4', `Retrying WITHOUT proxy...`);
      return getKwikMp4(kwikUrl, cookies, browserUA, false, 1);
    }
    if (attempt < MAX_RETRIES) {
      debugLog('getKwikMp4', `Retrying in ${1000 * attempt}ms...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return getKwikMp4(kwikUrl, cookies, browserUA, useProxy, attempt + 1);
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE.JS HTTP SERVER
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Helper function to match standard Cloudflare Worker Response outputs
  const sendJSON = (status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(payload, null, 2));
  };

  const browserUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';
  
  // Parse URL inside standard Node.js routing
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const animeSession = reqUrl.searchParams.get('animeId');
  const episodeSession = reqUrl.searchParams.get('episodeId');
  const isDebugRequested = reqUrl.searchParams.get('debug') === 'true';

  debugLog('HTTP_SERVER', `Received request: ${req.method} ${req.url}`);

  if (!animeSession || !episodeSession) {
    debugLog('HTTP_SERVER', `Bad request: missing animeId or episodeId`);
    return sendJSON(400, {
      developer: "arcane",
      success: false,
      status: 400,
      error: "Missing required query parameters. Please provide both ?animeId=... and &episodeId=..."
    });
  }

  const playUrl = `https://animepahe.pw/play/${animeSession}/${episodeSession}`;

  const paramCfClearance = reqUrl.searchParams.get('cf_clearance');
  const paramKwikSession = reqUrl.searchParams.get('kwik_session');
  const paramLaravelSession = reqUrl.searchParams.get('laravel_session');
  const paramXsrfToken = reqUrl.searchParams.get('xsrf_token');

  const cookies = [
    '__ddgid_=148tXAGIQMh06JSU',
    '__ddgmark_=Us4VULhW1RHETaxT',
    '__ddg2_=n6Uql1Ljt40is35Y',
    '__ddg1_=x7Rg2KgWlEz9wBpGt4VY',
    'res=1080',
    'aud=jpn',
    'av1=0',
    'latest=6553',
    '__ddg9_=46.203.46.10',
    '__ddg8_=IQjImJknFEKlngWI',
    '__ddg10_=1775545826',
    `XSRF-TOKEN=${paramXsrfToken || 'eyJpdiI6InJiL2NPQ1ZxekVMNzhnMUYrcUNjb3c9PSIsInZhbHVlIjoiZG1LcXloNnJLTTgrc2M2V05wbTgrL0c5VUx3elRMZWpNSnBSWUtkZ2FnSTF1NlZ2R1hWS2REV01rMG1mWFFFbytuczNFK3J1MlV3ZU1iYnoxczM3MWpWejBJRXZUQktIU1VtckNpZktiUndsSkRMcnB6M3JMb2g5bVU4ay8zZksiLCJtYWMiOiJhZTI5ODA2YzkyOTZmYzEyYTRmZGY1ZWQ2NmQ4ODkzN2VlOWMxMWRhYTIwMjE2ZjI2N2IyMzg4NDNmNGM1ZDA1IiwidGFnIjoiIn0%3D'}`,
    `laravel_session=${paramLaravelSession || 'eyJpdiI6IlVuSitTdGJFTlVkdUgzQVRkVCtINUE9PSIsInZhbHVlIjoidlNjTVdXZXNidGg0TVp3YmpGUVgvZ0dGMHhrb3RCcTZkZXhYK3diR0FtcmthZ1d1WHV3c2NLU3hhWVl1WDBpQ0tyUkg4d3pXQjl1bW0rZGUyTVgrTjNZWHFzd0hlK2VFNllPbUl1RVBUWis0b0dObC9qWXpmb3ozT0h4NURxU2MiLCJtYWMiOiI1ZWQ4MWYzZTJjZjIwMThhNDk2NTFlMDUxMzE5OGI5YzgwMzE4MTc5ZDEzNmQxYWRhNzhiZDVkN2UzNDQ0MGFiIiwidGFnIjoiIn0%3D'}`
  ].join('; ');

  const kwikCookies = [
    'cf_chl_rc_ni=1',
    'srv=s0',
    'pp_main_4e5e04716f26fd21bf611637f4fb8a46=1',
    'pp_exp_4e5e04716f26fd21bf611637f4fb8a46=1780270429299',
    `kwik_session=${paramKwikSession || 'eyJpdiI6InFVeDdCMThTMjFIcU5DS0xwaCthU3c9PSIsInZhbHVlIjoidZEtBcGxBWGUvYkVNSlNQYUtZRDg4WXZmbytXaC81TnVremVLRFVBaFNXbzdERjRINkdTakZRdXJYNllxWlF1MkhJKzh5VGZwY1BtVlNqMlhmc1V2RnNIekcxeWhveUltSGx3anpodzJxNTJDTEZReDR1UVRQTG9DbVRtWitvRVEiLCJtYWMiOiIxOGIwOGUyMjg0ZmZiNGU1YTU3ZmMwZTA2NTc3N2I4MmY3OTk2ZjI4M2ZkMGI1NjlkNTkxNDJlN2IwYTVkYWMxIiwidGFnIjoiIn0%3D'}`,
    'pp_show_on_4e5e04716f26fd21bf611637f4fb8a46=1',
    `cf_clearance=${paramCfClearance || 'utaLIKGn.5ubqQDAA2afrLN2n3YLLBnjwYNnb99k8P4-1780266829-1.2.1.1-cbCMsle7D8hhdofjsJRYZ0ErAz3re0Pk6AEKfJ_wwjRNvr89d2EuorNZd48lNGVLftrHDUgSBUC1g1hhbbbSyIMoYZLjy3PjEXP9WVi8naWReGrsI4aaiuvY5.rPho6KVTjWJLtE9bTLiRU2T8MsZQhjFDs.W70Ln9gU8WCKTWv0iZ97R_AjAZK8xzw_z5es4TOdiQgPsL3LYahw0pRdn.TDgS1gF36ErAxC7.u9E7hAalYoIavOXbF8Vh6NKaLVwwzxGWBd.Xzin_4Iu9YlcWvUoae_HeY.FyZ4U_SECyf3AWx5D_WA97Yx2Yfyds_DHfYu0jKOyMWiJApYl.AX216eGEnRrLTzMcKPkgiBtPH2VqDGSLhG503OxA1OIEPqiNGvpO.7nycj9pOnyCSdr8t5uZDh1PkA335MRahXLdE'}`
  ].join('; ');

  const commonHeaders = {
    'accept-language': 'en-US,en;q=0.9',
    'cookie': cookies,
    'referer': 'https://animepahe.pw/',
    'user-agent': browserUA
  };

  try {
    let resFetch;
    try {
      debugLog('HTTP_SERVER', `Fetching playUrl: ${playUrl} (with proxy)`);
      resFetch = await fetchWithRetry(playUrl, { headers: commonHeaders, useProxy: true }, {
        maxAttempts: 2,
        baseDelay: 1000,
      });
      if (!resFetch.ok) throw new Error(`HTTP ${resFetch.status}`);
    } catch (e) {
      debugLog('HTTP_SERVER', `Failed to fetch playUrl with proxy. Retrying WITHOUT proxy... Error: ${e.message}`);
      resFetch = await fetchWithRetry(playUrl, { headers: commonHeaders, useProxy: false }, {
        maxAttempts: 3,
        baseDelay: 1000,
      });
    }

    if (!resFetch.ok) {
      debugLog('HTTP_SERVER', `Failed to fetch playUrl. Status: ${resFetch.status}`);
      return sendJSON(resFetch.status, {
        developer: "arcane",
        success: false,
        status: resFetch.status,
        error: `Upstream returned HTTP ${resFetch.status} after all retry attempts`
      });
    }

    const html = await resFetch.text();
    debugLog('HTTP_SERVER', `Fetched playUrl HTML length: ${html.length}`);
    const $ = cheerio.load(html);

    const downloadLinks = [];
    const dropdownItems = $('#downloadMenu .dropdown-item');
    debugLog('HTTP_SERVER', `Found ${dropdownItems.length} elements matching '#downloadMenu .dropdown-item'`);

    dropdownItems.each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      const href = $el.attr('href');
      const resolutionMatch = text.match(/(\d{3,4}p)/);
      const sizeMatch = text.match(/\((\d+(?:\.\d+)?\s*[KMG]B)\)/i);
      const isEng = $el.find('.badge-warning').text().trim().toLowerCase() === 'eng' || text.toLowerCase().includes(' eng');

      downloadLinks.push({
        resolution: resolutionMatch ? resolutionMatch[1] : null,
        size: sizeMatch ? sizeMatch[1] : null,
        audio: isEng ? 'eng' : 'jpn',
        url: href
      });
    });

    if (downloadLinks.length === 0) {
      debugLog('HTTP_SERVER', `No dropdown links found. Searching all links for pahe/kwik references.`);
      $('a').each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        if (href && (href.includes('pahe.win') || href.includes('kwik.si') || href.includes('kwik.cx') || href.includes('kwik.'))) {
          const text = $el.text().trim();
          const resolutionMatch = text.match(/(\d{3,4}p)/);
          const sizeMatch = text.match(/\((\d+(?:\.\d+)?\s*[KMG]B)\)/i);
          const isEng = text.toLowerCase().includes(' eng');

          downloadLinks.push({
            resolution: resolutionMatch ? resolutionMatch[1] : null,
            size: sizeMatch ? sizeMatch[1] : null,
            audio: isEng ? 'eng' : 'jpn',
            url: href
          });
        }
      });
    }

    debugLog('HTTP_SERVER', `Total download links collected to process: ${downloadLinks.length}`);

    const fetchKwikAndMp4 = async (link) => {
      debugLog('fetchKwikAndMp4', `Processing download link: ${link.url}`);
      try {
        let paheRes;
        try {
          paheRes = await fetchWithRetry(link.url, {
            useProxy: true,
            headers: {
              'cookie': cookies,
              'referer': 'https://animepahe.pw/',
              'user-agent': browserUA
            },
            redirect: 'follow'
          }, { maxAttempts: 2, baseDelay: 800 });
          if (!paheRes.ok) throw new Error(`HTTP ${paheRes.status}`);
        } catch (e) {
          debugLog('fetchKwikAndMp4', `Failed to fetch link with proxy. Retrying WITHOUT proxy... Error: ${e.message}`);
          paheRes = await fetchWithRetry(link.url, {
            useProxy: false,
            headers: {
              'cookie': cookies,
              'referer': 'https://animepahe.pw/',
              'user-agent': browserUA
            },
            redirect: 'follow'
          }, { maxAttempts: 3, baseDelay: 800 });
        }

        const paheHtml = await paheRes.text();
        const kwikMatch = paheHtml.match(/https:\/\/kwik\.[a-z]{2,6}\/f\/[a-zA-Z0-9]+/);
        let kwikUrl = null;

        if (kwikMatch) {
          kwikUrl = kwikMatch[0];
          debugLog('fetchKwikAndMp4', `Extracted kwikUrl from paheHtml regex: ${kwikUrl}`);
        } else if (paheRes.url && /kwik\.[a-z]{2,6}\/f\//.test(paheRes.url)) {
          kwikUrl = paheRes.url;
          debugLog('fetchKwikAndMp4', `Using final redirected paheRes URL as kwikUrl: ${kwikUrl}`);
        }

        if (kwikUrl) {
          const kwikData = await getKwikMp4(kwikUrl, kwikCookies, browserUA, true);

          if (kwikData) {
            let m3u8Url = kwikData.m3u8Url;
            let extractionMethod = m3u8Url ? 'embed_scrape' : 'guess_fallback';

            if (!m3u8Url && kwikData.mp4Url) {
              m3u8Url = kwikData.mp4Url.replace('/mp4/', '/stream/').replace('/get/', '/stream/').split('?')[0] + '/uwu.m3u8';
              debugLog('fetchKwikAndMp4', `Fallback guessed m3u8Url: ${m3u8Url}`);
            }

            return {
              resolution: link.resolution,
              size: link.size,
              audio: link.audio,
              mp4Url: kwikData.mp4Url,
              m3u8Url: m3u8Url,
              embedUrl: kwikData.embedUrl,
              method: extractionMethod
            };
          } else {
            debugLog('fetchKwikAndMp4', `getKwikMp4 returned null for ${kwikUrl}`);
          }
        } else {
          debugLog('fetchKwikAndMp4', `No kwikUrl found or matched for link: ${link.url}`);
        }

        return { resolution: link.resolution, size: link.size, audio: link.audio, mp4Url: null, m3u8Url: null, embedUrl: null, method: 'failed' };
      } catch (err) {
        debugLog('fetchKwikAndMp4', `Exception handling download link ${link.url}`, err);
        return { resolution: link.resolution, size: link.size, audio: link.audio, mp4Url: null, m3u8Url: null, embedUrl: null, method: 'error' };
      }
    };

    const finalLinks = await Promise.all(downloadLinks.map(fetchKwikAndMp4));
    debugLog('HTTP_SERVER', `Completed processing all links. Results count: ${finalLinks.length}`);

    return sendJSON(200, {
      developer: "arcane",
      success: true,
      status: 200,
      results: {
        referer: 'https://kwik.cx/',
        downloadLinks: finalLinks
      }
    });

  } catch (error) {
    debugLog('HTTP_SERVER', `Unhandled exception in main request handler`, error);
    const errorResponse = {
      developer: "arcane",
      success: false,
      status: 500,
      error: error.message
    };
    if (isDebugRequested || DEBUG) {
      errorResponse.stack = error.stack;
    }
    return sendJSON(500, errorResponse);
  }
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});