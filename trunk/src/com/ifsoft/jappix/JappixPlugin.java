package com.ifsoft.jappix;

import org.jivesoftware.openfire.container.Plugin;
import org.jivesoftware.openfire.container.PluginManager;
import org.jivesoftware.util.*;
import org.jivesoftware.openfire.http.HttpBindManager;
import org.jivesoftware.openfire.session.LocalClientSession;
import org.jivesoftware.openfire.SessionManager;

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

import com.ifsoft.jappix.servlet.XMPPServlet;
import com.ifsoft.jappix.websockets.*;

import org.red5.server.webapp.voicebridge.Application;

import com.ifsoft.cti.OpenlinkComponent;


public class JappixPlugin implements Plugin {

	private static Logger Log = LoggerFactory.getLogger("JappixPlugin");
	private static final String NAME 		= "jappix";
	private static final String DESCRIPTION = "Jappix Plugin for Openfire";

	private PluginManager manager;
    private File pluginDirectory;

    private ConcurrentHashMap<String, XMPPServlet.XMPPWebSocket> sockets = new ConcurrentHashMap<String, XMPPServlet.XMPPWebSocket>();
    private OpenlinkComponent component;
   	private Application application;

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

				if ("websockets".equals(JiveGlobals.getProperty("jappix.webapp.connection", "bosh")))
				{
					Log.info( "["+ NAME + "] initialize " + NAME + " initialize Websockets " + appName);
					ServletContextHandler context = new ServletContextHandler(contexts, "/" + appName, ServletContextHandler.SESSIONS);
					context.addServlet(new ServletHolder(new XMPPServlet()),"/server");
				}


				Log.info( "["+ NAME + "] initialize " + NAME + " initialize Web App " + appName);
				WebAppContext context2 = new WebAppContext(contexts, pluginDirectory.getPath(), "/" + appName);
				context2.setWelcomeFiles(new String[]{"index.php"});

				Log.info( "["+ NAME + "] initialize " + NAME + " starting Openlink Component ");
				component = new OpenlinkComponent(this);
				component.componentEnable();

				Log.info( "["+ NAME + "] initialize " + NAME + " starting VOIP Server ");
				application = new Application();
				application.appStart(component);
				component.setApplication(application);

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

		try {

			for (XMPPServlet.XMPPWebSocket socket : sockets.values())
			{
				try {
					LocalClientSession session = socket.getSession();
					session.close();
					SessionManager.getInstance().removeSession( session );
					session = null;

				} catch ( Exception e ) { }
			}

			sockets.clear();
			application.appStop();
			component.componentDestroyed();

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

	public int getCount() {
		return this.sockets.size();
	}

	public ConcurrentHashMap<String, XMPPServlet.XMPPWebSocket> getSockets() {
		return sockets;
	}
}