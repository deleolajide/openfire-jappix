/*

Jappix - An open social platform
These are the Jappix Mini JS scripts for Jappix

-------------------------------------------------

License: dual-licensed under AGPL and MPLv2
Authors: Vanaryon, hunterjm, Camaran, regilero, Kloadut
Last revision: 18/06/12

*/

// Jappix Mini vars
var MINI_DISCONNECT		= false;
var MINI_AUTOCONNECT	= false;
var MINI_SHOWPANE		= false;
var MINI_INITIALIZED	= false;
var MINI_ANONYMOUS		= false;
var MINI_ANIMATE		= false;
var MINI_RANDNICK		= false;
var MINI_NICKNAME		= null;
var MINI_TITLE			= null;
var MINI_DOMAIN			= null;
var MINI_USER			= null;
var MINI_PASSWORD		= null;
var MINI_RECONNECT		= 0;
var MINI_CHATS			= [];
var MINI_GROUPCHATS		= [];
var MINI_PASSWORDS		= [];
var MINI_RESOURCE		= JAPPIX_RESOURCE + ' Mini';
var MINI_ERROR_LINK		= 'https://mini.jappix.com/issues';

// Setups connection handlers
function setupConMini(con) {
	con.registerHandler('message', handleMessageMini);
	con.registerHandler('presence', handlePresenceMini);
	con.registerHandler('iq', handleIQMini);
	con.registerHandler('onerror', handleErrorMini);
	con.registerHandler('onconnect', connectedMini);
}

// Connects the user with the given logins
function connectMini(domain, user, password) {
	try {
		// We define the http binding parameters
		oArgs = new Object();
		
		if(HOST_BOSH_MINI)
			oArgs.httpbase = HOST_BOSH_MINI;
		else
			oArgs.httpbase = HOST_BOSH;
		
		// We create the new http-binding connection
		con = new JSJaCHttpBindingConnection(oArgs);

		// We create the new openfire websockets connection
		//con = new JSJaCOpenfireWSConnection(oArgs);

		
		// And we handle everything that happen
		setupConMini(con);
		
		// Generate a resource
		var random_resource = getDB('jappix-mini', 'resource');
		
		if(!random_resource)
			random_resource = MINI_RESOURCE + ' (' + (new Date()).getTime() + ')';
		
		// We retrieve what the user typed in the login inputs
		oArgs = new Object();
		oArgs.secure = true;
		oArgs.xmllang = XML_LANG;
		oArgs.resource = random_resource;
		oArgs.domain = domain;
		
		// Store the resource (for reconnection)
		setDB('jappix-mini', 'resource', random_resource);
		
		// Anonymous login?
		if(MINI_ANONYMOUS) {
			// Anonymous mode disabled?
			if(!allowedAnonymous()) {
				logThis('Not allowed to use anonymous mode.', 2);
				
				// Notify this error
				notifyErrorMini();
				
				return false;
			}
			
			// Bad domain?
			else if(lockHost() && (domain != HOST_ANONYMOUS)) {
				logThis('Not allowed to connect to this anonymous domain: ' + domain, 2);
				
				// Notify this error
				notifyErrorMini();
				
				return false;
			}
			
			oArgs.authtype = 'saslanon';
		}
		
		// Normal login
		else {
			// Bad domain?
			if(lockHost() && (domain != HOST_MAIN)) {
				logThis('Not allowed to connect to this main domain: ' + domain, 2);
				
				// Notify this error
				notifyErrorMini();
				
				return false;
			}
			
			// No nickname?
			if(!MINI_NICKNAME)
				MINI_NICKNAME = user;
			
			oArgs.username = user;
			oArgs.pass = password;
		}
		
		// We connect !
		con.connect(oArgs);
		
		logThis('Jappix Mini is connecting...', 3);
	}
	
	catch(e) {
		// Logs errors
		logThis('Error while logging in: ' + e, 1);
		
		// Reset Jappix Mini
		disconnectedMini();
	}
	
	finally {
		return false;
	}
}

// When the user is connected
function connectedMini() {
	// Update the roster
	jQuery('#jappix_mini a.jm_pane.jm_button span.jm_counter').text('0');
	
	// Do not get the roster if anonymous
	if(MINI_ANONYMOUS)
		initializeMini();
	else
		getRosterMini();
	
	// For logger
	if(MINI_RECONNECT)
		logThis('Jappix Mini is now reconnected.', 3);
	else
		logThis('Jappix Mini is now connected.', 3);
	
	// Reset reconnect var
	MINI_RECONNECT = 0;
}

// When the user disconnects
function saveSessionMini() {
	// Not connected?
	if(!isConnected())
		return;
	
	// Save the actual Jappix Mini DOM
	setDB('jappix-mini', 'dom', jQuery('#jappix_mini').html());
	setDB('jappix-mini', 'nickname', MINI_NICKNAME);
	
	// Save the scrollbar position
	var scroll_position = '';
	var scroll_hash = jQuery('#jappix_mini div.jm_conversation:has(a.jm_pane.jm_clicked)').attr('data-hash');
	
	if(scroll_hash)
		scroll_position = document.getElementById('received-' + scroll_hash).scrollTop + '';
	
	setDB('jappix-mini', 'scroll', scroll_position);
	
	// Save the session stamp
	setDB('jappix-mini', 'stamp', getTimeStamp());
	
	// Suspend connection
	con.suspend(false);
	
	logThis('Jappix Mini session save tool launched.', 3);
}

// Disconnects the connected user
function disconnectMini() {
	// No connection?
	if(!isConnected())
		return false;
	
	logThis('Jappix Mini is disconnecting...', 3);
	
	// Change markers
	MINI_DISCONNECT = true;
	MINI_INITIALIZED = false;
	
	// Add disconnection handler
	con.registerHandler('ondisconnect', disconnectedMini);
	
	// Disconnect the user
	con.disconnect();
	
	return false;
}

// When the user is disconnected
function disconnectedMini() {
	// Remove the stored items
	removeDB('jappix-mini', 'dom');
	removeDB('jappix-mini', 'nickname');
	removeDB('jappix-mini', 'scroll');
	removeDB('jappix-mini', 'stamp');
	
	// Connection error?
	if(!MINI_DISCONNECT || MINI_INITIALIZED) {
		// Browser error?
		notifyErrorMini();
		
		// Reset reconnect timer
		jQuery('#jappix_mini').stopTime();
		
		// Try to reconnect after a while
		if(MINI_INITIALIZED && (MINI_RECONNECT < 5)) {
			// Reconnect interval
			var reconnect_interval = 10;
			
			if(MINI_RECONNECT)
				reconnect_interval = (5 + (5 * MINI_RECONNECT)) * 1000;
			
			MINI_RECONNECT++;
			
			// Set timer
			jQuery('#jappix_mini').oneTime(reconnect_interval, function() {
				launchMini(true, MINI_SHOWPANE, MINI_DOMAIN, MINI_USER, MINI_PASSWORD);
			});
		}
	}
	
	// Normal disconnection?
	else
		launchMini(false, MINI_SHOWPANE, MINI_DOMAIN, MINI_USER, MINI_PASSWORD);
	
	// Reset markers
	MINI_DISCONNECT = false;
	MINI_INITIALIZED = false;
	
	logThis('Jappix Mini is now disconnected.', 3);
}

