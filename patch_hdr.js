// Patches Harmony's partials/account/header.tpl: rank badge + horizontal
// next-level progress bar under the display name. Idempotent.
const fs = require('fs');
const p = '/opt/nodebb/app/node_modules/nodebb-theme-harmony/templates/partials/account/header.tpl';
const INJECT = [
	'\t\t\t\t{{{ if imrnesRank }}}<span class="imrnes-rank ir-{imrnesRankIdx}">{imrnesRank}</span>{{{ end }}}',
	'\t\t\t\t{{{ if imrnesProgress }}}<div class="imrnes-progress ir-{imrnesRankIdx}">',
	'\t\t\t\t\t<div class="imrnes-progress-head">',
	'\t\t\t\t\t\t<span class="imrnes-progress-current">{imrnesProgressText}</span>',
	'\t\t\t\t\t\t<span class="imrnes-progress-next">{imrnesNextRank}</span>',
	'\t\t\t\t\t</div>',
	'\t\t\t\t\t<div class="imrnes-progress-track"><div class="imrnes-progress-fill" style="width: {imrnesProgress}%"></div></div>',
	'\t\t\t\t</div>{{{ end }}}',
].join('\n');
let s = fs.readFileSync(p, 'utf8');
const lines = s.split('\n');
const idx = lines.findIndex((l) => l.includes('imrnes-rank') && l.includes('imrnesRank'));
if (idx !== -1) {
	lines.splice(idx, 1, INJECT);
	fs.writeFileSync(p, lines.join('\n'));
	console.log('UPGRADED');
	process.exit(0);
}
const anchor = '{{{ if fullname }}}{{renderShortcodeEmoji(fullname, fullnameEmoji)}}{{{ else }}}{username}{{{ end }}}</h2>';
if (!s.includes(anchor)) {
	console.log('ANCHOR_MISSING');
	process.exit(1);
}
s = s.replace(anchor, anchor + '\n' + INJECT);
fs.writeFileSync(p, s);
console.log('PATCHED');
