// Patches Harmony's topic/post.tpl: rank badge + inline next-level tip next to the
// username. Idempotent: replaces a previously injected line instead of stacking.
const fs = require('fs');
const p = '/opt/nodebb/app/node_modules/nodebb-theme-harmony/templates/partials/topic/post.tpl';
const INJECT = '\t\t\t\t{{{ if ./user.imrnesRank }}}<span class="imrnes-rank ir-{./user.imrnesRankIdx}">{./user.imrnesRank}</span>{{{ if ./user.imrnesTip }}}<span class="imrnes-progress-tip" title="{./user.imrnesTip}">{./user.imrnesTip}</span>{{{ end }}}{{{ end }}}';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split('\n');
const idx = lines.findIndex((l) => l.includes('imrnes-rank') && l.includes('imrnesRank'));
if (idx !== -1) {
	lines[idx] = INJECT;
	fs.writeFileSync(p, lines.join('\n'));
	console.log('UPGRADED');
	process.exit(0);
}
const anchor = 'data-username="{posts.user.username}" data-uid="{posts.user.uid}">{{renderShortcodeEmoji(txDisplayname(posts.user), posts.user.fullnameEmoji)}}</a>';
if (!s.includes(anchor)) {
	console.log('ANCHOR_MISSING');
	process.exit(1);
}
s = s.replace(anchor, anchor + '\n' + INJECT);
fs.writeFileSync(p, s);
console.log('PATCHED');
