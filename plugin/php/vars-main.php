<?php

/*

Jappix - An open social platform
These are the main configuration variables

-------------------------------------------------

License: AGPL
Author: Vanaryon
Last revision: 12/06/12

*/

// Someone is trying to hack us?
if(!defined('JAPPIX_BASE'))
	exit;

// Define the vars with the main configuration constants
$service_name = htmlspecialchars(SERVICE_NAME);
$service_desc = htmlspecialchars(SERVICE_DESC);
$owner_name = htmlspecialchars(OWNER_NAME);
$owner_website = htmlspecialchars(OWNER_WEBSITE);
$legal = htmlspecialchars(LEGAL);
$jappix_resource = htmlspecialchars(JAPPIX_RESOURCE);
$lock_host = htmlspecialchars(LOCK_HOST);
$anonymous_mode = htmlspecialchars(ANONYMOUS);
$http_auth = htmlspecialchars(HTTP_AUTH);
$registration = htmlspecialchars(REGISTRATION);
$bosh_proxy = htmlspecialchars(BOSH_PROXY);
$manager_link = htmlspecialchars(MANAGER_LINK);
$groupchats_join = htmlspecialchars(GROUPCHATS_JOIN);
$encryption = htmlspecialchars(ENCRYPTION);
$https_storage = htmlspecialchars(HTTPS_STORAGE);
$https_force = htmlspecialchars(HTTPS_FORCE);
$compression = htmlspecialchars(COMPRESSION);
$multi_files = htmlspecialchars(MULTI_FILES);
$developer = htmlspecialchars(DEVELOPER);
$statistics = htmlspecialchars(STATISTICS);

?>
