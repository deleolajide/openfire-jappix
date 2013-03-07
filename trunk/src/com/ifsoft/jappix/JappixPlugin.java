package com.ifsoft.jappix;

import org.jivesoftware.openfire.container.Plugin;
import org.jivesoftware.openfire.container.PluginManager;
import org.jivesoftware.util.*;
import org.jivesoftware.openfire.http.HttpBindManager;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.ConcurrentHashMap;
import java.io.File;
import java.net.InetSocketAddress;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.webapp.WebAppContext;

public class JappixPlugin implements Plugin {

	private static Logger Log = LoggerFactory.getLogger("JappixPlugin");
	private static final String NAME 		= "jappix";
	private static final String DESCRIPTION = "Jappix Plugin for Openfire";

	private PluginManager manager;
    private File pluginDirectory;

//-------------------------------------------------------
//
//
//
//-------------------------------------------------------

	public void initializePlugin(PluginManager manager, File pluginDirectory) {
		Log.info( "["+ NAME + "] initialize " + NAME + " plugin resources");

		String appName = JiveGlobals.getProperty("jappix.webapp", NAME);

		try {

			ContextHandlerCollection contexts = HttpBindManager.getInstance().getContexts();

			try {

				Log.info( "["+ NAME + "] initialize " + NAME + " initialize Web App " + appName);
				WebAppContext context2 = new WebAppContext(contexts, pluginDirectory.getPath(), "/" + appName);
				context2.setWelcomeFiles(new String[]{"index.php"});
			}
			catch(Exception e) {
				Log.error( "An error has occurred", e );
        	}
		}
		catch (Exception e) {
			Log.error("Error initializing Jappix Plugin", e);
		}
	}

	public void destroyPlugin() {
		Log.info( "["+ NAME + "] destroy " + NAME + " plugin resources");

	}

	public String getName() {
		 return NAME;
	}

	public String getDescription() {
		return DESCRIPTION;
	}
}