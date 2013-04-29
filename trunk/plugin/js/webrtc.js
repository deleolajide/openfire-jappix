/*===========================================================================*
*                       		                                     *
*                                                                            *
*      Class methods     					 	     *
*                                                                            *
*                                                                            *
*============================================================================*/


WebRtc = function(room) 
{
	this.room = room;
	this.pc = null;	
	this.farParty = null;
	this.inviter = false;
	this.closed = true;
	this.candidates = new Array();	
	this.localVideoPreview = "localVideoPreview";
	this.remoteVideo = "remoteVideo";
	this.remoteRoomMuteType = "room";
}

WebRtc.peers = {}; 
WebRtc.rooms = {}; 

WebRtc.log = function (msg) {console.log(msg)}; 


WebRtc.init =  function(connection, peerConfig)
{
	WebRtc.log("WebRtc.init");

	if (!window.webkitRTCPeerConnection) 
	{
		var msg = "webkitRTCPeerConnection not supported by this browser";			
		alert(msg);
		throw Error(msg);
	}

	WebRtc.peerConfig = peerConfig;
	WebRtc.connection = connection;	
};

WebRtc.terminate = function()
{
	WebRtc.log("WebRtc.terminate");
	
	var peers = Object.getOwnPropertyNames(WebRtc.peers)
	
	for (var i=0; i< peers.length; i++)
	{
		var peer = WebRtc.peers[peers[i]];

		if (peer && peer.pc)
		{		
			peer.terminate();
			WebRtc.peers[peers[i]] = null;
			peer = null;
		}
	}
	
	WebRtc.peers = {}; 
	WebRtc.rooms = {}; 		
};


WebRtc.setPeer = function (uniqueKey, room)
{
	WebRtc.log("WebRtc.setPeer " + uniqueKey + " " + room);
		
	if (WebRtc.peers[uniqueKey] == null)
	{
		WebRtc.peers[uniqueKey] = new WebRtc(room);
	} else {
		
		WebRtc.peers[uniqueKey].room = room;
	}
		
};

WebRtc.getPeer = function (jid)
{
	WebRtc.log("WebRtc.getPeer " + jid);
	
	return WebRtc.peers[WebRtc.escape(jid)];

};


WebRtc.handleMessage = function(message, jid, room)
{
	var uniqueKey = WebRtc.escape(jid)

	WebRtc.log("WebRtc.handleMessage " + jid + " " + room + " " + uniqueKey);
	console.log(message)
	
	if (message.getAttribute("type") == "error" || message.getElementsByTagName("action").length == 0)
	{
		return;
	}
		
	var action = message.getElementsByTagName("action")[0].firstChild.data;
	
	
	if (action == "answer")
	{
		var peer = WebRtc.peers[uniqueKey]

		if (peer && peer.pc)
		{
			peer.handleAnswer(message);

		}
		return;
	}
	
	if (action == "candidate")
	{
		var peer = WebRtc.peers[uniqueKey]

		if (peer && peer.pc)
		{
			peer.handleCandidate(message);

		}
		return;	
	}
	
	if (action == "offer")
	{
		WebRtc.setPeer(uniqueKey, room);
		WebRtc.peers[uniqueKey].handleOffer(message, jid);
		
		return;
	}

	
	var channels = message.getElementsByTagName("channel");

	if (channels.length > 0)
	{
		var peer = WebRtc.peers[uniqueKey]

		if (peer && peer.pc)
		{
			peer.handleChannel(channels[0]);

		}
		return;	
	}
};


WebRtc.handleRoster = function(myJid, jid, room, action)
{
	WebRtc.log("WebRtc.handleRoster " + myJid + " " + jid + " " + room + " " + action);

	var uniqueKey = WebRtc.escape(jid)
		
	if (action == "chat")
	{
		WebRtc.log("WebRtc.handleRoster opening chat with " + room);					
		WebRtc.rooms[room] = {ready: true, active: false, muted: false};		
		WebRtc.setPeer(uniqueKey, room);
			
		WebRtc.peers[uniqueKey].initiate(jid);			
	}
	
	if (action == "join")
	{
		if (myJid == jid)
		{
			WebRtc.log("WebRtc.handleRoster opening room " + room);					
			WebRtc.rooms[room] = {ready: true, active: false, muted: false};
		}

		if (WebRtc.rooms[room] == null && myJid != jid)
		{
			WebRtc.setPeer(uniqueKey, room);			
			WebRtc.peers[uniqueKey].initiate(jid);
		}			
	}	

	if (action == "leave")
	{
		if (myJid == jid)	// I have left, close all peerconnections
		{
			WebRtc.log("WebRtc.handleRoster closing room " + room);					
			WebRtc.rooms[room] = null;
			
			var peers = Object.getOwnPropertyNames(WebRtc.peers)

			for (var i=0; i< peers.length; i++)
			{
				var peer = WebRtc.peers[peers[i]];
				
				if (peer.room == room)
				{
					peer.terminate();	
				}
			}
			
		} else {				// someone has left, close their peerconnection
			var peer = WebRtc.peers[uniqueKey]

			if (peer != null)
			{		
				peer.terminate();		
			}		
		}
	}

};


