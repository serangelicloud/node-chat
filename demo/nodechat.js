(function($) {

var nodeChat = (window.nodeChat = {
	connect: function(basePath) {
		return new Channel(basePath);
	}
});

function Channel(basePath) {
	this.basePath = basePath;
	bindAll(this);
}

$.extend(Channel.prototype, {
	pollingErrors: 0,
	lastMessageTime: 1,
	id: null,
	
	request: function(url, options) {
		var channel = this;
		$.ajax($.extend({
			url: this.basePath + url,
			cache: false,
			dataType: "json"
		}, options));
	},
	
	poll: function() {
		// TODO: get error handling to work
		if (this.pollingErrors > 2) {
			$(this).trigger("nodechat-connectionerror");
			return;
		}
		var channel = this;
		this.request("/recv", {
			data: {
				since: this.lastMessageTime,
				id: this.id
			},
			success: this.handlePoll,
			error: function() {
				channel.pollingErrors++;
				setTimeout(channel.poll, 10*1000);
			}
		});
	},
	
	handlePoll: function(data) {
		this.pollingErrors = 0;
		var channel = this;
		if (data && data.messages) {
			$.each(data.messages, function(i, message) {
				channel.lastMessageTime = Math.max(channel.lastMessageTime, message.timestamp);
				// TODO: don't prefix events if triggering on channel instance
				$(channel).trigger("nodechat-" + message.type, message);
			});
		}
		this.poll();
	}
});

$.extend(Channel.prototype, {
	join: function(nick) {
		var channel = this;
		this.request("/join", {
			data: {
				nick: nick
			},
			success: function(data) {
				// TODO: handle errors
				channel.id = data.id;
				channel.poll();
			}
		});
	},
	
	part: function() {
		if (!this.id) { return; }
		this.request("/part", {
			data: { id: this.id }
		});
	},
	
	send: function(msg) {
		if (!this.id) { return; }
		// TODO: use POST
		this.request("/send", {
			data: {
				id: this.id,
				text: msg
			}
		});
	},
	
	who: function() {
		if (!this.id) { return; }
		this.request("/who", {
			success: function(data) {
				var users = $("#users");
				$.each(data.nicks, function(i, nick) {
					users.append("<li>" + nick + "</li>");
				});
			}
		});
	}
});

function bind(fn, context) {
	return function() {
		return fn.apply(context, arguments);
	};
}
function bindAll(obj) {
	for (var prop in obj) {
		if ($.isFunction(obj[prop])) {
			obj[prop] = bind(obj[prop], obj);
		}
	}
}

})(jQuery);