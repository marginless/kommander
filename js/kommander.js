'use strict';

//> todo
// * add mouse click support to options

// config
var formfields = /(input|textarea|label|select|button|datalist|keygen|output|legend|option|optgroup)/

// global
var kmd = {
	map: [],
	map_filtered: [],
	active: false,
	search: null,
	select: null,
	option: null,
	path: chrome.runtime.getURL('/')
};

// kommander
kommander_initialize();

// methods
function kommander_initialize() {	
	kommander_prompt_add();

	kmd.search = $('#kmd-search');
	kmd.select = $('#kmd-select');

	kmd.map = kommander_map();
	kommander_map_update();

	kommander_bind_submit();
	kommander_bind_search();
}

function kommander_map(parent) {
	var element;
	if (!parent) {
		element = kommander_element_parent();
	} else if (!parent.find) {
		element = $(parent);
	} else {
		element = parent;
	}

	// add all 'for' values for labels
	var array = element.find('label').map(function() {
		var el = $(this);
		var contents = el.clone().children().remove().end().text();
		var ref = el.attr('for');

		if (!contents || !ref) {
			return null;
		}

		return {
			//> todo: add parent path for sorting by which form cursor is in
			label: contents,
			for: ref,
			element: this
		};
	}).get();

	return array;
}

function kommander_prompt_add(element) {
	var prompt = '<div id="kmd-extension" class="kmd-hidden"><div id="kmd-prompt"><form><div class="kmd-icon kmd-logo"></div><div id="kmd-search-container"><input type="text" id="kmd-search" autocomplete="off"></div><ol id="kmd-select"></ol></form></div></div>';

	if (element) {
		$(element).prepend(prompt);
	} else {
		var shadow_host = document.createElement('span');
		console.log('shadow_host', shadow_host);


		shadow_host.style.setProperty('all', 'inherit', 'important');
		shadow_host.attachShadow({ mode: 'open' });

		document.body.prepend(shadow_host);
	
		shadow_host.innerHTML += prompt;
	}
}

function kommander_prompt_show() {
	// add escape keybinding
	kommander_bind_escape(kommander_prompt_reset);

	// show prompt and stop background scroll
	$('body').addClass('kmd-noscroll');
	$('#kmd-extension').removeClass('kmd-hidden');
	$('#kmd-search').focus();
	kmd.active = true;
}

function kommander_prompt_hide() {
	// unbind escape keybinding
	kommander_unbind_escape();

	// hide prompt and activate scroll
	$('body').removeClass('kmd-noscroll');
	$('#kmd-extension').addClass('kmd-hidden');
	kmd.active = false;
}

function kommander_prompt_reset() {
	// hide prompt
	kommander_prompt_hide();

	// reset prompt
	kmd.search.val('');
	kmd.map_filtered = [];
	kommander_map_update();
}

function kommander_prompt_toggle() {
	kmd.active ? kommander_prompt_reset() : kommander_prompt_show();
}

function kommander_trigger(element) {
	var src;
	if (!element) {
		src = document.activeElement;
	} else {
		src = element.srcElement;
	}

	var parent = kommander_element_parent(src);

	kmd.map = kommander_map(parent);
	kommander_map_update();

	// check if source element is a form field
	// if (formfields.test(src.tagName.toLowerCase())) {
	// 	console.log('kommander: triggered from a form field');
	// }

	kommander_prompt_toggle();
}

function kommander_element_parent(element) {
	if (element) {
		var parent;

		if (element.closest) {
			parent = element.closest('form');
		} else {
			parent = $(element).closest('form');
		}
		
		if (parent) {
			return parent;
		}
	}

	return $('body');
}

function kommander_bind_submit(e) {
	kmd.search.keydown(function (e) {
		switch (e.keyCode) {
			case 13:
				kommander_submit(e);
				return false;
			case 38:
				kommander_key_up();
				return false;
			case 40:
				kommander_key_down();
				return false;
		}
	});
}

function kommander_bind_search() {	
	kmd.search.on('input', function () {
		kommander_map_filter();
		kommander_map_update();
	});
}

function kommander_bind_escape(callback) {
	$('body').keydown(function (e) {
		if (e.keyCode === 27) {
			e.preventDefault();
			callback();
			return false;
		}
	});
}

function kommander_unbind_escape() {
	$('body').unbind('keydown');
}

function kommander_map_filter() {
	var term = kmd.search.val().toLowerCase();

	kmd.map_filtered = kmd.map.filter(function (entry) {
		return entry.label.toLowerCase().includes(term);
	});
}

function kommander_map_get() {
	if (kmd.search.val() != '') {
		return kmd.map_filtered;
	}

	return kmd.map;
}

function kommander_map_update() {
	var items = kommander_map_get().map(function (entry) {
		var icon = $('<div>', {
			class: 'kmd-icon kmd-icon-input'
		});
		var text = $('<p>').append(entry.label);
		return $('<li>').append(icon).append(text);
	});

	kmd.select.empty();
	kmd.select.append(items);

	kommander_selection_update();
}

function kommander_selection_update(selection) {
	if (kmd.option) {
		kmd.option.removeClass('kmd-selected');
	}
	
	if (selection) {
		kmd.option = selection;
	} else {
		// select first option
		kmd.option = kmd.select.children().first();
	}

	kmd.option.addClass('kmd-selected');
}

function kommander_key_up() {
	if (kmd.option && !kmd.option.is(':first-child')) {
		var prev = kmd.option.prev();
		if (prev) {
			kommander_selection_update(prev);
		}
	}
}

function kommander_key_down() {
	if (kmd.option && !kmd.option.is(':last-child')) {
		var next = kmd.option.next();
		if (next) {
			kommander_selection_update(next);
		}
	}
}

function kommander_submit() {
	// var option = kmd.option.find('.kmd-selected:first');
	var index = kmd.select.children().index(kmd.option);
	var entry = kommander_map_get()[index];
	var element = kommander_visible_element(entry.for);
	
	kommander_prompt_reset();
	
	if (element) {
		element.focus();
	}
}

function kommander_visible_element(id) {
	// fixes for JIRA
	var suffixes = [ '', '-field', '-textarea' ];
	
	for (var i = 0; i < suffixes.length; i++) {
		var element = $('#' + id + suffixes[i]);
		if (element.length > 0 && element.is(':visible')) {
			return element;
		}
	}

	return null;
}

// add chrome extension keybinding
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.command) {
		case 'kommander-launch':
			kommander_trigger();
			break;
		default:
			break;
	}
});
