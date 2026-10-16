<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
			<div class="alert alert-info mb-3 text-sm">
				<p class="mb-1"><strong>IMRNES Ranks</strong> &mdash; satu level per baris, format: <code>minPosts | [Judul]</code></p>
				<p class="mb-0">Contoh: <code>0 | [Neophyte]</code>. User mendapat title level tertinggi yang minPosts-nya sudah tercapai. Baris pertama selalu dipaksa jadi <code>0</code> saat disimpan, jadi semua user ter-cover.</p>
			</div>

			<form role="form" class="imrnes-ranks-settings">
				<fieldset>
					<div class="mb-3">
						<label class="form-label" for="levels">Levels</label>
						<textarea class="form-control" id="levels" name="levels" rows="18" style="font-family: monospace; font-size: 12px;">{levelsText}</textarea>
						<div class="form-text">Baris yang tidak valid (tanpa <code>|</code>, atau angka yang bukan number) otomatis diabaikan.</div>
					</div>

					<div class="mb-3">
						<div class="form-check">
							<input class="form-check-input" type="checkbox" id="showProgressBar" name="showProgressBar" value="1">
							<label class="form-check-label" for="showProgressBar">Tampilkan progress bar di halaman profil</label>
						</div>
						<div class="form-check">
							<input class="form-check-input" type="checkbox" id="showProgressTip" name="showProgressTip" value="1">
							<label class="form-check-label" for="showProgressTip">Tampilkan &ldquo;post / target &rarr; rank berikutnya&rdquo; di topic &amp; daftar user</label>
						</div>
					</div>
				</fieldset>
			</form>

			<div class="row g-3 mb-3">
				<div class="col-sm-6">
					<button type="button" class="btn btn-outline-secondary btn-sm w-100" id="btn-restore">Restore default</button>
				</div>
				<div class="col-sm-6">
					<button type="button" class="btn btn-outline-secondary btn-sm w-100" id="btn-reset-progress">Reset progress options</button>
				</div>
			</div>

			<div class="card">
				<div class="card-header fw-semibold">Preview level aktif (<span id="preview-count">{levelsList.length}</span> level)</div>
				<ul class="list-group list-group-flush" id="preview-list">
					{{{ each levelsList }}}
					<li class="list-group-item d-flex align-items-center justify-content-between py-1">
						<span class="imrnes-rank imrnes-rank-sm ir-{./idx}">{./name}</span>
						<code class="text-muted small">{./min}+ posts</code>
					</li>
					{{{ end }}}
				</ul>
			</div>

			<div class="alert alert-warning mt-3 mb-0 text-xs">
				Perubahan berlaku <strong>langsung</strong> &mdash; tidak perlu restart. Baris pertama dipaksa menjadi <code>0</code> supaya tidak ada user yang tanpa rank.
			</div>
		</div>
	</div>
</div>
