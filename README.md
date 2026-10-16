# nodebb-plugin-imrnes-ranks

Custom NodeBB plugin for imrnes.team: rank titles derived from a user's post
count, rendered as a coloured badge next to the username, plus an optional
next-level progress bar on the profile page.

The ladder itself is editable in the ACP under **Plugins → IMRNES Ranks** as a
simple `min | name` ladder. Edits are validated on save (the first level is
forced to `0`) so a typo cannot brick every badge on the forum.

## Ladder is read at runtime, not baked in

`GET /api/imrnes-ranks/levels` is public and returns the live ladder:

```
{"levels":[{"min":0,"name":"[Neophyte]"},{"min":3,"name":"[Apprentice]"}, ...]}
```

Do not treat `DEFAULT_LEVELS` in `library.js` as the source of truth — it is
only the fallback used before any ACP save. Always read the endpoint if you
need the current thresholds.

## Installation

The plugin is installed with a `file:` dependency plus a symlink into
`node_modules`; there is no `.nodebb-plugin-*` shadow copy.

```bash
# in the NodeBB checkout
ln -s /opt/nodebb/plugins/ranks-plugin node_modules/nodebb-plugin-imrnes-ranks
# then add to package.json:
#   "nodebb-plugin-imrnes-ranks": "file:/opt/nodebb/plugins/ranks-plugin"
```

After any change, rebuild the theme:

```bash
sudo -u nodebb ./nodebb build theme
systemctl restart nodebb
```

Run the build as the user that owns `build/` (`nodebb`). Building as another
user fails with `EACCES: permission denied, open 'build/active_plugins.json'`.

## Theme patches — read this before upgrading NodeBB

`src/views/partials/topic/post-parent.tpl` is patched upstream-style: the badge
markup for quoted parents lives in NodeBB core, not in the theme, so it cannot
be injected through a hook. `patch_parent.js` performs that edit and is
idempotent.

The other three scripts (`patch_hdr.js`, `patch_post.js`, `patch_users.js`)
patch **Harmony theme** templates. They hardcode absolute paths:

```
/opt/nodebb/app/node_modules/nodebb-theme-harmony/templates/...
```

That path was `/usr/src/app/...` under the old Docker image. If you ever move
the install, update all four scripts or they will silently write to a path
that does not exist — `patch_*.js` prints nothing and exits 0 when
`readFileSync` throws inside the `catch`, so a wrong path looks like success.

**A theme patch is lost on every NodeBB or Harmony upgrade.** Re-run the four
scripts after each one.

## Why the stylesheet is injected via a hook

`ranks.css` is served as a static asset and registered through
`filter:meta.getLinkTags`. Two traps cost real time here:

1. **`filter:head.build` no longer exists in NodeBB 4.x.** Registering it makes
   the plugin load cleanly and then silently do nothing. `src/meta/tags.js`
   fires `filter:meta.getMetaTags` and `filter:meta.getLinkTags`; Harmony's
   `header.tpl` renders the result via `{{{each linkTags}}}`.
2. **`/assets` maps onto `public/`, not `public/assets/`.**
   `src/routes/index.js` mounts `express.static(public)` at `/assets`, so the
   file must live at `public/<plugin id>/ranks.css`. Putting it in
   `public/assets/<plugin id>/` gives a 404, because the URL would need to be
   `/assets/assets/...`.

Also note `nodebb.config` is not a public surface and is `undefined` inside
this hook — reading `nodebb.config.relative_path` throws a `TypeError` that
takes down the whole forum via the restart loop. Use a literal `/assets/...`.

## Hooks

| Hook | Purpose |
|---|---|
| `static:app.load` | mounts the ACP settings page |
| `filter:meta.getLinkTags` | injects the stylesheet |
| `filter:admin.header.build` | ACP menu entry |
| `filter:user.getFields` | adds `imrnesRank` / `imrnesRankIdx` to the v3 user payload |
| `filter:posts.modifyUserInfo` | enriches a user object in place on post render |
| `filter:account/profile.build` | profile-page badge + progress bar |
| `filter:users.get` | enriches user lists |
| `filter:topics.addPostData` | enriches topic teasers |
| `filter:settings.set` | normalises the ladder on save |

## License

MIT

## NodeBB core fork

One surface cannot be patched from a plugin: the rank badge next to a
**quoted parent** in `src/views/partials/topic/post-parent.tpl`. That file
lives in NodeBB core, not in the theme, so neither a hook nor a theme patch
can reach it.

The change is one line on top of upstream `d3eecfb0`:

```
asepharyana/NodeBB  (fork of NodeBB/NodeBB)  ->  branch `imrnes`
  commit 2307d63  feat(views): show the rank badge on quoted parents
```

That fork branch is byte-for-byte identical to the running install
(5633 files compared, 0 differences), so it doubles as a reproducible
snapshot of production.

### Which surface comes from where

| Surface | Lives in | Provided by |
|---|---|---|
| profile header | Harmony theme | `patch_hdr.js` |
| users list item | Harmony theme | `patch_users.js` |
| topic post | Harmony theme | `patch_post.js` |
| quoted parent | **NodeBB core** | the fork commit above |
| stylesheet | `public/` + hook | this plugin (`filter:meta.getLinkTags`) |

A NodeBB or Harmony upgrade drops the three theme patches and may drop the
core patch too. Re-run the scripts, and re-check the fork branch:

```bash
cd /opt/nodebb/app
grep -c imrnes-rank src/views/partials/topic/post-parent.tpl        # expect >= 1
grep -c imrnes-rank node_modules/nodebb-theme-harmony/templates/partials/account/header.tpl
sudo -u nodebb ./nodebb build theme && systemctl restart nodebb
```
