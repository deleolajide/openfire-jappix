package com.ifsoft.jappix;

import org.jivesoftware.openfire.container.Plugin;
import org.jivesoftware.openfire.container.PluginManager;
import org.jivesoftware.util.*;
import org.jivesoftware.openfire.http.HttpBindManager;

import java.util.*;
import java.io.File;

// uncomment for openfire 3.6.4
//import org.mortbay.jetty.handler.ContextHandlerCollection;
//import org.mortbay.jetty.webapp.WebAppContext;

// uncomment for openfire 3.7.0
import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.webapp.WebAppContext;


public class JappixPlugin implements Plugin, JappixConstants {

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

		try {

			ContextHandlerCollection contexts = HttpBindManager.getInstance().getContexts();

			try {
				WebAppContext context = new WebAppContext(contexts, pluginDirectory.getPath(), "/" + JiveGlobals.getProperty("jappix.webapp", NAME));
				context.setWelcomeFiles(new String[]{"index.php"});
			}
			catch(Exception e) {

        	}
		}
		catch (Exception e) {
			Log.error("Error initializing Jappix Plugin", e);
		}
	}

	public void destroyPlugin() {
		Log.info( "["+ NAME + "] destroy " + NAME + " plugin resources");

		try {


		}
		catch (Exception e) {
			Log.error("["+ NAME + "] destroyPlugin exception " + e);
		}
	}

	public String getName() {
		 return NAME;
	}

	public String getDescription() {
		return DESCRIPTION;
	}
}