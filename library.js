'use strict';

const pluginData = require('./plugin.json');
const nbbId = pluginData.id.replace('nodebb-plugin-', '');

const DEFAULT_LEVELS = [
    { min: 0, name: '[Neophyte]' },
    { min: 5, name: '[Apprentice]' },
    { min: 20, name: '[Pathfinder]' },
    { min: 50, name: '[Seeker]' },
    { min: 100, name: '[Visionary]' },
    { min: 200, name: '[Voyager]' },
    { min: 350, name: '[Adept]' },
    { min: 550, name: '[Hacker]' },
    { min: 800, name: '[Mage]' },
    { min: 1150, name: '[Wizard]' },
    { min: 1550, name: '[Master]' },
    { min: 2050, name: '[Guru]' },
    { min: 2650, name: '[Legend]' },
    { min: 3350, name: '[Guardian]' },
    { min: 4150, name: '[TITAN]' },
    { min: 5050, name: '[SAGE]' },
    { min: 6050, name: '[VANGUARD]' },
    { min: 7150, name: '[ASCENDED]' },
    { min: 8350, name: '[DEITY]' },
    { min: 9650, name: '[MYTHIC]' },
    { min: 11050, name: '[IMMORTAL]' },
];

const DEFAULTS = {
    levels: DEFAULT_LEVELS.map((l) => `${l.min} | ${l.name}`).join('\n'),
    showProgressBar: '1',
    showProgressTip: '1',
};

// memoised parse so a page with 50 posts/users only parses the ladder once
let memo = { key: null, levels: null };

function parseLevels(text) {
    if (!text || !String(text).trim()) {
        return null;
    }
    const parsed = String(text)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split('|').map((p) => p.trim());
            if (parts.length < 2) {
                return null;
            }
            const min = parseInt(parts[0], 10);
            if (isNaN(min) || !parts[1]) {
                return null;
            }
            return { min: min, name: parts[1] };
        })
        .filter(Boolean);
    if (!parsed.length) {
        return null;
    }
    parsed.sort((a, b) => a.min - b.min);
    // de-duplicate identical thresholds, keep the first
    return parsed.filter((lvl, i) => i === 0 || lvl.min !== parsed[i - 1].min);
}

async function getSettings() {
    const Meta = nodebb.require('./src/meta');
    const settings = (await Meta.settings.get(nbbId)) || {};
    return Object.assign({}, DEFAULTS, settings);
}

async function getLevels() {
    const settings = await getSettings();
    const text = settings.levels || '';
    if (memo.key === text) {
        return memo.levels;
    }
    const levels = parseLevels(text) || DEFAULT_LEVELS;
    memo = { key: text, levels: levels };
    return levels;
}

function matchIndex(levels, postcount) {
    let idx = 1;
    for (let i = 0; i < levels.length; i++) {
        if (postcount >= levels[i].min) {
            idx = i + 1;
        }
    }
    return idx;
}

function fmt(n) {
    return Number(n).toLocaleString('en-US');
}

const PROGRESS_FIELDS = ['imrnesProgress', 'imrnesProgressText', 'imrnesNextRank', 'imrnesTip'];

function stripProgress(u) {
    PROGRESS_FIELDS.forEach((f) => { delete u[f]; });
}

// Adds rank + next-level progress info to a single user object.
function enrichUser(u, levels) {
    if (!u || typeof u.postcount === 'undefined' || !u.uid) {
        return u;
    }
    const pc = parseInt(u.postcount, 10) || 0;
    const idx = matchIndex(levels, pc);
    const current = levels[idx - 1];
    const next = levels[idx] || null;

    u.imrnesRank = current.name;
    u.imrnesRankIdx = idx;

    if (next) {
        const span = Math.max(1, next.min - current.min);
        const pct = Math.max(0, Math.min(100, Math.round(((pc - current.min) / span) * 100)));
        u.imrnesProgress = pct;
        u.imrnesProgressText = `${fmt(pc)} / ${fmt(next.min)}`;
        u.imrnesNextRank = next.name;
        u.imrnesTip = `${u.imrnesProgressText} → ${next.name}`;
    } else {
        u.imrnesProgress = 100;
        u.imrnesProgressText = `${fmt(pc)} posts`;
        u.imrnesNextRank = '';
        u.imrnesTip = `${fmt(pc)} posts · top rank reached`;
    }
    return u;
}

