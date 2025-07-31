#!/usr/bin/env node
const https = require('https');

const args = process.argv.slice(2);
const showAll = args.includes('--all');
const namesOnly = args.includes('--names-only');
const rcFormat = args.includes('--rc-format');
const versionArg = args.find(arg => !arg.startsWith('--'));

const NODE_INDEX_JSON_URL = 'https://nodejs.org/dist/index.json';

function getJson(url) {
    const https = require('https');

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
            }

            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(raw));
                } catch (err) {
                    reject(new Error(`Failed to parse JSON from ${url}`));
                }
            });
        }).on('error', (err) => {
            reject(new Error(`Request failed: ${err.message}`));
        });
    });
}

function fetchNodeIndexJson() {
    return getJson(NODE_INDEX_JSON_URL);
}


function formatCodename(name) {
    return rcFormat ? `lts/${name.toLowerCase().replace(/\s+/g, '_')}` : name;
}

function printAll(versions) {
    const codenameMap = {};
    for (const v of versions) {
        if (typeof v.lts === 'string') {
            codenameMap[v.version] = v.lts;
        }
    }

    if (namesOnly) {
        const unique = new Set(Object.values(codenameMap));
        for (const name of unique) {
            console.log(formatCodename(name));
        }
    } else {
        for (const [ver, name] of Object.entries(codenameMap)) {
            console.log(`${ver}: ${formatCodename(name)}`);
        }
    }
}

function findMatchingVersion(versions) {
    if (!versionArg || versionArg === 'lts') {
        return versions.find(v => typeof v.lts === 'string');
    }

    if (versionArg === 'latest') {
        const latest = versions.find(() => true);
        return typeof latest?.lts === 'string' ? latest : null;
    }

    if (/^\d+$/.test(versionArg)) {
        return versions.find(v => v.version.startsWith(`v${versionArg}.`) && v.lts);
    }

    if (/^v?\d+\.\d+\.\d+$/.test(versionArg)) {
        const v = versionArg.startsWith('v') ? versionArg : `v${versionArg}`;
        return versions.find(vr => vr.version === v);
    }

    return null;
}

function printSingle(versions) {
    const match = findMatchingVersion(versions);
    if (match && typeof match.lts === 'string') {
        console.log(formatCodename(match.lts));
    } else {
        console.log('No LTS codename found');
    }
}

(async function main() {
    try {
        const versions = await fetchNodeIndexJson();
        showAll ? printAll(versions) : printSingle(versions);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
})();
