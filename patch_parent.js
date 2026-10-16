// Patches CORE src/views/partials/topic/post-parent.tpl (the inline quote shown at
// the top of a reply) with an extra-small rank badge. The parent user is loaded
// without `postcount`, so the badge only renders because the plugin back-fills it
// in filter:topics.addPostData. Idempotent.
const fs = require('fs');
const p = '/opt/nodebb/app/src/views/partials/topic/post-parent.tpl';
const ANCHOR = '{{renderShortcodeEmoji(txDisplayname(./parent.user), ./parent.user.fullnameEmoji)}}</a>';
const BADGE = '{{{ if ./parent.user.imrnesRank }}}<span class="imrnes-rank imrnes-rank-xs ir-{./parent.user.imrnesRankIdx}" title="{./parent.user.imrnesTip}">{./parent.user.imrnesRank}</span>{{{ end }}}';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split('\n');
const idx = lines.findIndex((l) => l.includes('imrnes-rank') && l.includes('imrnesRank'));
if (idx !== -1) {
	// drop any previously injected badge span, keep the anchor intact
	lines[idx] = lines[idx].split(ANCHOR).join('').trimEnd() + BADGE;
	fs.writeFileSync(p, lines.join('\n'));
	console.log('UPGRADED');
	process.exit(0);
}
if (!s.includes(ANCHOR)) {
	console.log('ANCHOR_MISSING');
	process.exit(1);
}
s = s.replace(ANCHOR, ANCHOR + BADGE);
fs.writeFileSync(p, s);
console.log('PATCHED');