function enrichMany(users, levels) {
    users.forEach((u) => enrichUser(u, levels));
    return users;
}

const plugin = {};

plugin.load = async function (params) {
    const routeHelpers = nodebb.require('./src/routes/helpers');
    routeHelpers.setupAdminPageRoute(
        params.router,
        `/admin/plugins/${nbbId}`,
        async function (req, res) {
            const settings = await getSettings();
            const levels = parseLevels(settings.levels) || DEFAULT_LEVELS;
            res.render(`admin/plugins/${nbbId}`, {
                nbbId: nbbId,
                title: 'IMRNES Ranks',
                levelsText: levels.map((l) => `${l.min} | ${l.name}`).join('\n'),
                defaultsText: DEFAULTS.levels,
                levelsList: levels.map((l, i) => ({ min: l.min, name: l.name, idx: i + 1 })),
                showProgressBar: settings.showProgressBar === '1' || settings.showProgressBar === true,
                showProgressTip: settings.showProgressTip === '1' || settings.showProgressTip === true,
            });
        }
    );

    // Public, unauthenticated ladder endpoint.
    //
    // The Discord bridge needs the live ladder so ACP edits propagate without a
    // redeploy. It only holds the NodeBB Write API, not DB access, so it cannot
    // read `settings:imrnes-ranks` itself. This route exposes exactly the parsed
    // levels - no settings, no user data, nothing else.
    //
    // Not a new disclosure: every rendered page already ships the ladder to
    // anonymous browsers inside the badge markup.
    routeHelpers.setupApiRoute(
        params.router,
        'get',
        `/api/${nbbId}/levels`,
        [],
        async function (req, res) {
            const settings = await getSettings();
            const levels = parseLevels(settings.levels) || DEFAULT_LEVELS;
            res.json({
                levels: levels.map(function (l) {
                    return { min: l.min, name: l.name };
                }),
            });
        }
    );
};

// The badge markup lives in Harmony's templates, but nothing ever referenced
// ranks.css, so badges rendered completely unstyled. NodeBB 4.x exposes
// `filter:meta.getLinkTags` (there is no `filter:head.build` any more — it was
// removed, so a plugin registering it loads silently and does nothing), and
// Harmony renders the result via `{{{each linkTags}}}`. Injecting here survives
// theme upgrades, unlike patching the theme.
plugin.getLinkTags = async function (data) {
    if (!Array.isArray(data.links)) {
        data.links = [];
    }
    // `nodebb.config.relative_path` is not public API and is undefined in this
    // hook — reading it threw a TypeError that restart-looped the service. NodeBB
    // renders templates at the root here (every core link tag is root-relative)
    // and this forum is not mounted in a subdirectory, so hardcode the leading
    // slash rather than reaching into internals.
    data.links.push({
        rel: 'stylesheet',
        // Full plugin id: src/routes/index.js maps `/assets` onto `public/`,
        // so the file must live at public/<plugin id>/ranks.css.
        href: `/assets/plugins/${pluginData.id}/ranks.css`,
    });
    return data;
};

plugin.adminMenu = function (customHeader, callback) {
    // src/middleware/render.js fires `filter:admin.header.build` with
    // { plugins: [], authentication: [] } - there is no `menu` array.
    if (!customHeader.plugins) {
        customHeader.plugins = [];
    }
    // admin/partials/navigation.tpl renders `{relative_path}/admin{./route}`,
    // so `route` must be RELATIVE to /admin - a full `/admin/plugins/...` path
    // produces /admin/admin/plugins/... and 404s.
    customHeader.plugins.push({
        route: `/plugins/${nbbId}`,
        icon: 'fa-level-up',
        name: 'IMRNES Ranks',
    });
    callback(null, customHeader);
};

