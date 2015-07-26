## Openfire plugin that embeds Jappix XMPP client and adds webrtc audio/video ##

  * Now upgraded to Jappix Nemesis Alpha 3 [0.9.4~dev] and Quercus 4.0.35

![https://openfire-jappix.googlecode.com/files/Image51.jpg](https://openfire-jappix.googlecode.com/files/Image51.jpg)

This plugin is all you need to run Jappix with Openfire with WebRTC audio/video.

  * No need for Apache web server. It uses Jetty embeded in Openfire
  * No need for PHP server. It uses Quercus Java PHP engine embeded in the plugin
  * No need for BOSH server. It uses Jetty Websockets or Openfire BOSH services
  * To configure Jappix settings, edit /php/read-main.php and red-host.php

![https://openfire-jappix.googlecode.com/files/Image61.jpg](https://openfire-jappix.googlecode.com/files/Image61.jpg)

To use jappix Mini, edit minichat.html

To add support for media relaying, use the JingleNodes plugin for Openfire