// Handles the incoming messages
function handleMessageMini(msg) {
	var type = msg.getType();
	
	// This is a message Jappix can handle
	if((type == 'chat') || (type == 'normal') || (type == 'groupchat') || !type) {
		// Get the body
		var body = trim(msg.getBody());
		
		// Any subject?
		var subject = trim(msg.getSubject());
		
		if(subject)
			body = subject;
		
		if(body) {
			// Get the values
			var from = fullXID(getStanzaFrom(msg));
			var xid = bareXID(from);
			var use_xid = xid;
			var hash = hex_md5(xid);
			var nick = thisResource(from);
			
			// Read the delay
			var delay = readMessageDelay(msg.getNode());
			var d_stamp;
			
			// Manage this delay
			if(delay) {
				time = relativeDate(delay);
				d_stamp = Date.jab2date(delay);
			}
			
			else {
				time = getCompleteTime();
				d_stamp = new Date();
			}
			
			// Get the stamp
			var stamp = extractStamp(d_stamp);
			
			// Is this a groupchat private message?
			if(exists('#jappix_mini #chat-' + hash + '[data-type=groupchat]')) {
				// Regenerate some stuffs
				if((type == 'chat') || !type) {
					xid = from;
					hash = hex_md5(xid);
				}
				
				// XID to use for a groupchat
				else
					use_xid = from;
			}
			
			// Message type
			var message_type = 'user-message';
			
			// Grouphat values
			if(type == 'groupchat') {
				// Old message
				if(msg.getChild('delay', NS_URN_DELAY) || msg.getChild('x', NS_DELAY))
					message_type = 'old-message';
				
				// System message?
				if(!nick || subject) {
					nick = '';
					message_type = 'system-message';
				}
			}
			
			// Chat values
			else {
				nick = jQuery('#jappix_mini a#friend-' + hash).text().revertHtmlEnc();
				
				// No nickname?
				if(!nick) {
				    // if the roster does not give us any nick the user may have send us a nickname to use with his first message
                                   // @see http://xmpp.org/extensions/xep-0172.html
                                   // we first check we do not have made this stuff before
                                   var unknown_entry = jQuery("a.jm_unknown[data-xid="+xid+"]",jQuery("#jappix_mini"));
                                   if (unknown_entry.length > 0) {
                                       nick =  unknown_entry.attr('data-nick');
                                   } else {
                                       msgnick = msg.getNick();
                                       nick = getXIDNick(xid);
                                       if (msgnick) {
                                           if (nick != msgnick) {
                                               // if there is a nickname in the message which differs from the jid-extracted nick then tell it to the user
                                               nick = msgnick + ' (' + nick + ')';
                                           }
                                       }
                                       //push that unknown guy in a temporary roster entry
                                       var unknown_entry = jQuery('<a class="jm_unknown jm_offline" href="#"></a>')
                                                           .attr('data-nick',nick)
                                                           .attr('data-xid',xid);
                                       unknown_entry.appendTo(jQuery(".jm_buddies",jQuery("#jappix_mini")));
                                   }
				}
			}
			
			// Define the target div
			var target = '#jappix_mini #chat-' + hash;
			
			// Create the chat if it does not exist
			if(!exists(target) && (type != 'groupchat'))
				chatMini(type, xid, nick, hash);
			
			// Display the message
			displayMessageMini(type, body, use_xid, nick, hash, time, stamp, message_type);
			
			// Notify the user if not focused & the message is not a groupchat old one
			if((!jQuery(target + ' a.jm_chat-tab').hasClass('jm_clicked') || !isFocused()) && (message_type == 'user-message'))
				notifyMessageMini(hash);
			
			logThis('Message received from: ' + from);
		}
	}
}

// Handles the incoming IQs
function handleIQMini(iq) {
	// Define some variables
	var iqFrom = fullXID(getStanzaFrom(iq));
	var iqID = iq.getID();
	var iqQueryXMLNS = iq.getQueryXMLNS();
	var iqType = iq.getType();
	var iqNode = iq.getNode();
	
	// Build the response
	var iqResponse = new JSJaCIQ();
	
	iqResponse.setID(iqID);
	iqResponse.setTo(iqFrom);
	iqResponse.setType('result');
	
	// Software version query
	if((iqQueryXMLNS == NS_VERSION) && (iqType == 'get')) {
		/* REF: http://xmpp.org/extensions/xep-0092.html */
		
		var iqQuery = iqResponse.setQuery(NS_VERSION);
		
		iqQuery.appendChild(iq.buildNode('name', {'xmlns': NS_VERSION}, 'Jappix Mini'));
		iqQuery.appendChild(iq.buildNode('version', {'xmlns': NS_VERSION}, JAPPIX_VERSION));
		iqQuery.appendChild(iq.buildNode('os', {'xmlns': NS_VERSION}, navigator.platform));
		
		con.send(iqResponse);
		
		logThis('Received software version query: ' + iqFrom);
	}
	
	// Roster push
	else if((iqQueryXMLNS == NS_ROSTER) && (iqType == 'set')) {
		// Display the friend
		handleRosterMini(iq);
		
		con.send(iqResponse);
		
		logThis('Received a roster push.');
	}
	
	// Disco info query
	else if((iqQueryXMLNS == NS_DISCO_INFO) && (iqType == 'get')) {
		/* REF: http://xmpp.org/extensions/xep-0030.html */
		
		var iqQuery = iqResponse.setQuery(NS_DISCO_INFO);
		
		// We set the name of the client
		iqQuery.appendChild(iq.appendNode('identity', {
			'category': 'client',
			'type': 'web',
			'name': 'Jappix Mini',
			'xmlns': NS_DISCO_INFO
		}));
		
		// We set all the supported features
		var fArray = new Array(
			NS_DISCO_INFO,
			NS_VERSION,
			NS_ROSTER,
			NS_MUC,
			NS_VERSION,
			NS_URN_TIME
		);
		
		for(i in fArray)
			iqQuery.appendChild(iq.buildNode('feature', {'var': fArray[i], 'xmlns': NS_DISCO_INFO}));
		
		con.send(iqResponse);
		
		logThis('Received a disco#infos query.');
	}
	
	// User time query
	else if(jQuery(iqNode).find('time').size() && (iqType == 'get')) {
		/* REF: http://xmpp.org/extensions/xep-0202.html */
		
		var iqTime = iqResponse.appendNode('time', {'xmlns': NS_URN_TIME});
		iqTime.appendChild(iq.buildNode('tzo', {'xmlns': NS_URN_TIME}, getDateTZO()));
		iqTime.appendChild(iq.buildNode('utc', {'xmlns': NS_URN_TIME}, getXMPPTime('utc')));
		
		con.send(iqResponse);
		
		logThis('Received local time query: ' + iqFrom);
	}
}

// Handles the incoming errors
function handleErrorMini(err) {
	// First level error (connection error)
	if(jQuery(err).is('error')) {
		// Notify this error
		disconnectedMini();
		
		logThis('First level error received.', 1);
	}
}

// Handles the incoming presences
function handlePresenceMini(pr) {
	// Get the values
	var from = fullXID(getStanzaFrom(pr));
	var xid = bareXID(from);
	var resource = thisResource(from);
	var hash = hex_md5(xid);
	var type = pr.getType();
	var show = pr.getShow();
	
	// Manage the received presence values
	if((type == 'error') || (type == 'unavailable'))
		show = 'unavailable';
	
	else {
		switch(show) {
			case 'chat':
			case 'away':
			case 'xa':
			case 'dnd':
				break;
			
			default:
				show = 'available';
				
				break;
		}
	}
	
	// Is this a groupchat presence?
	var groupchat_path = '#jappix_mini #chat-' + hash + '[data-type=groupchat]';
	var is_groupchat = false;
	
	if(exists(groupchat_path)) {
		// Groupchat exists
		is_groupchat = true;
		
		// Groupchat buddy presence (not me)
		if(resource != unescape(jQuery(groupchat_path).attr('data-nick'))) {
			// Regenerate some stuffs
			var groupchat = xid;
			xid = from;
			hash = hex_md5(xid);
			
			// Remove this from the roster
			if(show == 'unavailable')
				removeBuddyMini(hash, groupchat);
			
			// Add this to the roster
			else
				addBuddyMini(xid, hash, resource, groupchat);
		}
	}
	
	// Friend path
	var chat = '#jappix_mini #chat-' + hash;
	var friend = '#jappix_mini a#friend-' + hash;
	var send_input = chat + ' input.jm_send-messages';
	
	// Is this friend online?
	if(show == 'unavailable') {
		// Offline marker
		jQuery(friend).addClass('jm_offline').removeClass('jm_online jm_hover');
		
		// Hide the friend just to be safe since the search uses .hide() and .show() which can override the CSS display attribute
		jQuery(friend).hide();
		
		// Disable the chat tools
		if(is_groupchat) {
			jQuery(chat).addClass('jm_disabled');
			jQuery(send_input).blur().attr('disabled', true).attr('data-value', _e("Unavailable")).val(_e("Unavailable"));
		}
	}
	
	else {
		// Online marker
		jQuery(friend).removeClass('jm_offline').addClass('jm_online');
		
		// Check against search string
		var search = jQuery('#jappix_mini div.jm_roster div.jm_search input.jm_searchbox').val();
		var regex = new RegExp('((^)|( ))' + escapeRegex(search), 'gi');
		var nick = unescape(jQuery(friend).data('nick'));
		if(search && !nick.match(regex))
			jQuery(friend).hide();
		
		// Enable the chat input
		if(is_groupchat) {
			jQuery(chat).removeClass('jm_disabled');
			jQuery(send_input).removeAttr('disabled').val('');
		}
	}
	
	// Change the show presence of this buddy
	jQuery(friend + ' span.jm_presence, ' + chat + ' span.jm_presence').attr('class', 'jm_presence jm_images jm_' + show);
	
	// Update the presence counter
	updateRosterMini();
	
	logThis('Presence received from: ' + from);
}

