'use strict';

const vscode = require('vscode');
const {
    REF_ATTR_RE,
    THIS_MEMBER_RE,
    THIS_BRACKET_RE,
    ASSERT_REFS_RE,
    ASSERT_ARG_RE,
} = require('./refSymbol');

/**
 * Find all locations of a ref name in the given files.
 * @param {string} name
 * @param {import('vscode').Uri[]} uris
 * @param {{ includeAttr?: boolean, includeMember?: boolean, includeAssert?: boolean }} [opts]
 * @returns {Promise<import('vscode').Location[]>}
 */
async function findInUris(name, uris, opts = {}) {
    const includeAttr = opts.includeAttr !== false;
    const includeMember = opts.includeMember !== false;
    const includeAssert = opts.includeAssert !== false;
    /** @type {import('vscode').Location[]} */
    const locations = [];

    for (const uri of uris) {
        let text;
        try {
            const doc = vscode.workspace.textDocuments.find(
                (d) => d.uri.toString() === uri.toString()
            );
            text = doc
                ? doc.getText()
                : Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        } catch {
            continue;
        }

        const lines = text.split(/\r?\n/);
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            if (includeAttr) {
                pushMatches(locations, uri, lineNum, line, REF_ATTR_RE, (m) =>
                    m[2] === name ? rangeForGroup(m, 2) : null
                );
            }
            if (includeMember) {
                pushMatches(locations, uri, lineNum, line, THIS_MEMBER_RE, (m) =>
                    m[1] === name ? rangeForGroup(m, 1) : null
                );
                pushMatches(locations, uri, lineNum, line, THIS_BRACKET_RE, (m) =>
                    m[2] === name ? rangeForGroup(m, 2) : null
                );
            }
            if (includeAssert) {
                pushAssertMatches(locations, uri, lineNum, line, name);
            }
        }
    }

    return locations;
}

/**
 * Workspace-wide search for a ref name (scoped to NativeCore source folders).
 * @param {string} name
 * @param {import('vscode').Uri} [nearUri]
 * @param {{ includeAttr?: boolean, includeMember?: boolean, includeAssert?: boolean }} [opts]
 */
async function findInWorkspace(name, nearUri, opts = {}) {
    const folder = nearUri
        ? vscode.workspace.getWorkspaceFolder(nearUri)
        : vscode.workspace.workspaceFolders?.[0];

    const include = folder
        ? new vscode.RelativePattern(
              folder,
              '{src/**/*.{html,js,ts,jsx,tsx},**/src/**/*.{html,js,ts,jsx,tsx}}'
          )
        : '**/src/**/*.{html,js,ts,jsx,tsx}';

    const files = await vscode.workspace.findFiles(
        include,
        '{**/node_modules/**,**/.nativecore/**,**/dist/**,**/.git/**}',
        500
    );

    return findInUris(name, files, opts);
}

/**
 * @param {import('vscode').Location[]} locations
 * @param {import('vscode').Uri} uri
 * @param {number} lineNum
 * @param {string} line
 * @param {RegExp} re
 * @param {(m: RegExpExecArray) => { start: number, end: number } | null} pick
 */
function pushMatches(locations, uri, lineNum, line, re, pick) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
        const r = pick(m);
        if (!r) {
            continue;
        }
        locations.push(
            new vscode.Location(uri, new vscode.Range(lineNum, r.start, lineNum, r.end))
        );
    }
}

/**
 * @param {RegExpExecArray} m
 * @param {number} groupIndex
 */
function rangeForGroup(m, groupIndex) {
    const value = m[groupIndex];
    const start = m.index + m[0].indexOf(value);
    return { start, end: start + value.length };
}

/**
 * @param {import('vscode').Location[]} locations
 * @param {import('vscode').Uri} uri
 * @param {number} lineNum
 * @param {string} line
 * @param {string} name
 */
function pushAssertMatches(locations, uri, lineNum, line, name) {
    ASSERT_REFS_RE.lastIndex = 0;
    let call;
    while ((call = ASSERT_REFS_RE.exec(line)) !== null) {
        const args = call[1];
        const argsStart = call.index + call[0].indexOf('(') + 1;
        ASSERT_ARG_RE.lastIndex = 0;
        let arg;
        while ((arg = ASSERT_ARG_RE.exec(args)) !== null) {
            if (arg[2] !== name) {
                continue;
            }
            const start = argsStart + arg.index + 1;
            const end = start + name.length;
            locations.push(
                new vscode.Location(uri, new vscode.Range(lineNum, start, lineNum, end))
            );
        }
    }
}

/**
 * Prefer locations in `preferred` uris; if none, use all.
 * @param {import('vscode').Location[]} locations
 * @param {import('vscode').Uri[]} preferred
 */
function preferUris(locations, preferred) {
    if (!preferred.length || !locations.length) {
        return locations;
    }
    const keys = new Set(preferred.map((u) => u.fsPath.replace(/\\/g, '/').toLowerCase()));
    const filtered = locations.filter((loc) =>
        keys.has(loc.uri.fsPath.replace(/\\/g, '/').toLowerCase())
    );
    return filtered.length ? filtered : locations;
}

/**
 * Deduplicate locations.
 * @param {import('vscode').Location[]} locations
 */
function uniqueLocations(locations) {
    const seen = new Set();
    /** @type {import('vscode').Location[]} */
    const out = [];
    for (const loc of locations) {
        const k = `${loc.uri.fsPath}|${loc.range.start.line}|${loc.range.start.character}|${loc.range.end.character}`;
        if (seen.has(k)) {
            continue;
        }
        seen.add(k);
        out.push(loc);
    }
    return out;
}

module.exports = {
    findInUris,
    findInWorkspace,
    preferUris,
    uniqueLocations,
};
