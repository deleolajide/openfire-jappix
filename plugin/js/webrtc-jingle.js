
WebRtcJingle = function() 
{
	if (!window.webkitPeerConnection00) 
	{
		var msg = "webkitPeerConnection00 not supported by this browser";			
		alert(msg);
		throw Error(msg);

	}

	this.localOffer = null;
	this.remoteOffer = null;
	this.localStream = null;
	this.callback = null;
	this.pc = null;
	this.sid = null;	
	this.farParty = null;
	this.username = null;
	this.interval = null;
	this.initiator = false;
	this.started = false;
	this.stunServer = null
	this.connection = null;
	this.callId = null;
	this.hidef = false;
	
}

WebRtcJingle.prototype.startApp =  function(callback, stunServer, username)
{
	console.log("startApp");

	this.callback = callback;
	this.stunServer = stunServer;
	this.username = username;
	
	this.getUserMedia();
}


WebRtcJingle.prototype.stopApp = function ()
{
	console.log("stopApp");
	
	this.jingleTerminate();

	if (this.pc != null) this.pc.close();
	this.pc = null;
		
}

WebRtcJingle.prototype.getUserMedia  = function()
{
	console.log("getUserMedia");

	navigator.webkitGetUserMedia({audio:true, video:false}, this.onUserMediaSuccess.bind(this), this.onUserMediaError.bind(this));
}

WebRtcJingle.prototype.onUserMediaSuccess = function(stream)
{
	var url = webkitURL.createObjectURL(stream);
	console.log("onUserMediaSuccess " + url);
	this.localStream = stream;
	
	if (this.callback != null)
	{
		this.callback.startLocalMedia(url);
	}
}

WebRtcJingle.prototype.onUserMediaError = function (error)
{
	console.log("onUserMediaError " + error.code);
}


WebRtcJingle.prototype.onMessage = function(jingle)
{
	console.log("webrtc - onMessage");
	console.log(jingle);
	
	if (jingle.nodeName == "jingle" && jingle.getAttribute("action") != "session-terminate")
	{
		var sdp = this.getSdpFromJingle(jingle);
		
		if (this.pc == null)
		{
			this.createPeerConnection();
		}
		
		if (jingle.getAttribute("action") == "session-initiate")
		{
			this.initiator = false;			
			this.remoteOffer = new SessionDescription(sdp);

		} else {

			this.initiator = true;

			var answer = new SessionDescription(sdp);
			this.pc.setRemoteDescription(this.pc.SDP_ANSWER, answer);
		}
		
	} else {

		this.doCallClose();
	}
	
}

WebRtcJingle.prototype.acceptCall = function(farParty)
{
	console.log("acceptCall");

	this.started = false;
	this.farParty = farParty;
	this.pc.setRemoteDescription(this.pc.SDP_OFFER, this.remoteOffer);	
}

WebRtcJingle.prototype.onConnectionClose = function()
{
	console.log("webrtc - onConnectionClose");

	this.doCallClose();	
}
	

WebRtcJingle.prototype.jingleInitiate = function(farParty, hidef)
{
	console.log("jingleInitiate " + farParty);

	this.farParty = farParty;
	this.hidef = hidef;
	
	this.initiator = true;
	this.started = false;	
	
	this.createPeerConnection();
	
	if (this.pc != null)
	{
		this.localOffer = this.pc.createOffer({has_audio: true, has_video: false});	
		this.pc.setLocalDescription(this.pc.SDP_OFFER, this.localOffer);
		this.pc.startIce({ use_candidates: "all" });
	}
}

WebRtcJingle.prototype.jingleTerminate = function ()
{
	console.log("jingleTerminate");

	this.sendJingleTerminateIQ()
	this.doCallClose();
}

WebRtcJingle.prototype.doCallClose = function ()
{
	if (this.pc != null) this.pc.close();
	this.pc = null;
}
	

WebRtcJingle.prototype.createPeerConnection = function()
{
	console.log("createPeerConnection");

	this.pc = new window.webkitPeerConnection00("STUN " + this.stunServer, this.onIceCandidate.bind(this));
	
	this.pc.onstatechange = this.onStateChanged.bind(this);
	this.pc.onopen = this.onSessionOpened.bind(this);
	this.pc.onaddstream = this.onRemoteStreamAdded.bind(this);
	this.pc.onremovestream = this.onRemoteStreamRemoved.bind(this);
	
	this.pc.addStream(this.localStream);

}