plugin.getFields = function (data, callback) {
    ['imrnesRank', 'imrnesRankIdx'].forEach((f) => {
        if (data.fields.indexOf(f) === -1) {
            data.fields.push(f);
        }
    });
    callback(null, data);
};

// Normalises the ladder on save so a typo in the ACP textarea can never
// brick every badge on the forum.
plugin.settingsSet = async function (data) {
    if (data && data.plugin === nbbId && data.settings && typeof data.settings.levels === 'string') {
        const parsed = parseLevels(data.settings.levels);
        if (parsed) {
            if (parsed[0].min > 0) {
                parsed[0].min = 0;
            }
            data.settings.levels = parsed.map((l) => `${l.min} | ${l.name}`).join('\n');
        }
    }
    return data;
};

plugin.modifyUserInfo = async function (data) {
    // src/posts/user.js fires this hook with the USER OBJECT ITSELF, not {user}
    const u = (data && data.user && typeof data.user.uid !== 'undefined') ? data.user : data;
    if (u && typeof u.postcount !== 'undefined' && u.uid) {
        const levels = await getLevels();
        enrichUser(u, levels);
        if (!(await getSettings()).showProgressTip) {
            stripProgress(u);
        }
        u.selectedGroupTitle = u.imrnesRank;
    }
    return data;
};

plugin.accountProfileBuild = async function (data) {
    const u = (data && (data.templateData || data.userData)) || null;
    if (u && typeof u.postcount !== 'undefined') {
        const levels = await getLevels();
        enrichUser(u, levels);
        if (!(await getSettings()).showProgressBar) {
            stripProgress(u);
        }
    }
    return data;
};

plugin.usersGet = async function (users) {
    if (!Array.isArray(users) || !users.length) {
        return users;
    }
    const levels = await getLevels();
    enrichMany(users, levels);
    if (!(await getSettings()).showProgressTip) {
        users.forEach((u) => u && stripProgress(u));
    }
    return users;
};

// Quote/reply parents and topic-list teasers are loaded with a restricted
// field list (no postcount), so their ranks have to be filled in here with a
// single batched lookup.
plugin.topicsAddPostData = async function (data) {
    const postData = (data && data.posts) || [];
    if (!Array.isArray(postData) || !postData.length) {
        return data;
    }
    const levels = await getLevels();

    const pending = [];
    const seen = new Set();
    postData.forEach((post) => {
        if (!post) {
            return;
        }
        if (post.user && !post.user.imrnesRank && typeof post.user.postcount !== 'undefined') {
            enrichUser(post.user, levels);
        }
        [post.parent && post.parent.user, post.teaser && post.teaser.user].forEach((u) => {
            if (u && u.uid && !u.imrnesRank && !seen.has(u.uid)) {
                seen.add(u.uid);
                pending.push(u);
            }
        });
    });

    if (pending.length) {
        const db = nodebb.require('./src/database');
        const rows = await db.getObjectsFields(pending.map((u) => `user:${u.uid}`), ['postcount']);
        pending.forEach((u, i) => {
            const row = rows[i];
            // the parent user was loaded without `postcount`, so copy it over
            // before enriching - enrichUser() bails out on a missing postcount.
            if (row && typeof row.postcount !== 'undefined') {
                u.postcount = row.postcount;
                enrichUser(u, levels);
            } else {
                delete u.imrnesRank;
                delete u.imrnesRankIdx;
            }
        });
        if (!(await getSettings()).showProgressTip) {
            pending.forEach((u) => stripProgress(u));
        }
    }
    return data;
};

module.exports = plugin;
