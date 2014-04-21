<?php

/*

Jappix - An open social platform
This is the main configuration reader

-------------------------------------------------

License: AGPL
Author: Valérian Saliou, Maranda

*/

// Someone is trying to hack us?
if(!defined('JAPPIX_BASE')) {
    exit;
}

define('SERVICE_NAME', "Jappix");
define('SERVICE_DESC', "Jappix Client");
define('OWNER_NAME', '');
define('OWNER_WEBSITE', '');
define('LEGAL', '');
define('LANGUAGE', 'all');
define('JAPPIX_RESOURCE', "jappix");
define('LOCK_HOST', 'on');
define('ANONYMOUS', 'off');
define('HTTP_AUTH', 'off');
define('REGISTRATION', 'off');
define('MANAGER_LINK', 'off');
define('GROUPCHATS_JOIN', '');
define('GROUPCHATS_SUGGEST', '');
define('ENCRYPTION', 'off');
define('HTTPS_STORAGE', 'off');
define('HTTPS_FORCE', 'off');
define('COMPRESSION', 'off');
define('ANALYTICS_TRACK', 'off');
define('ANALYTICS_URL', '');
define('ANALYTICS_ID', '');
define('ADS_ENABLE', 'off');
define('ADS_STANDARD', '');
define('ADS_CONTENT', '');
define('GADS_CLIENT', '');
define('GADS_SLOT', '');
define('MULTI_FILES', 'off');
define('DEVELOPER', 'off');
define('STATISTICS', 'off');
define('REGISTER_API', '');
define('XMPPD_CTL', '');
define('XMPPD', '');

?>