WebRtcJingle.prototype.onIceCandidate = function (candidate, moreToFollow)
{
	console.log("onIceCandidate");
	
	if (moreToFollow)
	{
		//console.log(candidate);
		this.localOffer.addCandidate(candidate);

	} 	else {

		if (this.started == false)
		{
			this.sendJingleIQ(this.localOffer.toSdp());
			this.started = true;
		}
	}	
}


WebRtcJingle.prototype.onSessionOpened = function (event)
{
	console.log("onSessionOpened");
	console.log(event);
}

WebRtcJingle.prototype.onRemoteStreamAdded = function (event)
{
	var url = webkitURL.createObjectURL(event.stream);
	console.log("onRemoteStreamAdded " + url);
	console.log(event);
	
	if (this.initiator == false)
	{
		this.localOffer = this.pc.createAnswer(this.remoteOffer.toSdp(), {has_audio: true, has_video: false});
		this.pc.setLocalDescription(this.pc.SDP_ANSWER, this.localOffer);
		this.pc.startIce({ use_candidates: "all" });
	}
	
	if (this.callback != null)
	{
		this.callback.startRemoteMedia(url, this.farParty);
	}		
}

WebRtcJingle.prototype.onRemoteStreamRemoved = function (event)
{
	var url = webkitURL.createObjectURL(event.stream);
	console.log("onRemoteStreamRemoved " + url);
	console.log(event);
}

WebRtcJingle.prototype.onStateChanged = function (event)
{
	//console.log("onStateChanged");
	//console.log(event);
}



WebRtcJingle.prototype.sendJingleTerminateIQ = function()
{
	if (this.callback != null)
	{
		var jIQ = "<iq type='set' to='" + this.farParty + "' id='" + this.sid + "'>";
		jIQ = jIQ + "<jingle xmlns='urn:xmpp:jingle:1' action='session-terminate' initiator='" + this.username + "@" + window.location.hostname + "' sid='" + this.sid + "'>";
		jIQ = jIQ + "<reason><success/></reason></jingle></iq>"

		this.callback.sendPacket(jIQ);
	}
}

WebRtcJingle.prototype.makeCall = function(sipUrl)
{
	if (this.callback != null)
	{
		if (this.callId != null)
		{
			this.clearCall();
		}
		
		this.callId = "webrtc-" + Math.random().toString(36).substr(2,9);
		
		var olIQ = "<iq type='set' to='" + "openlink." + window.location.hostname + "' id='" + this.callId + "'>";
		olIQ = olIQ + "<command xmlns='http://jabber.org/protocol/commands' action='execute' node='http://xmpp.org/protocol/openlink:01:00:00#manage-voice-bridge'>";
		olIQ = olIQ + "<iodata xmlns='urn:xmpp:tmp:io-data' type='input'><in><jid>" + this.username + "@" + window.location.hostname + "</jid><actions>"
		olIQ = olIQ + "<action><name>Protocol</name><value1>" + this.callId + "</value1><value2>SIP</value2></action>"
		olIQ = olIQ + "<action><name>SetPhoneNo</name><value1>" + this.callId + "</value1><value2>" + sipUrl + "</value2></action>"
		olIQ = olIQ + "<action><name>SetConference</name><value1>" + this.callId + "</value1><value2>" + this.username + "</value2></action>"
		olIQ = olIQ + "<action><name>MakeCall</name><value1>" + this.callId + "</value1></action>"		
		olIQ = olIQ + "</actions></in></iodata></command></iq>"	
		
		this.callback.sendPacket(olIQ);
	}
}

WebRtcJingle.prototype.clearCall = function()
{
	if (this.callback != null && this.callId != null)
	{		
		var olIQ = "<iq type='set' to='" + "openlink." + window.location.hostname + "' id='" + this.callId + "'>";
		olIQ = olIQ + "<command xmlns='http://jabber.org/protocol/commands' action='execute' node='http://xmpp.org/protocol/openlink:01:00:00#manage-voice-bridge'>";
		olIQ = olIQ + "<iodata xmlns='urn:xmpp:tmp:io-data' type='input'><in><jid>" + this.username + "@" + window.location.hostname + "</jid><actions>"
		olIQ = olIQ + "<action><name>CancelCall</name><value1>" + this.callId + "</value1></action>"		
		olIQ = olIQ + "</actions></in></iodata></command></iq>"	
		
		this.callback.sendPacket(olIQ);	
	}
}