WebRtc.textToXML = function(text)
{
	var doc = null;

	if (window['DOMParser']) {
	    var parser = new DOMParser();
	    doc = parser.parseFromString(text, 'text/xml');

	} else if (window['ActiveXObject']) {
	    var doc = new ActiveXObject("MSXML2.DOMDocument");
	    doc.async = false;
	    doc.loadXML(text);

	} else {
	    throw Error('No DOMParser object found.');
	}

	return doc.firstChild;
};

WebRtc.escape = function(s)
{
        return s.replace(/^\s+|\s+$/g, '')
            .replace(/\\/g,  "")
            .replace(/ /g,   "")
            .replace(/\"/g,  "")
            .replace(/\&/g,  "")
            .replace(/\'/g,  "")
            .replace(/\//g,  "")
            .replace(/:/g,   "")
            .replace(/</g,   "")
            .replace(/>/g,   "")
            .replace(/\./g,  "")            
            .replace(/@/g,   "");

};

/*===========================================================================*
*                       		                                     *
*                                                                            *
*                Object Methods						     *
*                                                                            *
*                                                                            *
*============================================================================*/



WebRtc.prototype.initiate = function(farParty)
{
	WebRtc.log("initiate " + farParty);

	this.farParty = farParty;
	this.inviter = true;	
	
	var _webrtc = this;
				
	this.createPeerConnection(function() {

		WebRtc.log("initiate createPeerConnection callback");
	
		if (this.pc != null)
		{
			this.pc.createOffer( function(desc) 
			{
				_webrtc.pc.setLocalDescription(desc);
				_webrtc.sendSDP(desc.sdp); 				

			});		
		}	
	});
}

WebRtc.prototype.terminate = function ()
{
	WebRtc.log("terminate");

	if (this.pc != null) this.pc.close();
	this.pc = null;	
}


WebRtc.prototype.handleAnswer = function(elem)
{
	WebRtc.log("handleAnswer");

	var sdp = elem.getElementsByTagName("sdp")[0].firstChild.data;	

	this.inviter= true;
	this.pc.setRemoteDescription(new RTCSessionDescription({type: "answer", sdp : sdp}));
	
	this.addJingleNodesCandidates();	

}

WebRtc.prototype.handleOffer = function(elem, jid)
{
	WebRtc.log("handleOffer");

	var sdp = elem.getElementsByTagName("sdp")[0].firstChild.data;	
	
	var _webrtc = this;
	
	this.createPeerConnection(function() {

		WebRtc.log("handleOffer createPeerConnection callback");
		
		_webrtc.inviter= false;	
		_webrtc.farParty = jid;
		_webrtc.pc.setRemoteDescription(new RTCSessionDescription({type: "offer", sdp : sdp}));	
		
	});

}


WebRtc.prototype.handleCandidate = function(elem)
{
	WebRtc.log("handleCandidate");
	
	var label = elem.getElementsByTagName("label")[0].firstChild.data;
	var candidate = elem.getElementsByTagName("candidate")[0].firstChild.data;
	
	var ice = {sdpMLineIndex: label, candidate: candidate};
	var iceCandidate = new RTCIceCandidate(ice);
	
	if (this.farParty == null)	
	{
		this.candidates.push(iceCandidate);
	} else {
		this.pc.addIceCandidate(iceCandidate);
	}	
}

WebRtc.prototype.handleChannel = function(channel)
{
	WebRtc.log("handleChannel");

	var relayHost = channel.getAttribute("host");
	var relayLocalPort = channel.getAttribute("localport");
	var relayRemotePort = channel.getAttribute("remoteport");

	WebRtc.log("add JingleNodes candidate: " + relayHost + " " + relayLocalPort + " " + relayRemotePort); 

	this.sendTransportInfo("0", "a=candidate:3707591233 1 udp 2113937151 " + relayHost + " " + relayRemotePort + " typ host generation 0");				

	var candidate = new RTCIceCandidate({sdpMLineIndex: "0", candidate: "a=candidate:3707591233 1 udp 2113937151 " + relayHost + " " + relayLocalPort + " typ host generation 0"});				
	this.pc.addIceCandidate(candidate);				
}


WebRtc.prototype.createPeerConnection = function(callback)
{
	WebRtc.log("createPeerConnection");

	this.candidates = new Array();
	this.createCallback = callback;
	this.pc = new window.webkitRTCPeerConnection(WebRtc.peerConfig);

	this.pc.onicecandidate = this.onIceCandidate.bind(this);		
	this.pc.onstatechange = this.onStateChanged.bind(this);
	this.pc.onopen = this.onSessionOpened.bind(this);
	this.pc.onaddstream = this.onRemoteStreamAdded.bind(this);
	this.pc.onremovestream = this.onRemoteStreamRemoved.bind(this);
	
	this.pc.addStream(WebRtc.localStream);
	this.createCallback();	
	this.closed = false;	
}


WebRtc.prototype.onUserMediaError = function (error)
{
	WebRtc.log("onUserMediaError " + error.code);
}

WebRtc.prototype.onIceCandidate = function (event)
{
	WebRtc.log("onIceCandidate");

	while (this.candidates.length > 0)
	{
		var candidate = this.candidates.pop();

		console.log("Retrieving candidate " + candidate.candidate);		    

		this.pc.addIceCandidate(candidate);
	}
	
	if (event.candidate && this.closed == false)
	{		
		this.sendTransportInfo(event.candidate.sdpMLineIndex, event.candidate.candidate);
	}	
		
}


WebRtc.prototype.onSessionOpened = function (event)
{
	WebRtc.log("onSessionOpened");
	WebRtc.log(event);
}

WebRtc.prototype.onRemoteStreamAdded = function (event)
{
	var url = webkitURL.createObjectURL(event.stream);
	WebRtc.log("onRemoteStreamAdded " + url);
	
	if (this.inviter == false)
	{
	    var _webrtc = this;	
	    
	    this.pc.createAnswer( function (desc)
	    {
		_webrtc.pc.setLocalDescription(desc);			
		_webrtc.sendSDP(desc.sdp); 	
		
	    });	
	    
	    if (this.pc.getLocalStreams()[0].getAudioTracks().length > 0) 
		this.pc.getLocalStreams()[0].getAudioTracks()[0].enabled = false;

	    if (this.pc.getLocalStreams()[0].getVideoTracks().length > 0) 
		this.pc.getLocalStreams()[0].getVideoTracks()[0].enabled = false;	    	
	} 
		
	if (WebRtc.callback) WebRtc.callback.onReady(this); // get UI this.localvideo & this.remotevideo IDs

	document.getElementById(this.remoteVideo).src = url;
	document.getElementById(this.remoteVideo).play();		
}

WebRtc.prototype.onRemoteStreamRemoved = function (event)
{
	var url = webkitURL.createObjectURL(event.stream);
	WebRtc.log("onRemoteStreamRemoved " + url);
	WebRtc.log(event);
}

WebRtc.prototype.onStateChanged = function (event)
{
	WebRtc.log("onStateChanged");
	WebRtc.log(event);
}



WebRtc.prototype.sendSDP = function(sdp)
{
	WebRtc.log("sendSDP");
	WebRtc.log(sdp);	
	
	var msg = "";
	msg += "<message  type='chat' to='" + this.farParty + "'>";	
	msg += "<webrtc xmlns='http://webrtc.org/xmpp'>";
	
	if (this.inviter)
	{
		msg += "<action>offer</action>";	
	} else {
		msg += "<action>answer</action>";	
	}

	msg += "<sdp>" + sdp+ "</sdp>";		
	msg += "</webrtc>";
	msg += "</message>";	
	
	this.sendPacket(msg);
}


WebRtc.prototype.sendTransportInfo = function (sdpMLineIndex, candidate)
{
	WebRtc.log("sendTransportInfo");

	var msg = "";
	msg += "<message type='chat' to='" + this.farParty + "'>";	
	msg += "<webrtc xmlns='http://webrtc.org/xmpp'>";
	msg += "<action>candidate</action>";		
	msg += "<label>" + sdpMLineIndex + "</label>";
	msg += "<candidate>" + candidate + "</candidate>";		
	msg += "</webrtc>";
	msg += "</message>";		
	
	this.sendPacket(msg);	
}


WebRtc.prototype.addJingleNodesCandidates = function() 
{
	WebRtc.log("addJingleNodesCandidates");
	
	var iq = "";
	var id = this.farParty;
		
	iq += "<iq type='get' to='" +  "relay." + window.location.hostname + "' id='" + id + "'>";
	iq += "<channel xmlns='http://jabber.org/protocol/jinglenodes#channel' protocol='udp' />";
	iq += "</iq>";	
	
	this.sendPacket(iq);	
}


WebRtc.prototype.sendPacket = function(packet) {

	try {	
		if (WebRtc.connection instanceof Strophe.Connection) 
		{	
			var xml = WebRtc.textToXML(packet);

			WebRtc.log("sendPacket with Strophe.Connection");
			WebRtc.log(xml);		

			WebRtc.connection.send(xml);		

		} else {

			WebRtc.log("sendPacket as String");
			WebRtc.log(packet);

			WebRtc.connection.sendXML(packet);
		}
	
	} catch (e) {

		WebRtc.log("sendPacket as String");
		WebRtc.log(packet);

		WebRtc.connection.sendXML(packet);	
	}
};