// Handles the MUC main elements
function handleMUCMini(pr) {
	// We get the xml content
	var xml = pr.getNode();
	var from = fullXID(getStanzaFrom(pr));
	var room = bareXID(from);
	var hash = hex_md5(room);
	var resource = thisResource(from);
	
	// Is it a valid server presence?
	var valid = false;
	
	if(!resource || (resource == unescape(jQuery('#jappix_mini #chat-' + hash + '[data-type=groupchat]').attr('data-nick'))))
		valid = true;
	
	// Password required?
	if(valid && jQuery(xml).find('error[type=auth] not-authorized').size()) {
		// Create a new prompt
		openPromptMini(printf(_e("This room (%s) is protected with a password."), room));
		
		// When prompt submitted
		jQuery('#jappix_popup div.jm_prompt form').submit(function() {
			try {
				// Read the value
				var password = closePromptMini();
				
				// Any submitted chat to join?
				if(password) {
					// Send the password
					presenceMini('', '', '', '', from, password, true, handleMUCMini);
					
					// Focus on the pane again
					switchPaneMini('chat-' + hash, hash);
				}
			}
			
			catch(e) {}
			
			finally {
				return false;
			}
		});
		
		return;
	}
	
	// Nickname conflict?
	else if(valid && jQuery(xml).find('error[type=cancel] conflict').size()) {
		// New nickname
		var nickname = resource + '_';
		
		// Send the new presence
		presenceMini('', '', '', '', room + '/' + nickname, '', true, handleMUCMini);
		
		// Update the nickname marker
		jQuery('#jappix_mini #chat-' + hash).attr('data-nick', escape(nickname));
	}
	
	// Handle normal presence
	else
		handlePresenceMini(pr);
}

// Updates the user presence
function presenceMini(type, show, priority, status, to, password, limit_history, handler) {
	var pr = new JSJaCPresence();
	
	// Add the attributes
	if(to)
		pr.setTo(to);
	if(type)
		pr.setType(type);
	if(show)
		pr.setShow(show);
	if(priority)
		pr.setPriority(priority);
	if(status)
		pr.setStatus(status);
	
	// Special presence elements
	if(password || limit_history) {
		var x = pr.appendNode('x', {'xmlns': NS_MUC});
		
		// Any password?
		if(password)
			x.appendChild(pr.buildNode('password', {'xmlns': NS_MUC}, password));
		
		// Any history limit?
		if(limit_history)
			x.appendChild(pr.buildNode('history', {'maxstanzas': 10, 'seconds': 86400, 'xmlns': NS_MUC}));
	}
	
	// Send the packet
	if(handler)
		con.send(pr, handler);
	else
		con.send(pr);
	
	// No type?
	if(!type)
		type = 'available';
	
	logThis('Presence sent: ' + type, 3);
}

// Sends a given message
function sendMessageMini(aForm) {
	try {
		var body = trim(aForm.body.value);
		var xid = aForm.xid.value;
		var type = aForm.type.value;
		var hash = hex_md5(xid);
		
		if(body && xid) {
			// Send the message
			var aMsg = new JSJaCMessage();
		
			// if the roster does not give us any nick the user may have send us a nickname to use with his first message
                        // @see http://xmpp.org/extensions/xep-0172.html
			var known_roster_entry = jQuery("a.jm_friend[data-xid="+xid+"]",jQuery("#jappix_mini"));
			if (0==known_roster_entry.length) {
			        var subscription = known_roster_entry.attr('data-sub');
			        // the other may not know my nickname if we do not have both a roster entry, or if he doesn't have one
			        if ('both' != subscription && 'from' != subscription) {
			                // Adding our nickname in the message, hard to know if this is just the first one
			                aMsg.setNick(MINI_NICKNAME);
			        }
			}
			aMsg.setTo(xid);
			aMsg.setType(type);
			aMsg.setBody(body);
			
			con.send(aMsg);
			
			// Clear the input
			aForm.body.value = '';
			
			// Display the message we sent
			if(type != 'groupchat')
				displayMessageMini(type, body, getXID(), 'me', hash, getCompleteTime(), getTimeStamp(), 'user-message');
			
			logThis('Message (' + type + ') sent to: ' + xid);
		}
	}
	
	catch(e) {}
	
	finally {
		return false;
	}
}

// Generates the asked smiley image
function smileyMini(image, text) {
	return ' <img class="jm_smiley jm_smiley-' + image + ' jm_images" alt="' + encodeQuotes(text) + '" src="' + JAPPIX_STATIC + 'img/others/blank.gif' + '" /> ';
}

// Notifies incoming chat messages
function notifyMessageMini(hash) {
	// Define the paths
	var tab = '#jappix_mini #chat-' + hash + ' a.jm_chat-tab';
	var notify = tab + ' span.jm_notify';
	var notify_middle = notify + ' span.jm_notify_middle';
	
	// Notification box not yet added?
	if(!exists(notify))
		jQuery(tab).append(
			'<span class="jm_notify">' + 
				'<span class="jm_notify_left jm_images"></span>' + 
				'<span class="jm_notify_middle">0</span>' + 
				'<span class="jm_notify_right jm_images"></span>' + 
			'</span>'
		);
	
	// Increment the notification number
	var number = parseInt(jQuery(notify_middle).text());
	jQuery(notify_middle).text(number + 1);
	
	// Update the notification counters
	notifyCountersMini();
}

// Notifies the user from a session error
function notifyErrorMini() {
	// Replace the Jappix Mini DOM content
	jQuery('#jappix_mini').html(
		'<div class="jm_starter">' + 
			'<a class="jm_pane jm_button jm_images" href="' + MINI_ERROR_LINK + '" target="_blank" title="' + _e("Click here to solve the error") + '">' + 
				'<span class="jm_counter jm_error jm_images">' + _e("Error") + '</span>' + 
			'</a>' + 
		'</div>'
	);
}

// Updates the global counter with the new notifications
function notifyCountersMini() {
	// Count the number of notifications
	var number = 0;
	
	jQuery('#jappix_mini span.jm_notify span.jm_notify_middle').each(function() {
		number = number + parseInt(jQuery(this).text());
	});
	
	// Update the notification link counters
	jQuery('#jappix_mini a.jm_switch').removeClass('jm_notifnav');
	
	if(number) {
		// Left?
		if(jQuery('#jappix_mini div.jm_conversation:visible:first').prevAll().find('span.jm_notify').size())
			jQuery('#jappix_mini a.jm_switch.jm_left').addClass('jm_notifnav');
		
		// Right?
		if(jQuery('#jappix_mini div.jm_conversation:visible:last').nextAll().find('span.jm_notify').size())
			jQuery('#jappix_mini a.jm_switch.jm_right').addClass('jm_notifnav');
	}
	
	// No saved title? Abort!
	if(MINI_TITLE == null)
		return;
	
	// Page title code
	var title = MINI_TITLE;
	
	// No new stuffs? Reset the title!
	if(number)
		title = '[' + number + '] ' + title;
	
	// Apply the title
	document.title = title;
	
	return;
}

// Clears the notifications
function clearNotificationsMini(hash) {
	// Not focused?
	if(!isFocused())
		return false;
	
	// Remove the notifications counter
	jQuery('#jappix_mini #chat-' + hash + ' span.jm_notify').remove();
	
	// Update the global counters
	notifyCountersMini();
	
	return true;
}

// Updates the roster counter
function updateRosterMini() {
	// Update online counter
	jQuery('#jappix_mini a.jm_button span.jm_counter').text(jQuery('#jappix_mini a.jm_online').size());
}

// Updates the chat overflow
function updateOverflowMini() {
	// Show hidden chats
	jQuery('#jappix_mini div.jm_conversation:hidden').show();
	
	// Process overflow
	var number_visible = parseInt((jQuery(window).width() - 330) / 140);
	var number_total = jQuery('#jappix_mini div.jm_conversation').size();
	
	if(number_visible <= 0)
		number_visible = 1;
	
	// Must add the overflow switcher?
	if(number_visible < number_total) {
		// Create the overflow handler?
		if(!jQuery('#jappix_mini a.jm_switch').size()) {
			// Add the navigation links
			jQuery('#jappix_mini div.jm_conversations').before(
				'<a class="jm_switch jm_left jm_pane jm_images" href="#">' + 
					'<span class="jm_navigation jm_images"></span>' + 
				'</a>'
			);
			
			jQuery('#jappix_mini div.jm_conversations').after(
				'<a class="jm_switch jm_right jm_pane jm_images" href="#">' + 
					'<span class="jm_navigation jm_images"></span>' + 
				'</a>'
			);
			
			// Add the click events
			overflowEventsMini();
		}
		
		// Show first visible chats
		var index_visible = number_visible - 1;
		jQuery('#jappix_mini div.jm_conversation:gt(' + index_visible + '):visible').hide();
		
		// Close the opened chat
		if(jQuery('#jappix_mini div.jm_conversation:hidden a.jm_pane.jm_clicked').size())
			switchPaneMini();
		
		// Update navigation buttons
		jQuery('#jappix_mini a.jm_switch').removeClass('jm_nonav');
		
		if(!jQuery('#jappix_mini div.jm_conversation:visible:first').prev().size())
			jQuery('#jappix_mini a.jm_switch.jm_left').addClass('jm_nonav');
		if(!jQuery('#jappix_mini div.jm_conversation:visible:last').next().size())
			jQuery('#jappix_mini a.jm_switch.jm_right').addClass('jm_nonav');
	}
	
	// Must remove the overflow switcher?
	else {
		jQuery('#jappix_mini a.jm_switch').remove();
		jQuery('#jappix_mini div.jm_conversation:hidden').show();
	}
}