WebRtcJingle.prototype.sendDTMF = function(key)
{
	if (this.callback != null && this.callId != null)
	{		
		var olIQ = "<iq type='set' to='" + "openlink." + window.location.hostname + "' id='" + this.callId + "'>";
		olIQ = olIQ + "<command xmlns='http://jabber.org/protocol/commands' action='execute' node='http://xmpp.org/protocol/openlink:01:00:00#manage-voice-bridge'>";
		olIQ = olIQ + "<iodata xmlns='urn:xmpp:tmp:io-data' type='input'><in><jid>" + this.username + "@" + window.location.hostname + "</jid><actions>"
		olIQ = olIQ + "<action><name>SendDtmfKey</name><value1>" + this.callId + "</value1><value2>" + key + "</value2></action>"		
		olIQ = olIQ + "</actions></in></iodata></command></iq>"	
		
		this.callback.sendPacket(olIQ);	
	}
}

WebRtcJingle.prototype.sendJingleIQ = function(sdp)
{
	if (this.callback == null)
	{
		return;
	}

	console.log("sendJingleIQ");
	console.log(sdp);

	var action = this.initiator ? "session-initiate" : "session-accept";

	this.sid 	= this.getToken(sdp, "o=- ", " ");

	var ipaddr 	= this.getToken(sdp, "c=IN IP4 ", "\r\n");
	var port 	= this.getToken(sdp, "m=audio ", " ");
	var ufrag 	= this.getToken(sdp, "a=ice-ufrag:", "\r\n");
	var passw 	= this.getToken(sdp, "a=ice-pwd:", "\r\n");
	var crypto1 	= this.getToken(sdp, "AES_CM_128_HMAC_SHA1_80 inline:", "\r\n");
	var crypto2	= this.getToken(sdp, "AES_CM_128_HMAC_SHA1_32 inline:", "\r\n");
	var ssrc  	= this.getToken(sdp, "a=ssrc:", " ");
	var cname 	= this.getToken(sdp, "a=ssrc:" + ssrc + " cname:", "\r\n");
	var mslabel 	= this.getToken(sdp, "a=ssrc:" + ssrc + " mslabel:", "\r\n");
	var label 	= this.getToken(sdp, "a=ssrc:" + ssrc + " label:", "\r\n");
	var fndtn 	= this.getToken(sdp, "a=candidate:", " ");
	var prior	= this.getToken(sdp, "a=candidate:" + fndtn + " 1 udp ", " ");

	console.log("sid = " + this.sid + " ip " + ipaddr + " port " + port + " ufrag " + ufrag + " passw " + passw + " crypto " + crypto1 + " ssrc cname " + cname);

	var iq = "";

	iq += "<iq type='set' to='" +  this.farParty + "' id='" + this.sid + "'>";
	iq += "<jingle xmlns='urn:xmpp:jingle:1' action='" + action + "' initiator='" + this.username + "@" + window.location.hostname + "' sid='" + this.sid + "'>";

	iq += "<content creator='initiator' name='audio'>"
	iq += "	<description xmlns='urn:xmpp:jingle:apps:rtp:1' profile='RTP/SAVPF' media='audio'>"
	
	if (this.hidef)
		iq += "		<payload-type id='104' name='ISAC' clockrate='32000'/>"
	else
		iq += "		<payload-type id='0' name='PCMU' clockrate='8000'/>"
	
	iq += "		<encryption required='1'>"

	if (crypto1 == null)
		iq += "			<crypto crypto-suite='AES_CM_128_HMAC_SHA1_32' key-params='inline:" + crypto2 + "' session-params='KDR=0' tag='0'/>"
	else
		iq += "			<crypto crypto-suite='AES_CM_128_HMAC_SHA1_80' key-params='inline:" + crypto1 + "' session-params='KDR=0' tag='1'/>"

	iq += "		</encryption>";
	iq += "		<streams>"
	iq += "			<stream cname='" + cname + "' mslabel='" + mslabel + "' label='" + label + "'>";
	iq += "				<ssrc>" + ssrc + "</ssrc>"
	iq += "			</stream>";
	iq += "		</streams>"
	iq += "	</description>"
	iq += "	<transport xmlns='urn:xmpp:jingle:transports:raw-udp:1' pwd='" + passw + "' ufrag='" + ufrag + "'>"
	iq += "		<candidate ip='" + ipaddr + "' port='" + port + "' generation='0' />";
	iq += "	</transport>";
	iq += "</content>";
	iq += "</jingle></iq>";

	//console.log(iq);
	this.callback.sendPacket(iq);
}

