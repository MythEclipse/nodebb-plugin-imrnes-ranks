'use strict';

define('admin/plugins/imrnes-ranks', ['settings', 'alerts'], function (Settings, alerts) {
	const Admin = {};

	function parse(text) {
		return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
			const parts = line.split('|').map((p) => p.trim());
			const min = parseInt(parts[0], 10);
			if (parts.length < 2 || isNaN(min) || !parts[1]) {
				return null;
			}
			return { min: min, name: parts[1] };
		}).filter(Boolean).sort((a, b) => a.min - b.min);
	}

	function renderPreview() {
		const levels = parse($('#levels').val());
		const $list = $('#preview-list');
		$list.empty();
		levels.forEach((lvl, i) => {
			$list.append($('<li>')
				.addClass('list-group-item d-flex align-items-center justify-content-between py-1')
				.append($('<span>')
					.addClass('imrnes-rank imrnes-rank-sm ir-' + (i + 1))
					.text(lvl.name))
				.append($('<code>')
					.addClass('text-muted small')
					.text(lvl.min + '+ posts')));
		});
		$('#preview-count').text(levels.length);
	}

	Admin.init = function () {
		const nbbId = ajaxify.data.nbbId;
		const wrapper = $('.' + nbbId + '-settings');

		Settings.load(nbbId, wrapper, function () {});

		$('#levels').on('input', renderPreview);
		renderPreview();

		$('#btn-restore').on('click', function () {
			$('#levels').val(ajaxify.data.defaultsText);
			renderPreview();
		});
		$('#btn-reset-progress').on('click', function () {
			$('#showProgressBar').prop('checked', true);
			$('#showProgressTip').prop('checked', true);
		});

		$('#save').on('click', function () {
			Settings.save(nbbId, wrapper, function (err) {
				if (err) {
					return alerts.error(err);
				}
				alerts.alert({
					type: 'success',
					alert_id: nbbId,
					title: 'Saved',
					message: 'Rank levels saved. Badge di forum langsung pakai setting baru.',
					clickfn: function () {
						socket.emit('admin.reload');
					},
				});
			});
			return false;
		});
	};

	return Admin;
});
