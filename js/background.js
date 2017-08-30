// send key commands
chrome.commands.onCommand.addListener(function (command) {
	console.log('Command:', command);

	switch (command) {
		case 'kommander-launch':
			active_tab_send_message({
				command: command
			});
			break;
		default:
			break;
	}
});

// helper methods
function active_tab_send_message(message) {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function (tabs) {
		if (typeof tabs[0].id !== 'undefined') {
			chrome.tabs.sendMessage(tabs[0].id, message);
		}
	});
}