// Click events on the chat overflow
function overflowEventsMini() {
	jQuery('#jappix_mini a.jm_switch').click(function() {
		// Nothing to do?
		if(jQuery(this).hasClass('jm_nonav'))
			return false;
		
		var hide_this = show_this = '';
		
		// Go left?
		if(jQuery(this).is('.jm_left')) {
			show_this = jQuery('#jappix_mini div.jm_conversation:visible:first').prev();
			
			if(show_this.size())
				hide_this = jQuery('#jappix_mini div.jm_conversation:visible:last');
		}
		
		// Go right?
		else {
			show_this = jQuery('#jappix_mini div.jm_conversation:visible:last').next();
			
			if(show_this.size())
				hide_this = jQuery('#jappix_mini div.jm_conversation:visible:first');
		}
		
		// Update overflow content
		if(show_this && show_this.size()) {
			// Hide
			if(hide_this && hide_this.size()) {
				hide_this.hide();
				
				// Close the opened chat
				if(hide_this.find('a.jm_pane').hasClass('jm_clicked'))
					switchPaneMini();
			}
			
			// Show
			show_this.show();
			
			// Update navigation buttons
			jQuery('#jappix_mini a.jm_switch').removeClass('jm_nonav');
			
			if((jQuery(this).is('.jm_right') && !show_this.next().size()) || (jQuery(this).is('.jm_left') && !show_this.prev().size()))
				jQuery(this).addClass('jm_nonav');
			
			// Update notification counters
			notifyCountersMini();
		}
		
		return false;
	});
}