WebRtcJingle.prototype.getToken = function(sdp, token, delim)
{
	var pos = sdp.indexOf(token);
	var para = null;

	if (pos > -1)
	{
		var para = sdp.substring(pos + token.length);

		if (para.indexOf(delim) > -1)
		{
			para = para.substring(0, para.indexOf(delim));

		} else {

			para = para.substring(0, para.indexOf("\r\n"));
		}

		para = para.trim();
	}

	return para;
}

WebRtcJingle.prototype.getSdpFromJingle = function (jingle)
{
	console.log("getSdpFromJingle");
	console.log(jingle);

	var ssrc = "2607505040";
	var ssrc_cname = "iirNX3Znb0iT+aow"
	var ssrc_mslabel = "fAy0FNrYIDVfeRwX5X0IK5TOCVTNJOXt4Cdb";
	var ssrc_label = "fAy0FNrYIDVfeRwX5X0IK5TOCVTNJOXt4Cdb00";

	var candidate_foundation = "1001321590";
	var candidate_priority = "2130714367";

	var ice_ufrag = "wZPq/BJNlo0K6ej5";
	var ice_pwd = "hLaFhH8Yfl+XeExexulHT42o";
	
	var payload_id = "0";
	var payload_name = "PCMU";
	var payload_clockrate = "8000";
	
	var crypto = jingle.getElementsByTagName("crypto")[0];
	var payload = jingle.getElementsByTagName("payload-type")[0];
	var stream = jingle.getElementsByTagName("stream")[0];
	var candidate = jingle.getElementsByTagName("candidate")[0];
	var transport = jingle.getElementsByTagName("transport")[0];

	if (payload != null)
	{
		payload_id = payload.getAttribute("id");
		payload_name = payload.getAttribute("name");
		payload_clockrate = payload.getAttribute("clockrate");	
		
		if (payload_clockrate == "32000") this.hidef = true;
	}
	
	if (candidate.getAttribute("foundation") != null)
	{
		candidate_foundation = candidate.getAttribute("foundation");
		candidate_priority = candidate.getAttribute("priority");
	}

	if (transport.getAttribute("ufrag") != null)
	{
		ice_ufrag = transport.getAttribute("ufrag");
		ice_pwd = transport.getAttribute("pwd");
	}

	if (stream != null)
	{
		ssrc = jingle.getElementsByTagName("ssrc")[0].firstChild.data;
		ssrc_cname = stream.getAttribute("cname")
		ssrc_mslabel = stream.getAttribute("mslabel")
		ssrc_label = stream.getAttribute("label")
	}

	this.sid = jingle.getAttribute("sid");
	
	var sdp = "";

	sdp += "v=0\r\n";
	sdp += "o=- " + this.sid + " 1 IN IP4 127.0.0.1\r\n";
	sdp += "s=canary\r\n";
	sdp += "t=0 0\r\n";
	sdp += "a=group:BUNDLE audio\r\n";
	sdp += "m=audio " + candidate.getAttribute("port") + " RTP/SAVPF " + payload_id + "\r\n";
	sdp += "c=IN IP4 " + candidate.getAttribute("ip") + "\r\n";
	sdp += "a=rtcp:" + candidate.getAttribute("port") + " IN IP4 " + candidate.getAttribute("ip") + "\r\n";
	sdp += "a=candidate:" + candidate_foundation + " 1 udp " + candidate_priority + " " + candidate.getAttribute("ip") + " " + candidate.getAttribute("port") + " typ host generation 0\r\n";
	sdp += "a=ice-ufrag:" + ice_ufrag + "\r\n";
	sdp += "a=ice-pwd:" + ice_pwd + "\r\n";
	sdp += "a=sendrecv\r\n";
	sdp += "a=mid:audio\r\n";
	sdp += "a=rtcp-mux\r\n";
	sdp += "a=crypto:" + crypto.getAttribute("tag") + " " + crypto.getAttribute("crypto-suite") + " " + crypto.getAttribute("key-params") + "\r\n";
	sdp += "a=rtpmap:" + payload_id + " " + payload_name + "/" + payload_clockrate + "\r\n";	
	sdp += "a=ssrc:" + ssrc + " cname:" + ssrc_cname + "\r\n";
	sdp += "a=ssrc:" + ssrc + " mslabel:" + ssrc_mslabel + "\r\n";
	sdp += "a=ssrc:" + ssrc + " label:" + ssrc_label + "\r\n";

	console.log(sdp);

	return sdp;
}

WebRtcJingle.prototype.textToXML = function (text)
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
}
