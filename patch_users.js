// Patches Harmony's partials/users/item.tpl: compact rank badge + next-level tip on
// every user card (/users, account/blocks, search results). Idempotent.
const fs = require('fs');
const p = '/opt/nodebb/app/node_modules/nodebb-theme-harmony/templates/partials/users/item.tpl';
const INJECT = '\t\t\t\t{{{ if ./imrnesRank }}}<span class="imrnes-rank imrnes-rank-sm ir-{./imrnesRankIdx}">{./imrnesRank}</span>{{{ if ./imrnesTip }}}<span class="imrnes-progress-tip" title="{./imrnesTip}">{./imrnesTip}</span>{{{ end }}}{{{ end }}}';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split('\n');
const idx = lines.findIndex((l) => l.includes('imrnes-rank') && l.includes('imrnesRank'));
if (idx !== -1) {
	lines[idx] = INJECT;
	fs.writeFileSync(p, lines.join('\n'));
	console.log('UPGRADED');
	process.exit(0);
}
const anchor = '<div class="fw-semibold text-truncate" title="{./displayname}">{{renderShortcodeEmoji(./displayname, ./fullnameEmoji)}}</div>';
if (!s.includes(anchor)) {
	console.log('ANCHOR_MISSING');
	process.exit(1);
}
s = s.replace(anchor, anchor + '\n' + INJECT);
fs.writeFileSync(p, s);
console.log('PATCHED');