// Creates the Jappix Mini DOM content
function createMini(domain, user, password) {
	// Try to restore the DOM
    var dom = getDB('jappix-mini', 'dom');
    var stamp = parseInt(getDB('jappix-mini', 'stamp'));
	var suspended = false;
	
	// Invalid stored DOM?
	if(dom && isNaN(jQuery(dom).find('a.jm_pane.jm_button span.jm_counter').text()))
		dom = null;
	
	// Can resume a session?
	con = new JSJaCHttpBindingConnection();
	setupConMini(con);
	
	// Old DOM?
	if(dom && ((getTimeStamp() - stamp) < JSJACHBC_MAX_WAIT) && con.resume()) {
		// Read the old nickname
		MINI_NICKNAME = getDB('jappix-mini', 'nickname');
		
		// Marker
		suspended = true;
	}
	
	// New DOM?
	else {
		dom = '<div class="jm_position">' + 
				'<div class="jm_conversations"></div>' + 
				
				'<div class="jm_starter">' + 
					'<div class="jm_roster">' + 
						'<div class="jm_actions">' + 
							'<a class="jm_logo jm_images" href="https://mini.jappix.com/" target="_blank"></a>' + 
							'<a class="jm_one-action jm_join jm_images" title="' + _e("Join a chat") + '" href="#"></a>' + 
							'<a class="jm_one-action jm_status" title="' + _e("Status") + '" href="#">' + 
								'<span class="jm_presence jm_images jm_available"></span>' + 
							'</a>' + 
							
							'<div class="jm_status_picker">' + 
								'<a href="#" data-status="available">' + 
									'<span class="jm_presence jm_images jm_available"></span>' + 
									'<span class="jm_show_text">' + _e("Available") + '</span>' + 
								'</a>' + 
								
								'<a href="#" data-status="away">' + 
									'<span class="jm_presence jm_images jm_away"></span>' + 
									'<span class="jm_show_text">' + _e("Away") + '</span>' + 
								'</a>' + 
								
								'<a href="#" data-status="dnd">' + 
									'<span class="jm_presence jm_images jm_dnd"></span>' + 
									'<span class="jm_show_text">' + _e("Busy") + '</span>' + 
								'</a>' + 
								
								'<a href="#" data-status="unavailable">' + 
									'<span class="jm_presence jm_images jm_unavailable"></span>' + 
									'<span class="jm_show_text">' + _e("Offline") + '</span>' + 
								'</a>' + 
							'</div>' + 
						'</div>' + 
						'<div class="jm_buddies"></div>' + 
						'<div class="jm_search">' + 
							'<input type="text" class="jm_searchbox jm_images" placeholder="' + _e("Filter") + '" data-value="" />' + 
						'</div>' + 
					'</div>' + 
					
					'<a class="jm_pane jm_button jm_images" href="#">' + 
						'<span class="jm_counter jm_images">' + _e("Please wait...") + '</span>' + 
					'</a>' + 
				'</div>' + 
			  '</div>';
	}
	
	// Create the DOM
	jQuery('body').append('<div id="jappix_mini">' + dom + '</div>');
	
	// Hide the status picker panel
	jQuery('#jappix_mini a.jm_status').removeClass('active');
	jQuery('#jappix_mini div.jm_status_picker').hide();
	
	// Adapt roster height
	adaptRosterMini();
	
	// Chat navigation overflow
	overflowEventsMini();
	updateOverflowMini();
	
	// CSS refresh (Safari display bug when restoring old DOM)
	jQuery('#jappix_mini div.jm_starter, #jappix_mini div.jm_conversations, #jappix_mini div.jm_conversation, #jappix_mini a.jm_switch').css('float', 'left');
	
	// The click events
	jQuery('#jappix_mini a.jm_button').click(function() {
		// Using a try/catch override IE issues
		try {
			// Presence counter
			var counter = '#jappix_mini a.jm_pane.jm_button span.jm_counter';
			
			// Cannot open the roster?
			if(jQuery(counter).text() == _e("Please wait..."))
				return false;
			
			// Not yet connected?
			if(jQuery(counter).text() == _e("Chat")) {
				// Remove the animated bubble
				jQuery('#jappix_mini div.jm_starter span.jm_animate').stopTime().remove();
				
				// Add a waiting marker
				jQuery(counter).text(_e("Please wait..."));
				
				// Launch the connection!
				connectMini(domain, user, password);
				
				return false;
			}
			
			// Normal actions
			if(!jQuery(this).hasClass('jm_clicked'))
				showRosterMini();
			else
				hideRosterMini();
		}
		
		catch(e) {}
		
		finally {
			return false;
		}
	});

	jQuery('#jappix_mini a.jm_status').click(function() {
		// Using a try/catch override IE issues
		try {
			if(jQuery(this).hasClass('active')) {
				jQuery('#jappix_mini div.jm_status_picker').hide();
				jQuery(this).blur().removeClass('active');
			} else {
				jQuery('#jappix_mini div.jm_status_picker').show();
				jQuery(this).addClass('active');
			}
		}
		
		catch(e) {}
		
		finally {
			return false;
		}
	});

	jQuery('#jappix_mini div.jm_status_picker a').click(function() {
		// Using a try/catch override IE issues
		try {
			// Generate an array of presence change XIDs
			var pr_xid = [''];
			
			jQuery('#jappix_mini div.jm_conversation[data-type=groupchat]').each(function() {
				pr_xid.push(jQuery(this).attr('data-xid'));
			});
			
			// Loop on XIDs
			var new_status = jQuery(this).data('status');
			
			jQuery.each(pr_xid, function(key, value) {
				switch(new_status) {
					case 'available':
						presenceMini('', '', '', '', value);
						break;
					
					case 'away':
						presenceMini('', 'away', '', '', value);
						break;
					
					case 'dnd':
						presenceMini('', 'dnd', '', '', value);
						break;
					
					case 'unavailable':
						disconnectMini();
						break;
					
					default:
						presenceMini('', '', '', '', value);
						break;
				}
			});
			
			// Switch the status
			if(new_status != 'unavailable') {
				jQuery('#jappix_mini a.jm_status span').removeClass('jm_available jm_away jm_dnd jm_unavailable')
				                                       .addClass('jm_' + jQuery(this).data('status'));
				
				jQuery('#jappix_mini div.jm_status_picker').hide();
				jQuery('#jappix_mini a.jm_status').blur().removeClass('active');
			}
		}
		
		catch(e) {}
		
		finally {
			return false;
		}
	});
	
	jQuery('#jappix_mini div.jm_actions a.jm_join').click(function() {
		// Using a try/catch override IE issues
		try {
			// Create a new prompt
			openPromptMini(_e("Please enter the group chat address to join."));
			
			// When prompt submitted
			jQuery('#jappix_popup div.jm_prompt form').submit(function() {
				try {
					// Read the value
					var join_this = closePromptMini();
					
					// Any submitted chat to join?
					if(join_this) {
						// Get the chat room to join
						chat_room = bareXID(generateXID(join_this, 'groupchat'));
						
						// Create a new groupchat
						chatMini('groupchat', chat_room, getXIDNick(chat_room), hex_md5(chat_room));
					}
				}
				
				catch(e) {}
				
				finally {
					return false;
				}
			});
		}
		
		catch(e) {}
		
		finally {
			return false;
		}
	});
	
	// Updates the roster with only searched terms
	jQuery('#jappix_mini div.jm_roster div.jm_search input.jm_searchbox').keyup(function(e) {
		// Avoid buddy navigation to be reseted
		if((e.keyCode == 38) || (e.keyCode == 40))
			return;
		
		// Save current value
		jQuery(this).attr('data-value', jQuery(this).val());
		
		// Don't filter at each key up (faster for computer)
		var self = this;
		
		typewatch(function() {
			// Using a try/catch to override IE issues
			try {
				// Get values
				var search = jQuery(self).val();
				var regex = new RegExp('((^)|( ))' + escapeRegex(search), 'gi');
				
				// Reset results
				jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');
				jQuery('#jappix_mini div.jm_roster div.jm_grouped').show();
				
				// If there is no search, we don't need to loop over buddies
				if(!search) {
					jQuery('#jappix_mini div.jm_roster div.jm_buddies a.jm_online').show();
					
					return;
				}
				
				// Filter buddies
				jQuery('#jappix_mini div.jm_roster div.jm_buddies a.jm_online').each(function() {
					var nick = unescape(jQuery(this).data('nick'));
					
					if(nick.match(regex))
						jQuery(this).show();
					else
						jQuery(this).hide();
				});
				
				// Filter groups
				jQuery('#jappix_mini div.jm_roster div.jm_grouped').each(function() {
					if(!jQuery(this).find('a.jm_online:visible').size())
						jQuery(this).hide();
				});
				
				// Focus on the first buddy
				jQuery('#jappix_mini div.jm_roster div.jm_buddies a.jm_online:visible:first').addClass('jm_hover');
			}
			
			catch(e) {}
			
			finally {
				return false;
			}
		}, 500);
	});
	
	// Roster navigation
	jQuery(document).keydown(function(e) {
		// Cannot work if roster is not opened
		if(jQuery('#jappix_mini div.jm_roster').is(':hidden'))
			return;
		
		// Up/Down keys
		if((e.keyCode == 38) || (e.keyCode == 40)) {
			// Hover the last/first buddy
			if(!jQuery('#jappix_mini a.jm_online.jm_hover').size()) {
				if(e.keyCode == 38)
					jQuery('#jappix_mini a.jm_online:visible:last').addClass('jm_hover');
				else
					jQuery('#jappix_mini a.jm_online:visible:first').addClass('jm_hover');
			}
			
			// Hover the previous/next buddy
			else if(jQuery('#jappix_mini a.jm_online:visible').size() > 1) {
				var hover_index = jQuery('#jappix_mini a.jm_online:visible').index(jQuery('a.jm_hover'));
				
				// Up (decrement) or down (increment)?
				if(e.keyCode == 38)
					hover_index--;
				else
					hover_index++;
				
				if(!hover_index)
					hover_index = 0;
				
				// No buddy before/after?
				if(!jQuery('#jappix_mini a.jm_online:visible').eq(hover_index).size()) {
					if(e.keyCode == 38)
						hover_index = jQuery('#jappix_mini a.jm_online:visible:last').index();
					else
						hover_index = 0;
				}
				
				// Hover the previous/next buddy
				jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');
				jQuery('#jappix_mini a.jm_online:visible').eq(hover_index).addClass('jm_hover');
			}
			
			// Scroll to the hovered buddy (if out of limits)
			jQuery('#jappix_mini div.jm_roster div.jm_buddies').scrollTo(jQuery('#jappix_mini a.jm_online.jm_hover'), 0, {margin: true});
			
			return false;
		}
		
		// Enter key
		if((e.keyCode == 13) && jQuery('#jappix_mini a.jm_friend.jm_hover').size()) {
			jQuery('#jappix_mini a.jm_friend.jm_hover').click();
			
			return false;
		}
	});
	
	// Hides the roster when clicking away of Jappix Mini
	jQuery(document).click(function(evt) {
		if(!jQuery(evt.target).parents('#jappix_mini').size() && !exists('#jappix_popup'))
			hideRosterMini();
	});
	
	// Hides all panes double clicking away of Jappix Mini
	jQuery(document).dblclick(function(evt) {
		if(!jQuery(evt.target).parents('#jappix_mini').size() && !exists('#jappix_popup'))
			switchPaneMini();
	});
	
	// Suspended session resumed?
	if(suspended) {
		// Initialized marker
		MINI_INITIALIZED = true;
		
		// Restore chat input values
		jQuery('#jappix_mini div.jm_conversation input.jm_send-messages').each(function() {
			var chat_value = jQuery(this).attr('data-value');
			
			if(chat_value)
				jQuery(this).val(chat_value);
		});
		
		// Restore roster filter value
		var search_box = jQuery('#jappix_mini div.jm_roster div.jm_search input.jm_searchbox');
		var filter_value = search_box.attr('data-value');
		
		if(filter_value)
			search_box.val(filter_value).keyup();
		
		// Restore buddy click events
		jQuery('#jappix_mini a.jm_friend').click(function() {
			// Using a try/catch override IE issues
			try {
				chatMini('chat', unescape(jQuery(this).attr('data-xid')), unescape(jQuery(this).attr('data-nick')), jQuery(this).attr('data-hash'));
			}
			
			catch(e) {}
			
			finally {
				return false;
			}
		});
		
		// Restore buddy hover events
		jQuery('#jappix_mini a.jm_friend').hover(function() {
			jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');			jQuery(this).addClass('jm_hover');
		}, function() {
			jQuery(this).removeClass('jm_hover');
		});
		
		// Restore buddy mousedown events
		jQuery('#jappix_mini a.jm_friend').mousedown(function() {
			jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');
			jQuery(this).addClass('jm_hover');
		});
		
		// Restore buddy focus events
		jQuery('#jappix_mini a.jm_friend').focus(function() {
			jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');
			jQuery(this).addClass('jm_hover');
		});
		
		// Restore buddy blur events
		jQuery('#jappix_mini a.jm_friend').blur(function() {
			jQuery(this).removeClass('jm_hover');
		});
		
		// Restore chat click events
		jQuery('#jappix_mini div.jm_conversation').each(function() {
			chatEventsMini(jQuery(this).attr('data-type'), unescape(jQuery(this).attr('data-xid')), jQuery(this).attr('data-hash'));
		});
		
		// Scroll down to the last message
		var scroll_hash = jQuery('#jappix_mini div.jm_conversation:has(a.jm_pane.jm_clicked)').attr('data-hash');
		var scroll_position = getDB('jappix-mini', 'scroll');
		
		// Any scroll position?
		if(scroll_position)
			scroll_position = parseInt(scroll_position);
		
		if(scroll_hash) {
			// Use a timer to override the DOM lag issue
			jQuery(document).oneTime(200, function() {
				messageScrollMini(scroll_hash, scroll_position);
			});
		}
		
		// Update notification counters
		notifyCountersMini();
	}
	
	// Can auto-connect?
	else if(MINI_AUTOCONNECT)
		connectMini(domain, user, password);
	
	// Cannot auto-connect?
	else {
		// Chat text
		jQuery('#jappix_mini a.jm_pane.jm_button span.jm_counter').text(_e("Chat"));
		
		// Must animate?
		if(MINI_ANIMATE) {
			// Add content
			jQuery('#jappix_mini div.jm_starter').prepend(
				'<span class="jm_animate jm_images_animate"></span>'
			);
			
			// IE6 makes the image blink when animated...
			if(jQuery.browser.msie && ( parseInt(jQuery.browser.version) < 7 ) )
				return;
			
			// Add timers
			var anim_i = 0;
			
			jQuery('#jappix_mini div.jm_starter span.jm_animate').everyTime(10, function() {
				// Next
				anim_i++;
				
				// Margins
				var m_top = Math.cos(anim_i * 0.02) * 3;
				var m_left = Math.sin(anim_i * 0.02) * 3;
				
				// Apply new position!
				jQuery(this).css('margin-top', m_top + 'px')
				            .css('margin-left', m_left + 'px');
			});
		}
	}
}

// Displays a given message
function displayMessageMini(type, body, xid, nick, hash, time, stamp, message_type) {
	// Generate path
	var path = '#chat-' + hash;
	
	// Can scroll?
	var cont_scroll = document.getElementById('received-' + hash);
	var can_scroll = false;
	
	if(!cont_scroll.scrollTop || ((cont_scroll.clientHeight + cont_scroll.scrollTop) == cont_scroll.scrollHeight))
		can_scroll = true;
	
	// Remove the previous message border if needed
	var last = jQuery(path + ' div.jm_group:last');
	var last_stamp = parseInt(last.attr('data-stamp'));
	var last_b = jQuery(path + ' b:last');
	var last_xid = last_b.attr('data-xid');
	var last_type = last.attr('data-type');
	var grouped = false;
	var header = '';
	
	if((last_xid == xid) && (message_type == last_type) && ((stamp - last_stamp) <= 1800))
		grouped = true;
	
	else {
		// Write the message date
		if(nick)
			header += '<span class="jm_date">' + time + '</span>';
		
		// Write the buddy name at the top of the message group
		if(type == 'groupchat')
			header += '<b class="jm_name" style="color: ' + generateColor(nick) + ';" data-xid="' + encodeQuotes(xid) + '">' + nick.htmlEnc() + '</b>';
		else if(nick == 'me')
			header += '<b class="jm_name jm_me" data-xid="' + encodeQuotes(xid) + '">' + _e("You") + '</b>';
		else
			header += '<b class="jm_name jm_him" data-xid="' + encodeQuotes(xid) + '">' + nick.htmlEnc() + '</b>';
	}
	
	// Apply the /me command
	var me_command = false;
	
	if(body.match(/^\/me /i)) {
		body = body.replace(/^\/me /i, nick + ' ');
		
		// Marker
		me_command = true;
	}
	
	// HTML-encode the message
	body = body.htmlEnc();
	
	// Apply the smileys
	body = body.replace(/(;-?\))(\s|$)/gi, smileyMini('wink', '$1'))
	           .replace(/(:-?3)(\s|$)/gi, smileyMini('waii', '$1'))
	           .replace(/(:-?\()(\s|$)/gi, smileyMini('unhappy', '$1'))
	           .replace(/(:-?P)(\s|$)/gi, smileyMini('tongue', '$1'))
	           .replace(/(:-?O)(\s|$)/gi, smileyMini('surprised', '$1'))
	           .replace(/(:-?\))(\s|$)/gi, smileyMini('smile', '$1'))
	           .replace(/(\^_?\^)(\s|$)/gi, smileyMini('happy', '$1'))
	           .replace(/(:-?D)(\s|$)/gi, smileyMini('grin', '$1'));
	
	// Format the text
	body = body.replace(/(^|\s|>|\()((\*)([^<>'"\*]+)(\*))($|\s|<|\))/gi, '$1<b>$2</b>$6')
	           .replace(/(^|\s|>|\()((\/)([^<>'"\/]+)(\/))($|\s|<|\))/gi, '$1<em>$2</em>$6')
	           .replace(/(^|\s|>|\()((_)([^<>'"_]+)(_))($|\s|<|\))/gi, '$1<span style="text-decoration: underline;">$2</span>$6');
	
	// Filter the links
	body = applyLinks(body, 'mini');
	
	// Generate the message code
	if(me_command)
		body = '<em>' + body + '</em>';
	
	body = '<p>' + body + '</p>';
	
	// Create the message
	if(grouped)
		jQuery('#jappix_mini #chat-' + hash + ' div.jm_received-messages div.jm_group:last').append(body);
	else
		jQuery('#jappix_mini #chat-' + hash + ' div.jm_received-messages').append('<div class="jm_group jm_' + message_type + '" data-type="' + message_type + '" data-stamp="' + stamp + '">' + header + body + '</div>');
	
	// Scroll to this message
	if(can_scroll)
		messageScrollMini(hash);
}

// Switches to a given point
function switchPaneMini(element, hash) {
	// Hide every item
	hideRosterMini();
	jQuery('#jappix_mini a.jm_pane').removeClass('jm_clicked');
	jQuery('#jappix_mini div.jm_chat-content').hide();
	
	// Show the asked element
	if(element && (element != 'roster')) {
		var current = '#jappix_mini #' + element;
		
		// Navigate to this chat
		if(jQuery(current).size() && jQuery(current).is(':hidden')) {
			var click_nav = '';
			
			// Before or after?
			if(jQuery('#jappix_mini div.jm_conversation:visible:first').prevAll().is('#' + element))
				click_nav = jQuery('#jappix_mini a.jm_switch.jm_left');
			else
				click_nav = jQuery('#jappix_mini a.jm_switch.jm_right');
			
			// Click previous or next
			if(click_nav) {
				while(jQuery(current).is(':hidden') && !click_nav.hasClass('jm_nonav'))
					click_nav.click();
			}
		}
		
		// Show it
		jQuery(current + ' a.jm_pane').addClass('jm_clicked');
		jQuery(current + ' div.jm_chat-content').show();
		
		// Use a timer to override the DOM lag issue
		jQuery(document).oneTime(10, function() {
			jQuery(current + ' input.jm_send-messages').focus();
		});
		
		// Scroll to the last message
		if(hash)
			messageScrollMini(hash);
	}
}

// Scrolls to the last chat message
function messageScrollMini(hash, position) {
	var id = document.getElementById('received-' + hash);
	
	// No defined position?
	if(!position)
		position = id.scrollHeight;
	
	id.scrollTop = position;
}

// Prompts the user with a given text
function openPromptMini(text, value) {
	// Initialize
	var prompt = '#jappix_popup div.jm_prompt';
	var input = prompt + ' form input';
	var value_input = input + '[type=text]';
	
	// Remove the existing prompt
	closePromptMini();
	
	// Add the prompt
	jQuery('body').append(
		'<div id="jappix_popup">' + 
			'<div class="jm_prompt">' + 
				'<form>' + 
					text + 
					'<input class="jm_text" type="text" value="" />' + 
					'<input class="jm_submit" type="submit" value="' + _e("Submit") + '" />' + 
					'<input class="jm_submit" type="reset" value="' + _e("Cancel") + '" />' + 
					'<div class="jm_clear"></div>' + 
				'</form>' + 
			'</div>' + 
		'</div>'
	);
	
	// Vertical center
	var vert_pos = '-' + ((jQuery(prompt).height() / 2) + 10) + 'px';
	jQuery(prompt).css('margin-top', vert_pos);
	
	// Apply the value?
	if(value)
		jQuery(value_input).val(value);
	
	// Focus on the input
	jQuery(document).oneTime(10, function() {
		jQuery(value_input).focus();
	});
	
	// Cancel event
	jQuery(input + '[type=reset]').click(function() {
		try {
			closePromptMini();
		}
		
		catch(e) {}
		
		finally {
			return false;
		}
	});
}

// Returns the prompt value
function closePromptMini() {
	// Read the value
	var value = jQuery('#jappix_popup div.jm_prompt form input').val();
	
	// Remove the popup
	jQuery('#jappix_popup').remove();
	
	return value;
}

// Manages and creates a chat
function chatMini(type, xid, nick, hash, pwd, show_pane) {
	var current = '#jappix_mini #chat-' + hash;
	
	// Not yet added?
	if(!exists(current)) {
		// Groupchat nickname
		if(type == 'groupchat') {
			// Random nickname?
			if(!MINI_NICKNAME && MINI_RANDNICK)
				MINI_NICKNAME = randomNickMini();
			
			var nickname = MINI_NICKNAME;
			
			// No nickname?
			if(!nickname) {
				// Create a new prompt
				openPromptMini(printf(_e("Please enter your nickname to join %s."), xid));
				
				// When prompt submitted
				jQuery('#jappix_popup div.jm_prompt form').submit(function() {
					try {
						// Read the value
						var nickname = closePromptMini();
						
						// Update the stored one
						if(nickname)
							MINI_NICKNAME = nickname;
						
						// Launch it again!
						chatMini(type, xid, nick, hash, pwd);
					}
					
					catch(e) {}
					
					finally {
						return false;
					}
				});
				
				return;
			}
		}
		
		// Create the HTML markup
		var html = '<div class="jm_conversation jm_type_' + type + '" id="chat-' + hash + '" data-xid="' + escape(xid) + '" data-type="' + type + '" data-nick="' + escape(nick) + '" data-hash="' + hash + '" data-origin="' + escape(cutResource(xid)) + '">' + 
				'<div class="jm_chat-content">' + 
					'<div class="jm_actions">' + 
						'<span class="jm_nick">' + nick + '</span>';
		
		// Check if the chat/groupchat exists
		var groupchat_exists = false;
		var chat_exists = false;
		
		if((type == 'groupchat') && MINI_GROUPCHATS && MINI_GROUPCHATS.length) {
			for(g in MINI_GROUPCHATS) {
				if(xid == bareXID(generateXID(MINI_GROUPCHATS[g], 'groupchat'))) {
					groupchat_exists = true;
					
					break;
				}
			}
		}
		
		if((type == 'chat') && MINI_CHATS && MINI_CHATS.length) {
			for(c in MINI_CHATS) {
				if(xid == bareXID(generateXID(MINI_CHATS[c], 'chat'))) {
					chat_exists = true;
					
					break;
				}
			}
		}
		
		// Any close button to display?
		if(((type == 'groupchat') && !groupchat_exists) || ((type == 'chat') && !chat_exists) || ((type != 'groupchat') && (type != 'chat')))
			html += '<a class="jm_one-action jm_close jm_images" title="' + _e("Close") + '" href="#"></a>';
		
		html += '</div>' + 
			
			'<div class="jm_received-messages" id="received-' + hash + '"></div>' + 
				'<form action="#" method="post">' + 
					'<input type="text" class="jm_send-messages" name="body" autocomplete="off" placeholder="' + _e("Chat") + '" data-value="" />' + 
					'<input type="hidden" name="xid" value="' + xid + '" />' + 
					'<input type="hidden" name="type" value="' + type + '" />' + 
				'</form>' + 
			'</div>' + 
			
			'<a class="jm_pane jm_chat-tab jm_images" href="#">' + 
				'<span class="jm_name">' + nick.htmlEnc() + '</span>' + 
			'</a>' + 
		'</div>';
		
		jQuery('#jappix_mini div.jm_conversations').prepend(html);
		
		// Get the presence of this friend
		if(type != 'groupchat') {
			var selector = jQuery('#jappix_mini a#friend-' + hash + ' span.jm_presence');
			
			// Default presence
			var show = 'available';
			
			// Read the presence
			if(selector.hasClass('jm_unavailable') || !selector.size())
				show = 'unavailable';
			else if(selector.hasClass('jm_chat'))
				show = 'chat';
			else if(selector.hasClass('jm_away'))
				show = 'away';
			else if(selector.hasClass('jm_xa'))
				show = 'xa';
			else if(selector.hasClass('jm_dnd'))
				show = 'dnd';
			
			// Create the presence marker
			jQuery(current + ' a.jm_chat-tab').prepend('<span class="jm_presence jm_images jm_' + show + '"></span>');
		}
		
		// The chat events
		chatEventsMini(type, xid, hash);
		
		// Join the groupchat
		if(type == 'groupchat') {
			// Add the nickname value
			jQuery(current).attr('data-nick', escape(nickname));
			
			// Send the first groupchat presence
			presenceMini('', '', '', '', xid + '/' + nickname, pwd, true, handleMUCMini);
		}
	}
	
	// Focus on our pane
	if(show_pane != false)
		jQuery(document).oneTime(10, function() {
			switchPaneMini('chat-' + hash, hash);
		});
	
	// Update chat overflow
	updateOverflowMini();
	
	return false;
}

// Events on the chat tool
function chatEventsMini(type, xid, hash) {
	var current = '#jappix_mini #chat-' + hash;
	
	// Submit the form
	jQuery(current + ' form').submit(function() {
		return sendMessageMini(this);
	});
	
	// Click on the tab
	jQuery(current + ' a.jm_chat-tab').click(function() {
		// Using a try/catch override IE issues
		try {
			// Not yet opened: open it!
			if(!jQuery(this).hasClass('jm_clicked')) {
				// Show it!
				switchPaneMini('chat-' + hash, hash);
				
				// Clear the eventual notifications
				clearNotificationsMini(hash);
			}
			
			// Yet opened: close it!
			else
				switchPaneMini();
		}
		
		catch(e) {}
		
		finally {
			return false;
		}
	});
	
	// Click on the close button
	jQuery(current + ' a.jm_close').click(function() {
		// Using a try/catch override IE issues
		try {
			jQuery(current).remove();
			
			// Quit the groupchat?
			if(type == 'groupchat') {
				// Send an unavailable presence
				presenceMini('unavailable', '', '', '', xid + '/' + unescape(jQuery(current).attr('data-nick')));
				
				// Remove this groupchat!
				removeGroupchatMini(xid);
			}
			
			// Update chat overflow
			updateOverflowMini();
		}
		
		catch(e) {}
		
		finally {
			return false;
		}
	});
	
	// Click on the chat content
	jQuery(current + ' div.jm_received-messages').click(function() {
		try {
			jQuery(document).oneTime(10, function() {
				jQuery(current + ' input.jm_send-messages').focus();
			});
		}
		
		catch(e) {}
	});
	
	// Focus on the chat input
	jQuery(current + ' input.jm_send-messages').focus(function() {
		clearNotificationsMini(hash);
	})
	
	// Change on the chat input
	.keyup(function() {
		jQuery(this).attr('data-value', jQuery(this).val());
	})
	
	// Chat tabulate or escape press
	.keydown(function(e) {
		// Tabulate?
		if(e.keyCode == 9) {
			switchChatMini();
			
			return false;
		}
		
		// Escape?
		if(e.keyCode == 27) {
			if(jQuery(current + ' a.jm_close').size()) {
				// Open next/previous chat
				if(jQuery(current).next('div.jm_conversation').size())
					jQuery(current).next('div.jm_conversation').find('a.jm_pane').click();
				else if(jQuery(current).prev('div.jm_conversation').size())
					jQuery(current).prev('div.jm_conversation').find('a.jm_pane').click();
				
				// Close current chat
				jQuery(current + ' a.jm_close').click();
			}
			
			return false;
		}
	});
}

// Opens the next chat
function switchChatMini() {
	if(jQuery('#jappix_mini div.jm_conversation').size() <= 1)
		return;
	
	// Get the current chat index
	var chat_index = jQuery('#jappix_mini div.jm_conversation:has(a.jm_pane.jm_clicked)').index();
	chat_index++;
	
	if(!chat_index)
		chat_index = 0;
	
	// No chat after?
	if(!jQuery('#jappix_mini div.jm_conversation').eq(chat_index).size())
		chat_index = 0;
	
	// Avoid disabled chats
	while(jQuery('#jappix_mini div.jm_conversation').eq(chat_index).hasClass('jm_disabled'))
		chat_index++;
	
	// Show the next chat
	var chat_hash = jQuery('#jappix_mini div.jm_conversation').eq(chat_index).attr('data-hash');
	
	if(chat_hash)
		switchPaneMini('chat-' + chat_hash, chat_hash);
}

// Shows the roster
function showRosterMini() {
	switchPaneMini('roster');
	jQuery('#jappix_mini div.jm_roster').show();
	jQuery('#jappix_mini a.jm_button').addClass('jm_clicked');
	
	jQuery(document).oneTime(10, function() {
		jQuery('#jappix_mini div.jm_roster div.jm_search input.jm_searchbox').focus();
	});
}

// Hides the roster
function hideRosterMini() {
	// Close the status picker
	jQuery('#jappix_mini a.jm_status.active').click();
	
	// Hide the roster box
	jQuery('#jappix_mini div.jm_roster').hide();
	jQuery('#jappix_mini a.jm_button').removeClass('jm_clicked');
	
	// Clear the search box and show all online contacts
	jQuery('#jappix_mini div.jm_roster div.jm_search input.jm_searchbox').val('').attr('data-value', '');
	jQuery('#jappix_mini div.jm_roster div.jm_grouped').show();
	jQuery('#jappix_mini div.jm_roster div.jm_buddies a.jm_online').show();
	jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');
}

// Removes a groupchat from DOM
function removeGroupchatMini(xid) {
	// Remove the groupchat private chats & the groupchat buddies from the roster
	jQuery('#jappix_mini div.jm_conversation[data-origin=' + escape(cutResource(xid)) + '], #jappix_mini div.jm_roster div.jm_grouped[data-xid=' + escape(xid) + ']').remove();
	
	// Update the presence counter
	updateRosterMini();
}

// Initializes Jappix Mini
function initializeMini() {
	// Update the marker
	MINI_INITIALIZED = true;
	
	// Send the initial presence
	if(!MINI_ANONYMOUS)
		presenceMini();
	
	// Join the groupchats (first)
	for(var i = 0; i < MINI_GROUPCHATS.length; i++) {
		// Empty value?
		if(!MINI_GROUPCHATS[i])
			continue;
		
		// Using a try/catch override IE issues
		try {
			// Current chat room
			var chat_room = bareXID(generateXID(MINI_GROUPCHATS[i], 'groupchat'));
			
			// Open the current chat
			chatMini('groupchat', chat_room, getXIDNick(chat_room), hex_md5(chat_room), MINI_PASSWORDS[i], MINI_SHOWPANE);
		}
		
		catch(e) {}
	}
	
	// Join the chats (then)
	for(var j = 0; j < MINI_CHATS.length; j++) {
		// Empty value?
		if(!MINI_CHATS[j])
			continue;
		
		// Using a try/catch override IE issues
		try {
			// Current chat user
			var chat_xid = bareXID(generateXID(MINI_CHATS[j], 'chat'));
			var chat_hash = hex_md5(chat_xid);
			var chat_nick = jQuery('#jappix_mini a#friend-' + chat_hash).attr('data-nick');
			
			if(!chat_nick)
				chat_nick = getXIDNick(chat_xid);
			else
				chat_nick = unescape(chat_nick);
			
			// Open the current chat
			chatMini('chat', chat_xid, chat_nick, chat_hash);
		}
		
		catch(e) {}
	}
	
	// Must show the roster?
	if(!MINI_AUTOCONNECT && !MINI_GROUPCHATS.length && !MINI_CHATS.length)
		jQuery(document).oneTime(10, function() {
			showRosterMini();
		});
}

// Displays a roster buddy
function addBuddyMini(xid, hash, nick, groupchat, subscription) {
	// Element
	var element = '#jappix_mini a.jm_friend#friend-' + hash;
	
	// Yet added?
	if(exists(element))
		return false;
	
	// Generate the path
	var path = '#jappix_mini div.jm_roster div.jm_buddies';
	
	// Groupchat buddy
	if(groupchat) {
		// Generate the groupchat group path
		path = '#jappix_mini div.jm_roster div.jm_grouped[data-xid=' + escape(groupchat) + ']';
		
		// Must add a groupchat group?
		if(!exists(path)) {
			jQuery('#jappix_mini div.jm_roster div.jm_buddies').append(
				'<div class="jm_grouped" data-xid="' + escape(groupchat) + '">' + 
					'<div class="jm_name">' + getXIDNick(groupchat).htmlEnc() + '</div>' + 
				'</div>'
			);
		}
	}
	
	if (subscription) {
	  substr = ' data-sub="' + subscription +'" ';
	} else {
	  substr = '';
	}
	// Append this buddy content
	var code = '<a class="jm_friend jm_offline" id="friend-' + hash
	           + '" data-xid="' + escape(xid)
	           + '" data-nick="' + escape(nick)
	           +  '" data-hash="' + hash + '" href="#" '
	           + substr + '><span class="jm_presence jm_images jm_unavailable"></span>'
	           + nick.htmlEnc() + '</a>';
	
	if(groupchat)
		jQuery(path).append(code);
	else
		jQuery(path).prepend(code);
	
	// Click event on this buddy
	jQuery(element).click(function() {
		// Using a try/catch override IE issues
		try {
			chatMini('chat', xid, nick, hash);
		}
		
		catch(e) {}
		
		finally {
			return false;
		}
	});
	
	// Hover event on this buddy
	jQuery(element).hover(function() {
		jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');
		jQuery(this).addClass('jm_hover');
	}, function() {
		jQuery(this).removeClass('jm_hover');
	});
	
	// Mousedown event on this buddy
	jQuery('#jappix_mini a.jm_friend').mousedown(function() {
		jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');
		jQuery(this).addClass('jm_hover');
	});
	
	// Focus events on this buddy
	jQuery(element).focus(function() {
		jQuery('#jappix_mini a.jm_friend.jm_hover').removeClass('jm_hover');
		jQuery(this).addClass('jm_hover');
	});
	
	// Blur events on this buddy
	jQuery(element).blur(function() {
		jQuery(this).removeClass('jm_hover');
	});
	
	return true;
}

// Removes a roster buddy
function removeBuddyMini(hash, groupchat) {
	// Remove the buddy from the roster
	jQuery('#jappix_mini a.jm_friend#friend-' + hash).remove();
	
	// Empty group?
	var group = '#jappix_mini div.jm_roster div.jm_grouped[data-xid=' + escape(groupchat) + ']';
	
	if(groupchat && !jQuery(group + ' a.jm_friend').size())
		jQuery(group).remove();
	
	return true;
}

// Gets the user's roster
function getRosterMini() {
	var iq = new JSJaCIQ();
	iq.setType('get');
	iq.setQuery(NS_ROSTER);
	con.send(iq, handleRosterMini);
	
	logThis('Getting roster...', 3);
}

// Handles the user's roster
function handleRosterMini(iq) {
	// Added to sort buddies by name
    var buddies = [];
    var i = 0;
	
	// Parse the roster
	jQuery(iq.getQuery()).find('item').each(function() {
		// Get the values
		var current = jQuery(this);
		var xid = current.attr('jid');
		var subscription = current.attr('subscription');
		
		// Not a gateway
		if(!isGateway(xid)) {
			var nick = current.attr('name');
			var hash = hex_md5(xid);
			
			// Multidimentional array
			buddies[i] = [];
			
			// No name is defined?
			if(!nick)
				nick = getXIDNick(xid);
			
			// Populate buddy array
            buddies[i][0] = nick;
            buddies[i][1] = hash;
            buddies[i][2] = xid;
            buddies[i][3] = subscription;
		}
		
		// Increment counter
		i++;
	});
	
    // Sort array and loop reverse
    var buddies = buddies.sort();
    var x = buddies.length;
    var nick, hash, xid, subscription;
    
    for (var i=0;i<x; i++) {
	if (!buddies[i]) continue;

        nick = buddies[i][0];
        hash = buddies[i][1];
        xid = buddies[i][2];
        subscription = buddies[i][3];
    	
    	if(subscription == 'remove')
			removeBuddyMini(hash);
    	else
			addBuddyMini(xid, hash, nick, null, subscription);
    }
    
	// Not yet initialized
	if(!MINI_INITIALIZED)
		initializeMini();
	
	logThis('Roster got.', 3);
}

// Adapts the roster height to the window
function adaptRosterMini() {
	// Process the new height
	var height = jQuery(window).height() - 85;
	
	// Apply the new height
	jQuery('#jappix_mini div.jm_roster div.jm_buddies').css('max-height', height);
}

// Generates a random nickname
function randomNickMini() {
	// First nickname block
	var first_arr = [
		'Just',
		'Bob',
		'Jar',
		'Pedr',
		'Yod',
		'Maz',
		'Vez',
		'Car',
		'Erw',
		'Tiet',
		'Iot',
		'Wal',
		'Bez',
		'Pop',
		'Klop',
		'Zaz',
		'Yoy',
		'Raz'
	];
	
	// Second nickname block
	var second_arr = [
		'io',
		'ice',
		'a',
		'u',
		'o',
		'ou',
		'oi',
		'ana',
		'oro',
		'izi',
		'ozo',
		'aza',
		'ato',
		'ito',
		'ofa',
		'oki',
		'ima',
		'omi'
	];
	
	// Last nickname block
	var last_arr = [
		't',
		'z',
		'r',
		'n',
		'tt',
		'zz',
		'pp',
		'j',
		'k',
		'v',
		'c',
		'x',
		'ti',
		'to',
		'ta',
		'ra',
		'ro',
		'ri'
	];
	
	// Select random values from the arrays
	var rand_nick = randomArrayValue(first_arr) + randomArrayValue(second_arr) + randomArrayValue(last_arr);
	
	return rand_nick;
}

//TypeWatch - don't search unless done typing
var typewatch = (function() {
  var timer = 0;
  return function(callback, ms) {
    clearTimeout(timer);
    timer = setTimeout(callback, ms);
  }  
})();

// Plugin launcher
function launchMini(autoconnect, show_pane, domain, user, password) {
	// Save infos to reconnect
	MINI_DOMAIN = domain;
	MINI_USER = user;
	MINI_PASSWORD = password;
	
	// Anonymous mode?
	if(!user || !password)
		MINI_ANONYMOUS = true;
	else
		MINI_ANONYMOUS = false;
	
	// Autoconnect (only if storage available to avoid floods)?
	if(autoconnect && hasDB())
		MINI_AUTOCONNECT = true;
	else
		MINI_AUTOCONNECT = false;
	
	// Show pane?
	if(show_pane)
		MINI_SHOWPANE = true;
	else
		MINI_SHOWPANE = false;
	
	// Remove Jappix Mini
	jQuery('#jappix_mini').remove();
	
	// Reconnect?
	if(MINI_RECONNECT) {
		logThis('Trying to reconnect (try: ' + MINI_RECONNECT + ')!');
		
		return createMini(domain, user, password);
	}
	
	// Append the Mini stylesheet
	jQuery('head').append('<link rel="stylesheet" href="' + JAPPIX_STATIC + 'css/mini.css' + '" type="text/css" media="all" />');
	
	// Legacy IE stylesheet
	if(jQuery.browser.msie && ( parseInt(jQuery.browser.version) < 7 ) )
		jQuery('head').append('<link rel="stylesheet" href="' + JAPPIX_STATIC + 'css/mini-ie.css' + '" type="text/css" media="all" />');
	
	// Disables the browser HTTP-requests stopper
	jQuery(document).keydown(function(e) {
		if((e.keyCode == 27) && !isDeveloper())
			return false;
	});
	
	// Save the page title
	MINI_TITLE = document.title;
	
	// Adapts the content to the window size
	jQuery(window).resize(function() {
		adaptRosterMini();
		updateOverflowMini();
	});
	
	// Logouts when Jappix is closed
	if(jQuery.browser.opera) {
		// Emulates onbeforeunload on Opera (link clicked)
		jQuery('a[href]:not([onclick])').click(function() {
			// Link attributes
			var href = jQuery(this).attr('href') || '';
			var target = jQuery(this).attr('target') || '';
			
			// Not new window or JS link
			if(href && !href.match(/^#/i) && !target.match(/_blank|_new/i))
				saveSessionMini();
		});
		
		// Emulates onbeforeunload on Opera (form submitted)
		jQuery('form:not([onsubmit])').submit(saveSessionMini);
	}
	
	jQuery(window).bind('beforeunload', saveSessionMini);
	
	// Create the Jappix Mini DOM content
	createMini(domain, user, password);
	
	logThis('Welcome to Jappix Mini! Happy coding in developer mode!');
}
