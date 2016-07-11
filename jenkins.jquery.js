/**
 * Jenkins Custom JavaScript/jQuery Code
 * Author: Justin Hyland
 * Created: 06/01/16
 * Updated: 06/30/16
 * This file is loaded by Jenkins via the Simple Theme Plugin (https://wiki.jenkins-ci.org/display/JENKINS/Simple+Theme+Plugin) 
 * in combination with the jQuery Plugin (https://wiki.jenkins-ci.org/display/JENKINS/jQuery+Plugin), and is used to introduce any 
 * customized functionality for the UI, such as setting parameter values based on other parameter values or the job name, etc.
 * 
 * Logic:	The controller.init gets executed on document.ready, and attempts to deduce the viewers username (via the profile link 
 * 		  	in the upper right), and details about the job (via the URL). Since all jobs are separated into the appropriate folder named
 * 		  	after the environment (in the top level), thats how the environment is retrieved, as well as the job name and folder name.
 *			  	Then it's easy to tell if this is a build being executed by searching for /build on the end of the URL. 
 *				Once the controller.init retrieves all of the above information (known as Request Details), it iterates through the functions
 *				stored in controller.jenkinsFunctions, executing them in the order they're stored, and handing the request details as the 
 *				parameter.
 *
 * Notes:	
 *		- 	To add some debugging output to the console, instead of just using console.debug, use utils.console.debug, which is just
 *			a wrapper around console.debug, but will only execute if debugging is enabled.
 *		- 	Enable debugging by adding debug=1 to the URL request parameters, or setting window.debug to 1 or true
 *		- 	To add a function to be executed, create the function anywhere (EG: Deployments object contains some functions), and add
 *			it to the controller.jenkinsFunctions object, in the order it should be called. It will be executed and passed an object as the only
 *			parameter. The object will contain most of the detail about the request that you would need. Heres the layout of the object:
 *	{
 *	 	username: john.d,
 *	 	action: null, build, ws, configure,
 *	 	env: null, Development, Staging, Production,
 *	 	job: {
 *			name: Job Name,
 *		 	path: /Path/To/Job,
 *		 	segments: [ Path, To, Job ]
 *	 	}
 * }
 * 
 * Implemented Functionality:
 * 	- 	Deployments.setDeployRepo gets executed for the job titled Deploy_WebApp within any environment, and simply updates the
 *			parameter named Repository whenever the Web_Application parameter is changed. The Repository value is based off of the 
 *			Web_Application value. The purpose is to assist the builder in selecting the proper repository for the Web_Application being 
 *			being deployed. Deploying the wrong repository to a web application would be a big problem.
 *
 *
 * TODO:
 *		- Deployments.manageEnvParams() needs to be able to work with silo'd environments, like preprod, where theres no a/b
 *		- Fix the getReqDetails() function, the job segments, name and env are incorrect for pre-prod
 */
 
 // Add a function to the Array prototype for removing an element (or elements) from the array
if ( ! Array.prototype.remove ) {
	Array.prototype.remove = function( val ) {
		var i = this.indexOf( val )
		return i>-1 ? this.splice( i, 1 ) : []
	}
}

(function( $ ){
	/**
	 * Settings
	 */
	var settings = {
		// START Custom user settings -------------------------------------------------------------
		// Environment Folders - Add the names of the folders located in the top level of Jenkins,
		// that should be considered "environments"
		envFolders: [
			'Production', 'Development', 'Staging', 'Pre-Prod'
		],
		// List of repositories for projects that do utilize the .env file
		envDependentApps: [ 
			'API','WebApp' 
		],
		// Enable/disable debugging - This is overridden by setting the debug value in the request params
		debug: 0,
		// Determines if the debug level should be set to whatever the debug value may have been in the 
		// referrer. This is useful for when you just append ?debug=N to the request URI, then submit a 
		// form or click a link, as the debug level will stay at N
		persistentDebugging: true,
		// When enabled, a helpful messsage about how to view debugging logs is displayed in the console
		showDebugHelp: true,

		// END Custom user settings ---------------------------------------------------------------
		// Dont change anything below this line, unless you know what you are doing

		/**
		 * Settings below this line are used by the Jenkins jQuery framework, and should only be 
		 * modified if you are fully aware of what will be
		 */
        // Action verbs - This needs to be the exact string to match on the end of the request path
        actionVerbs: [
            'build', 'configure', 'ws', 'rebuild',
            'changes', 'move', 'jobConfigHistory'
        ],
		// Jenkins actions that should be treated the same as the 'build' action
		buildActions: [
			'build', 'rebuild'
		],
		// 
        jenkinsParamTypes: {
        	file			: 'file-upload',
        	tag				: 'subversion',
        	runId			: 'run',
        	credentialType	: 'credentials',
			labels			: 'node'
        },
        // Jenkins parameter value names
		jenkinsParamValueNames: [ 
			'value', 'labels' 
		],
		// Highest debug level allowed - the higher the debug #, the more the verbosity. There is a "debugN" 
		// (where N is the debug level) method returned from Utils.console for each debug verbosity. So if 
		// this gets lowered to a value lower than some existing debugN methods, a fatal error will be 
		// thrown, since that debugN was never created
		maxDebugLevel: 3,
		// Regular Expression patterns used throughout the script. I update these every so often to patterns 
		// that are more stable/reliable, so why not make them easily configurable!
		// Note: Do NOT touch these unless you are 100% sure you know what you're doing, and you've tested 
		// the patterns thoroughly
		regexPatterns: {
			// This matches for any parameters in the URL. 
			// Example - String: http://site.com/page?foo=bar&baz=quux Result: foo=bar&baz=quux
			// Used by: Utils.getUrlParam
			requestUriParams: /^(?:(?:.*)\?)?(.*)$/,
			// Match a username in the href attribute of the element found at $('div#header > div.login > span > a:first')
			// Used by: Utils.pageDetails
			accountLink 	: /^\/user\/(.*)$/,
			// Match for the request path in a provided string (presumably a URL). 
			// Example - String: http://localhost:8080/job/test-job/?foo=bar Result: /job/test-job/
			// Used by: Utils.getJobDetailsFromURL
			urlRequestPath 	: /(?:(?:[^\:]*)\:\/\/)?(?:(?:[^\:\@]*)(?:\:(?:[^\@]*))?\@)?(?:(?:[^\/\:]*)\.(?=[^\.\/\:]*\.[^\.\/\:]*))?(?:[^\.\/\:]*)(?:\.(?:[^\/\.\:]*))?(?:\:(?:[0-9]*))?(\/[^\?#]*(?=.*?))?(?:[^\?#]*)?(?:\?(?:[^#]*))?(?:#(?:.*))?/,
			// Match the job name elements from a build URL
			// Used by: Utils.getJobDetailsFromURL
			// Example - String: http://localhost:8080/job/Foo/job/Bar/build?delay=0sec Result: [ Foo, Bar ]
			jenkinsJobUrl 	: /(?:^|[\/;])job\/([^\/;]+)/g
		}
	}
	
	$( document ).ready(function() {
		controller.init( )
	})
	
	/**
	 * Main controller 
	 */
	var controller = {
		/**
		 * Controller Initiation - Automatically executed when document.ready, handed the 
		 * windows location pathname
		 */
		init: function init( ){
			var _console = new Utils.console( 'controller.init' )

            _console.debug1( 'Welcome - jQuery Jenkins UI initiated' )

            // Show the debugging help message if the showDebugHelp is true. This shows a message in the console 
            // telling the viewer how to view debugging logs and set the different verbosity levels
            if( settings.showDebugHelp === true )
            	Utils.debugHelpMessage()            
			
			var pageDetails = new Utils.pageDetails()

            this.pageDetails = pageDetails

			_console.debug2( 'Request Details: ', pageDetails )
			
			$.each( controller.jenkinsFunctions, function( name, func ){
				_console.debug2('Executing ' + name)
				func( pageDetails )
			})
		},
		
		/** 
		 * jQuery functions to be executed (In order they are listed) 
		 */
		jenkinsFunctions: {
			/*
			// Add some cool style stuff to the build pages
			styleViajQuery: function( pageDetails ){
				if( pageDetails.job.isBuild === true )
					General.styleViajQuery( pageDetails )
			},
			
			// Set Build Description for any builds
			setBuildDescription: function( pageDetails ){
				if( pageDetails.job.isBuild === true )
					General.setBuildPageDescription( pageDetails )
			},
			
			// Sets the Repository parameter based on the Web_Application value - Should excecute for any deployment builds 
			webappDeploySetRepo: function( pageDetails ){	
				// Only execute the setDeployRepo if the job is a Deploy_WebApp job, and we're on the build form
				if( pageDetails.job.isBuild === true )
					Deployments.setDeployRepo( pageDetails )
			},
			
			// Change the status of the env param fields based on the Update_Env_File checkbox value
			webappConfigureEnvParams: function( pageDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( pageDetails.job.isBuild === true )
					Deployments.manageEnvParams( pageDetails )
			},
			
			// Clear the password parameters of the build jobs, which can be auto populated by the browser, which is misleading
			clearPasswordParams: function ( pageDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( pageDetails.job.isBuild === true )
					General.clearPasswordParams( pageDetails )
			},
			
			// Enforce specific parameters to be populated before the build form can be submitted
			requireBuildParams: function( pageDetails ){
				return // Disabled for now
				if( pageDetails.job.isBuild === true )
					General.requireBuildParams( pageDetails )
			}
			*/
			// Add some cool style stuff to the build pages
			styleViajQuery: function( pageDetails ){
				if( pageDetails.job && pageDetails.job.isBuild === true )
					General.styleViajQuery( pageDetails )
			}
			
			, requireBuildParams: function( pageDetails ){
				if( pageDetails.job && pageDetails.job.isBuild === true )
					General.requireBuildParams( pageDetails )
			}
			
			// Sets the Repository parameter based on the Web_Application value - Should excecute for any deployment builds 
			, webappDeploySetRepo: function( pageDetails ){	
				// Only execute the setDeployRepo if the job is a Deploy_WebApp job, and we're on the build form
				if( pageDetails.job && pageDetails.job.isBuild === true && pageDetails.job.name === 'Deploy_WebApp' )
					Deployments.setDeployRepo( pageDetails )
			}
			
			// Change the status of the env param fields based on the Update_Env_File checkbox value
			, webappConfigureEnvParams: function( pageDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( pageDetails.job && pageDetails.job.isBuild === true && $.inArray( pageDetails.job.name, runOnJobs ) !== -1 )
					Deployments.manageEnvParams( pageDetails )
			}

			// Functions I want to execute on all builds
			, allBuilds: function( pageDetails ){
				//var req = new Utils.pageDetails()
				
				console.log( 'Utils.pageDetails username: %s', pageDetails.username )
	
				if( false ){
					setInterval(function(){
						console.log( 'Debug Level:', Utils.getDebugLevel() )
					}, 1500)
				}
				else {
					console.log( 'Debug Level:', Utils.getDebugLevel() )
				}

				// Clear the password parameter values on any build/rebuild actions
				if( pageDetails.job && pageDetails.job.isBuild === true )
					General.clearPasswordParams( pageDetails )
				
				/*
				// If the viewer has just executed a build action, then redirect to the console 
				if( pageDetails.job && pageDetails.job.referrer && pageDetails.job.referrer.isBuild === true ){
					setTimeout( function(){
						General.redirectToConsole( pageDetails )
					}, 2000 )
				}
				*/				
			}
			
			, showJobDetails: function( pageDetails ){
				console.log('Job Details:', ( typeof pageDetails.job === 'object' ? pageDetails.job : 'None' ) )
			}
		}
	}
	
	/**
	 * Hooks are used to add your own functionality to the Jenkins jQuery UI
	 */
    var Hooks = {
        /**
         * Hooks.pageDetails can be anything that updates the request details object thats given to the functions
         * that get executed by the controller
         */
        pageDetails: {
            /**
             * Determine if the
             */
            setEnvironment: function( pageDetails ){

                // See if this is in one of the environment folders, if so, set the env
                if( typeof pageDetails.job === 'object' && $.inArray( pageDetails.job.segments[ 0 ], settings.envFolders ) !== -1 )
                    pageDetails.env = pageDetails.job.segments[ 0 ]

                /*var newStuff = {}
                 // See if this is in one of the environment folders, if so, set the env
                 if( $.inArray( pageDetails.job.segments[ 0 ], settings.envFolders ) !== -1 )
                 newStuff.env = pageDetails.job.segments[ 0 ]
                 else
                 newStuff.env = 'IDK'

                 return newStuff
                 */
            }
        }
    }

    /**
     * Extra utilities to make life easier
     */
    var Utils = {
        /**
         * Custom console logger - Basically just a wrapper around the console debug/warn functions, except it prepends the
         * prefix to each output (which is set when creating a new object)
         *
         * @param	{string}		prefix			String to prefix all the console output with (best if its the name of a function)
         * @return	{object}							Returns an object with functions that can be used for console output
         * @return	{function}	obj.debug		Function that can be used just like console.debug(), except this will only show
         *															output if this._debugEnabled returns true
         * @return	{function}	obj.warn		Function that can be used just like console.warn()
         * @return	{function}	obj.error		Function that can be used just like console.error()
         */
        console: function ( prefix ) {
        	var 	thisObj 	= this,
					debugLevels = settings.maxDebugLevel
					
            // Set the prefix for any console output via the internal debug/warn/error/log methods
            thisObj._prefix = prefix || Utils.getCallerFuncName() || null

            // Wrapper to console.log()
            thisObj.log = function( str ){
                var args = arguments
                if( args ){
                    if( thisObj._prefix ) args[0] = '[' + thisObj._prefix + '] ' + args[0]
                    console.log.apply( console, arguments )
                }
            }
		
			// default the debug level to 1 if settings.maxDebugLevel isnt a number or is 0
			if( typeof settings.maxDebugLevel !== 'number' || settings.maxDebugLevel == 1 )
				settings.maxDebugLevel = 1
			
			var debugObj, lvl
			
			// Create $settings.maxDebugLevel debuggers named debugN and vardumpN
			for( var i = 0; i < 3; i++){
				lvl = i+1
				
				debugObj = Utils.debugger( lvl, prefix )
				
				thisObj[ 'debug' + lvl ] 	  = debugObj.console
				thisObj[ 'vardump' + lvl ] = debugObj.vardump
			}
		
            thisObj.debug   		= thisObj.debug1
            thisObj.vardump   = thisObj.vardump1

            // Wrapper to console.warn()
            this.warn = function( str ){
                var args = arguments
                if( args ){
                    if( this._prefix ) args[0] = '[' + this._prefix + '] ' + args[0]
                    console.warn.apply( console, arguments )
                }
            }

            // Wrapper to console.error()
            this.error = function( str ){
                var args = arguments
                if( args ){
                    if( this._prefix ) args[0] = '[' + this._prefix + '] ' + args[0]
                    console.error.apply( console, arguments )
                }
            }
        },

        /**
         * Console debugger object - Basically its used by the debug/debug1/debug2/debug3 methods in
		 * the Utils.console method. Just prints the debug message out with the prefix if the level that was
		 * set is less than or greater to the numeric value in the debug method (debug2 = level 2)
		 *
		 * @param	{number}		level					Debug level (Defaults to 1)
		 * @param	{string}		prefix				Debug message prefix
		 * @return	{object}								Returns an object with a 'console' and 'vardump' functions. Both functions 
		 *																only work if debug level matches
		 * @return 	{function}	this.console		The console.debug wrapper function
		 * @return 	{function}	this.vardump		Just a vardump for whatever parameters are provided
         */
        debugger: function( level, prefix ){			
			var returnObj = {}
			
			/**
			 * Console debug wrapper. Prefix is prepended with the debug level and prefix provided
			 *
			 * @param	{string}	*		Any values handed to console.debug
			 * @return	{void}				Function just executes console.debug()
			 */
        	returnObj.console = function( ){
        		var args = arguments
                if( Utils.getDebugLevel() >= level && args ){
                    if( prefix ) args[ 0 ] = '(' + level + ')[' + prefix + '] ' + args[ 0 ]
                    
                    console.debug.apply( console, arguments )
                }
        	}
			
			/**
			 * Console variable dumper debug wrapper. Prefix is prepended with the debug level and prefix provided. 
			 * All parameters provided are displayed in the browser console
			 *
			 * @param	{string}	*		Any values handed to console.debug to be dumped
			 * @return	{void}				Function just executes console.debug()
			 */
			returnObj.vardump = function(  ){
        		var args = arguments
                if( Utils.getDebugLevel() >= level && args ){
                    if( prefix ) args[ 0 ] = '(' + level + ')[' + prefix + '] ' + args[ 0 ]
                    
                    console.debug.apply( console, arguments )
                }
        	}
			
			return returnObj
        },

        /**
         * Function to attempt to get the name of the function, that calls the function, that calls Utils.getCallerFuncName(). For example, if
         * the function Foo() wants to see who called it, it calls Utils.getCallerFuncName(), and that name will be returned (if found). If
         * no function name is found, then false will be returned
         *
         * @return	{string,boolean}		Name of caller function 2 levels back, or false
         */
        getCallerFuncName: function getCallerFuncName(){
            var  funcName = arguments.callee.caller.caller.toString(),
                 callerFunc

            if( funcName ){
                var nameMatch = funcName.match( /function ([^\(]+)/ )

                if( nameMatch )
                    callerFunc = nameMatch[1]
            }

            return callerFunc || false
        },

        /**
         * Get the debug level. This processes different locations that the debug variable can be defined, and 
         * prioritizes them properly, then returns the numeric value of whatever was found, or 0 if none was found
         * Note: No instance of Utils.console is used in here, since it will forkbomb the browser by executing itself
         *
         * @return 	{number}	Debug level to be used (or 0 if none found)
         */
        getDebugLevel: function(){
        	// Different debug values from different locations it can be stored/found
        	var debugVals = {
        		// The GIT parameters stored in the URL of the referring document
				referrerUrl	: Utils.getUrlParam( 'debug', document.referrer ),
				// The GIT parameters stored in the URL of the current document
				currentUrl	: Utils.getUrlParam( 'debug' ),
				// URL Hash value (in same format as previous two - http://site:8080/#debug=3)
				hashDebug	: Utils.getUrlParam( 'debug', window.location.hash.substring( 1 ) ),
				// if window.debug is set
				windowDebug	: window.debug,
				// The configured debug level in the settings object
				settingVal	: settings.debug
			}

			//console.debug( 'debugVals:', debugVals )
        	//console.debug( 'Referrer debug (referrer: %s):', document.referrer, debugVals.referrerUrl )
        	//console.debug( 'Current debug:', debugVals.currentUrl )

        	/**
        	 * Local function to convert the value of one of the debug settings from a numeric or boolean, to numeric
        	 *
        	 * @param 	{boolean,number,string}		debugVal 	Value to parse/convert
        	 * @return 	{number,void}							Returns a numeric value, or void
        	 */
        	var _parseDebugVal = function( debugVal ){
        		if( typeof debugVal === 'number' )
        			return debugVal
        		
        		if( typeof debugVal === 'boolean' )
        			return ( debugVal === true 
        				? 1 
        				: 0 )

        		return 
        	}

        	// If Persistent Debugging is enabled, and the referring URL has debug set in the URL hash, then return that
        	if( settings.persistentDebugging === true && _parseDebugVal( debugVals.hashDebug ) !== undefined )
        		return _parseDebugVal( debugVals.hashDebug )

        	// If Persistent Debugging is enabled, and the referring URL has debug set in the URL parameters, then return that
        	else if( settings.persistentDebugging === true && _parseDebugVal( debugVals.referrerUrl ) !== undefined )
        		return _parseDebugVal( debugVals.referrerUrl )
        	
        	// If debug is set in the current URL, then use that value
        	else if( _parseDebugVal( debugVals.currentUrl ) !== undefined )
        		return _parseDebugVal( debugVals.currentUrl )
        	
        	// If the window.debug value wa set, then use it
        	else if( _parseDebugVal( debugVals.windowDebug ) !== undefined )
        		return _parseDebugVal( debugVals.windowDebug )

        	// Lastly, the standard settings.debug value
        	else if( _parseDebugVal( debugVals.settingVal ) !== undefined )
        		return _parseDebugVal( debugVals.settingVal )

        	// If nothing else was reached, then just disable debugging
        	return 0
        },

        debugHelpMessage: function(){
        	var debugPrefix = '[Debug Help Message]'
        	//to a numeric value from 1 to 3, or to "true" (which is level 1)
        	console.debug( '%s To enable debugging, you must set the debugging level a numeric value between 0 and 3, or set it to true (which then defaults to level 1)', debugPrefix )
        	console.debug( '%s There are 4 ways to set the debugging verbosity level (listed in order of priority):', debugPrefix )
        	console.debug( '%s \t1) Set the "debug" parameter in the request URI Hash (EG: %s)', debugPrefix, window.location.origin + window.location.pathname + '#debug=3' )
        	console.debug( '%s \t2) Set the "debug" parameter in the request URI (EG: %s)', debugPrefix, window.location.origin + window.location.pathname + '?debug=3' )
        	console.debug( '%s \t3) Set the settings.debug value ', debugPrefix )
        	console.debug( '%s \t4) Set the window.debug value (This can be done in the console by just typing: window.debug = 3)', debugPrefix )
        	console.debug( '%s To hide this message, set the settings.showDebugHelp message to false, or remove it all together', debugPrefix )
        },

        /**
         * Retrieve the value of a specified GET param within the URL
         *
         * @param	{string}		param		Name of parameter to get value for
         * @param 	{string}		requestURI 	Request URI to parse, can be a full URL, or just the search segment
         * @param 	{boolean}		skipParse	Set this to true to skip the value parsing and just return the exact value 
         *										in the URL
         * @return	{void,string}				Value of parameter in URL
         */
        getUrlParam: function getUrlParam( param, requestURI, skipParse ) {
        	//var _console = new Utils.console( 'Utils.getUrlParam' )

        	// If there wasnt a requestURI provided, then default to the windows current location search
        	if( ! requestURI ){
        		requestURI = window.location.search.substring( 1 )
        		//console.debug( 'No requestURI provided - defaulted to window.location.search (%s)', requestURI )
        	}

        	// If a requestURI value was provided, then attempt to regex it for the actual search string 
        	// (so from http://site.com/foo/?var=val, match for var=val)
        	else {
        		//console.debug( 'requestURI provided - %s', requestURI )

        		var requestUriRegex = requestURI.match( settings.regexPatterns.requestUriParams )

        		// If a regex match fails, then its likely that the requestURI just didnt have a search segment in it
        		if( ! requestUriRegex ){
        			console.debug( 'Regex match against request URI %s failed - assuming no params were found' )
        			return 
        		}

        		//console.debug( 'Regular expression results from parsing requestURI %s - ', requestURI, requestUriRegex )
        		//console.debug( 'Resetting requestURI value to the location.search value from the referrer (%s)', requestUriRegex[ 1 ] )

        		requestURI = requestUriRegex[ 1 ]
        	}

        	// Since the requestURI should now be in this=type&of=format, split it by &, loop through those, splitting 
        	// them by = to get the variable name and value
            var searchLocation	= decodeURIComponent( requestURI ),
                searchVars 		= searchLocation.split( '&' ),
                urlParamName,
                tmpVal

            // Loop through each search vars found after splitting requestURI by &
            for ( var i = 0; i < searchVars.length; i++ ) {
                urlParamName = searchVars[ i ].split( '=' )

                // If this current parameter name is whats being filtered for, then parse the value and return it
                if ( urlParamName[ 0 ] === param ){
                	tmpVal = $.trim( urlParamName[ 1 ] )

					// If the skipParse value wasnt set, then attempt to parse the parameter value. Since were pulling 
					// the value from the URL, its going to be a string. So attempt to parse the value and convert it 
					// to whatever type it could be
                	if( skipParse !== true ){
		                if( ( urlParamName[ 1 ] ).toLowerCase() == 'true' )
		                	tmpVal = true
		                else if( ( urlParamName[ 1 ] ).toLowerCase() == 'false' )
							tmpVal = false
						else if( ( urlParamName[ 1 ] ).toLowerCase() == 'null' )
							tmpVal = null
		                else if( parseFloat( urlParamName[ 1 ] ) == urlParamName[ 1 ] )
		                	tmpVal = parseFloat( urlParamName[ 1 ] )
		                //else if( urlParamName[ 1 ].length === 0 )
		                //	tmpVal = undefined
		                
	                }

                    //return urlParamName[ 1 ] === undefined ? true : tmpVal
                    return tmpVal
                }
            }
        },

        /**
         * Retrieve the elements of a specific HTML element.
         *
         * @param	{element,object}	elem		Can be a jQuery element, or a standard JS element
         * @return	{array}							Returns an array of HTML elements
         */
        getElementAttrs: function getElementAttrs( elem ){
            if( elem instanceof jQuery )
                elem = elem[ 0 ]

            var attrs = []

            $.each( elem.attributes, function( k, e ){
                attrs.push( e.nodeName )
                //console.log('Attr %s has the value %s', e.nodeName, e.nodeValue)
            })

            return attrs
        },

        /**
         * Request Details object
         *
         * @todo 	Add a method that can enable/disable the Build button on the build form.
         */
        pageDetails: function pageDetails(){
            var thisClass 	= this,
                _console 	  	= new Utils.console( 'Utils.pageDetails' ),
                // Try to get the users login from the profile link
                $accountLink = $( 'div#header > div.login > span > a:first' )

			thisClass.referrer 	 	 = document.referrer || null
            thisClass.requestPath = window.location.pathname
            thisClass.username 	 = undefined

            /*
			thisClass.job = {
            	isBuild: false
            }

			if( thisClass.referrer !== null ){
				Utils.getLastJob( thisClass )
			}
			*/
			
			// Get Account Username ------------------------------------------------------------------
            if( $accountLink ){
                if( $accountLink.attr('href') ){
                    var linkHrefMatch = $accountLink.attr('href').match( settings.regexPatterns.accountLink )

                    if( linkHrefMatch ){
                        _console.debug( 'Username: ' + linkHrefMatch[1])
                        thisClass.username = linkHrefMatch[1]
                    }
                    else {
                        _console.debug2( 'Href not matched' )
                    }
                }
                else {
                    _console.debug2( 'No href in profile link' )
                }
            }
            else {
                _console.debug2( 'No account link found' )
            }

			// Get Current Job Details ------------------------------------------------------------------
			
            // Parse the current HTTP request pathname to see if this is a job page...
           	var jobDetails = Utils.getJobDetailsFromURL( thisClass, window.location.pathname )
		
			// If an object was returned, then its the job details. Save it to the job property of this class
			if( typeof jobDetails === 'object' ){
				_console.debug3( 'The method Utils.getJobDetailsFromURL() returned an object when given the path "%s", setting the pageDetails.job property', window.location.pathname )
				_console.debug3( 'Result from Utils.getJobDetailsFromURL():', jobDetails )
				
				thisClass.job = jobDetails
				
				// If the current job is a build action, then execute Utils.getParamFormDetails to get the build parameter details
				if( thisClass.job.isBuild === true ){
					_console.debug3( 'This page is considered a "build action", attempting to retrieve the build parameter details' )
				
					var jobParams = Utils.getParamFormDetails( pageDetails )
					
					if( typeof jobParams === 'object' ){
						$.extend( thisClass.job, jobParams )
						
						_console.debug3( 'Successfully parsed the build parameter form for parameter details, merged them into the Utils.pageDetails instance object' )
						_console.debug3( 'Merged value of Utils.pageDetails.job object:', thisClass.job)
					}
					else {
						_console.debug3( 'Expected Utils.getParamFormDetails to return an object -received typeof: %s', typeof jobParams )
					}
				}
			}
			else {
				_console.debug3( 'The method  Utils.getJobDetailsFromURL did not return an object when parsing the current request path (%s)', window.location.pathname )
			}
			
			// Get Referrer Job Details ------------------------------------------------------------------
			if( thisClass.referrer ){
				_console.debug3( 'Referrer found (%s) - Attempting to parse the referrer URL for possible job details', thisClass.referrer )
				var previousJobDetails = Utils.getJobDetailsFromURL( thisClass, thisClass.referrer )
				
				if( typeof previousJobDetails === 'object' ){
					_console.debug3( 'The method Utils.getJobDetailsFromURL returned an object when parsing the request path of the referrer (%s), ' 
						+ 'setting the job.referrer property of  the Utils.pageDetails instance', thisClass.referrer )
						
					thisClass.job.referrer = previousJobDetails
				}
				else {
					_console.debug3( 'Referrer found (%s) - Attempting to parse the referrer URL for possible job details', thisClass.referrer )
				}
			}
			else {
				_console.debug3( 'No referrer found' )
			}
			
			// Execute pageDetails Hooks ------------------------------------------------------------------
            // If there are any request details function hooks, execute them
            if( typeof Hooks.pageDetails === 'object' ){
                var tmpPageDetails

                $.each( Hooks.pageDetails, function( name, hook ){
                    _console.debug2( 'Processing pageDetails function hook "%s" (typeof: %s)', name, typeof hook )

                    // The hooks must be functions! Anything else gets ignored
                    if( typeof hook === 'function' ){
                        _console.debug2( 'Executing pageDetails hook function %s', name )

                        try {
                            tmpPageDetails = hook( thisClass )

                            if( tmpPageDetails instanceof Utils.pageDetails ){
                                _console.debug('Request details hook %s returned a modified Utils.pageDetails object - using the modified returned object', name )
                                //pageDetails = tmpPageDetails
                            }
                            else if( typeof tmpPageDetails === 'object' ){
                                _console.debug( 'Request details hook %s returned an object, adding each object item to the Utils.pageDetails prototype', name )

                                $.each( tmpPageDetails, function( n, v ){
                                    Utils.pageDetails.prototype[ n ] = v
                                    _console.debug( 'Created prototype item Utils.pageDetails.prototype.%s from hook %s (typeof = %s)', n, n, typeof v)
                                })
                            }
                            else {
                                _console.warn( 'The pageDetails hook %s did not return an object or an instance of Utils.pageDetails, it returned typeof: %s', name, typeof tmpPageDetails)
                            }
                        }
                        catch( err ){
                            _console.error( 'There was an exception thrown when executing the request details hook %s: %s', name, err.message)
                        }
                    }

                    // Any hooks that arent functions should just be added as prototype elements
                    else {
                        _console.warn( 'Skipping pageDetails hook %s due to nvalid type - expected a function, found a %s', name, typeof hook )
                    }
                })
            }
            else if( Hooks.pageDetails !== undefined ) {
                _console.warn( 'Invalid type found for Hooks.pageDetails - Expecting an object, found typeof: %s', typeof Hooks.pageDetails )
            }
        },
		
		/**
		 *
		 */
		getJobDetailsFromURL: function( pageDetails, requestPath ){
			var  _console = new Utils.console( 'Utils.getJobDetailsFromURL' ),
				 jobDetails
					
			// Make sure we were given an instance of Utils.pageDetails
			if( ! ( pageDetails instanceof Utils.pageDetails ) ){
				var received
				if( typeof pageDetails === 'object' )
						received = 'an instance of the class ' + pageDetails.constructor.name
				else if( pageDetails === undefined )
					received = 'nothing'
				else 
					received = typeof pageDetails
				
				_console.error( 'Expected an instance of Utils.pageDetails - received %s', received )
				return false
			}
			
			// And a path name
			if( ! requestPath ){
				_console.error( 'Expected an HTTP request path in string format - received typeof: %s; value: ', typeof requestPath, requestPath )
				return false
			}
			
			_console.debug3( 'Request path provided: %s', requestPath )
			
			// Longest... regex... evarrr
			var reqPathMatches = requestPath.match( settings.regexPatterns.urlRequestPath )
			
			// Make sure this was a valid request path
			if( ! reqPathMatches || typeof reqPathMatches !== 'object' || reqPathMatches[1] === undefined ){
				_console.error( 'Regex match against the request path string provided (%s) yielded no results - Are you sure this is a valid HTTP request string?', requestPath )
				return false
			}
			
			requestPath = reqPathMatches[1]
			
			_console.debug2( 'Regex against the request path provided yielded the result: %s', requestPath )
			
			// Get the job path and job segments from the URL
			var  	jobMatch = requestPath.match( settings.regexPatterns.jenkinsJobUrl ),
					jobPathSegments
					
			 // Loop through the job matches and only get the part thats the job name
            // TODO Figure out how to only match the required section, the regex pattern above can do it, somehow.
            if( ! jobMatch || typeof jobMatch !== 'object' || jobMatch[1] === undefined ){
            	_console.debug( 'Regex match against %s did not yield a job name', requestPath )
            	return false
            }
			
			_console.debug( 'Regex match against %s yielded a job name, updating the pageDetails.job object', requestPath )

            jobDetails = {
                isBuild		: false,
                name		: null,
                path		: '',
                segments	: []
            }
			
			
			$.each( jobMatch, function( k, j ){
				_console.debug( 'Processing regex match #%s:', k, j )
				//j = j.replace(/^\//g, '')
				jobPathSegments = j.replace( /^\//g, '' ).split( '/' )

				jobDetails.path += '/' + jobPathSegments[ 1 ]
				jobDetails.segments.push( jobPathSegments[ 1 ] )
			})
		
            // Set the job name
            jobDetails.name = jobDetails.segments.slice( -1 )[ 0 ]
			
			// Determine job action 
			var jobAction = Utils.getJobActionFromPath( requestPath )
			
			_console.debug3( 'Result from Utils.getJobActionFromPath when providing the path %s:', requestPath,  jobAction )
			
			if( typeof jobAction === 'object' ){
				$.extend( jobDetails, jobAction )
				_console.debug3( 'Extended job details object:', jobDetails )
			}
			else {
				_console.debug3( 'The method Utils.getJobActionFromPath did not return an object, Assuming no action was found - not merging result with job details result object' )
			}
			
			return jobDetails
		},
		
		/**
		 * Get the action being executed for a job 
		 * Note: This should only be executed if the job was found and defined atpageDetails.job. Thus, its executed 
		 * at the end of Utils.getJobDetails
		 *
		 * @param	{object}	pageDetails		Instance of the Utils.pageDetails class
		 * @param	{void}								This function ammends the pageDetails object thats 
		 *															provided, or returns void to quit early
		 */
		getJobActionFromPath: function( requestPath ){
			// Get the action being performed
			var 	_console 		= new Utils.console( 'Utils.getJobActionFromPath' ),
					actionRegex 	= new RegExp( '/(' + settings.actionVerbs.join( '|' ) + ')/?$' ),
					actionMatch 	= actionRegex.exec( requestPath ),
					jobAction 		= {}
					
			_console.debug3( 'Parameters handed to Utils.getJobActionFromPath:', arguments)
			
			_console.debug3('Value of actionMatch:', actionMatch)
			
			// If the construction for the regex pattern containing the action verbs failed, then report it and quit
			if( actionMatch === null ) {
				_console.warn( 'Regex match for a job action against "%s" yielded no matches', requestPath )

				return null
			} 

			if( ! actionMatch ||  typeof actionMatch !== 'object' ){
				_console.debug2( 'Regex match against %s yielded no matches', requestPath )
				return null
			}
				
			_console.debug( 'Regex match for a job action against "%s" yielded: %s', requestPath, ( typeof actionMatch === 'object' ? actionMatch.join(', ') : actionMatch ) )
			//_console.debug( 'Regex match for a job action against "%s" yielded type: %s - ', requestPath, typeof actionMatch, actionMatch )

			if( $.inArray( actionMatch[ 1 ], settings.actionVerbs ) === -1 ){
				_console.warn( 'The job action verb found via RegExp match was %s, which was not found in the settings.actionVerbs array - How did that happen?.. Action Verbs: %s', 
					actionMatch[ 1 ], settings.actionVerbs.join(', ') )
				return null
			}

			jobAction.action = actionMatch[ 1 ]

			_console.debug( 'Found the job action %s', jobAction.action )

			// Check if the action verb found is in the settings.buildActions array, if so, set pageDetails.job.isBuild 
			// to true 
			if( $.inArray( jobAction.action, settings.buildActions ) !== -1 ){
				_console.debug2( 'Found the job action %s, which is considered a "Build Action" - setting isBuild to true', jobAction.action )

				jobAction.isBuild = true
			}
			
			return jobAction
		},

        /**
         * Parse the build parameters form, updating the Utils.pageDetails object (which is provided) by adding a jobs.parameters object
         * containing the parameter data.
		 * Note: This should only be executed if the viewer is on a specific job, and the action found was considered a "build action". Thus, 
		 * this gets executed at the end of Utils.getJobActionFromPath if the action found is in the settings.buildActions array. (and Utils.getJobActionFromPath 
		 * is executed by Utils.getJobDetails if job details were found)
         *
		 * @param	{void}								This function ammends the pageDetails object thats 
		 *															provided, or returns void to quit early
         * @var     pageDetails.job.parameters[ parameter_name ].name	
         * @var     pageDetails.job.parameters[ parameter_name ].type
         */
        getParamFormDetails: function( pageDetails ){
            var _console     			= new Utils.console( 'Utils.getParamFormDetails' ),
            	jenkinsParamNames 	= Object.keys( settings.jenkinsParamTypes ),
				resultParameters = {}

			// Most of the parameter value inputs just have the name as 'value', so add that to the selector array
        	jenkinsParamNames.push( 'value' )

            var $paramInputs 	= $( 'div[name="parameter"] > input[name="name"]' ),
                $paramTable  		= $( 'table.parameters' ),
                paramSelector 		= '[name="' + jenkinsParamNames.join( '"], [name="' ) + '"]',
                returnObj    			= {},
                $paramElements 	= {
                    name : null,
                    value  : null
                },
                //paramInputTypeStatus,
                paramName,
                paramValType,
                paramValInputName


			_console.debug( 'Jenkins parameter value input selector: %s', paramSelector )

        	//paramSelector = '[name="' + jenkinsParamNames.join( '"], [name="' ) + '"]',

            // Check that theres a table with the class 'parameters'
            if( ! $paramTable.length ){
                _console.debug( 'No parameters table found, not polling parameter data' )
                return
            }

            // Then check that there are some inputs found (though there wouldnt ever be a table.parameters 
            // element without inputs... but just do it)
            if( ! $paramInputs.length ){
                _console.debug( 'No parameter input elements found, not polling parameter data' )
                return
            }

            resultParameters = {}

			// Iterate through the parameters in the build form
            $paramInputs.each( function( i, paramNameInput ){
            	//paramInputTypeStatus = null
                $paramElements.name  = $( paramNameInput )
            	paramName 			 = $paramElements.name.val()
                $paramElements.value = $paramElements.name.next( paramSelector )

                if( ! $paramElements.value.length ){
                	_console.error( 'There was an error finding the value input element for the parameter %s - Nothing was found using the CSS ' 
                		+ 'selector %s. Make sure the input name is in the jenkinsParamNames array', paramName, paramSelector )
                	return
                }

            	paramValInputName = $paramElements.value.prop( 'name' )

                // Parameter input type
            	paramValType = $paramElements.value.prop( 'type' ) || undefined

            	// Prioritize the jenkinsParamNames setting values first. If the 'name' of the parameter value input 
            	// is in the jenkinsParamNames object, then the type will be the value of that object item
	            if( jenkinsParamNames[ paramValInputName ] !== undefined ){
	            	//paramInputTypeStatus = 'param-name-settings'
	            	
	            	paramValType = jenkinsParamNames[ paramValInputName ]

	            	_console.debug( 'Setting the parameter %s type to %s', paramName, paramValType )
	            }

	            // If there was no 'type' property of the param value element, then try to get the type manually
	            else if( ! paramValType ){
	            	if( $paramElements.value.is( 'multiselect' ) ){
	            		//paramInputTypeStatus = 'is-multiselect'

	                    paramValType = 'select-multiple'

	                }
	                else if( $paramElements.value.is( 'select' ) ) {
	            		//paramInputTypeStatus = 'is-select'

	                    paramValType = 'select-one'

	                }
	                else {
	            		//paramInputTypeStatus = 'fail-no-type-prop'

	                    _console.error( 'Unable to determine the input type for parameter %s', paramName )
	                }
	            }

	            // If there was a 'type' property found, then use that
	            else if( paramValType ){
	            	//paramInputTypeStatus = 'use-type-prop'

	            	_console.debug( 'The parameter %s had the "type" property set to %s, using that as the param input type', paramName, paramValType )
	            } 

	            // When everything else fails - throw a fit
	            else {
	            	//paramInputTypeStatus = 'fail-all'
	            	var failReasons = []

	            	if( jenkinsParamNames[ paramValInputName ] === undefined )
	            		failReasons.push( 'The input element name "' + paramValInputName + '" was not found in the jenkinsParamNames object' )
	            	
	            	if( $paramElements.value.prop( 'type' ) === undefined )
	            		failReasons.push( 'No "type" property found on value input element' )

	            	_console.error( 'Unable to determine the input value type for parameter %s - ' 
	            		+ ( ! failReasons.length ? 'Unknown reasons' : failReasons.join('; ') ), paramName)

	            	// Skip to next iteration
	            	return true
	            }
	          
                _console.debug( 'Loaded the build parameter %s into the Utils.pageDetails.job.parameters object', paramName )

                resultParameters[ $paramElements.name.val() ] = {
                    name: paramName,
                    type: paramValType
                }
            })
			
			if( Object.keys( resultParameters ).length === 0 )
				return resultParameters
			
			return resultParameters
        },

        /**
         * Jenkins Parameter Class - Returns an object that can be used to manage a Jenkins parameter
         *
         * @param 	{string}			paramName 			Name of the Jenkins parameter
         * @return 	{boolean,object}						If the parameter wasn't found, then false is returned, otherwise, an
         *													object with various methods used to manage the parameter is returned.
         * @return 	{function} 			this.getValue		Function used to get the current value of the parameter
         * @return 	{function}			this.setValue 		Function used to set the value of the param
         * @return 	{function}			this.hideParam		Function to hide the parameter in the parameters table. This sets the
         * 													CSS display property of the <tbody> containing the parameter to none
         * @return 	{function}			this.showParam 		Function to show the parameter in the parameters table. This removes
         * 													the CSS display property of the <tbody> containing the parameter
         * @return 	{function} 			this.visibility 	Just a wrapper around the this.hideParam() and this.showParam()
         * @return 	{function}			this.setReadOnly 	Set/Unset the 'readonly' attribute of the parameter input (Accepts a boolean)
         * @return 	{function}			this.disableParam 	Disables the parameter input field by adding a 'disabled' attribute
         * @return 	{function}			this.enableParam 	Enables the parameter input field by removing the 'disabled' attribute
         * @return 	{element}			this.$valueInput 	Handler for the value input jQuery element
         * @return 	{element}			this.$tbody  		Handler for the parameters <tbody> element in the parameters table
         * @return 	{function} 			this.onClick 		Shortcut to the jQuery onClick event handler
         */
        jenkinsParam: function ( paramName ) {
            var	_thisObj  = this,
					_console = new Utils.console( 'Utils.jenkinsParam' ),
					jenkinsParamValueSelector = "[name='" + settings.jenkinsParamValueNames.join( "'],[name='" ) +"']",
					_param   = {}

			_console.debug( 'jenkinsParamValueSelector:', jenkinsParamValueSelector)
            // Set the prefix for any console output via the internal debug/warn/error/log methods
            //this._prefix = prefix || Utils.getCallerFuncName() || null

            // jQuery handler for the hidden element containing the parameters name
            _param.$element = $( "input:hidden[value='"+ paramName +"']" )

            // jQuery handler for the table row of the parameter
            _param.$tbody = _param.$element
                .parent( 'div[name="parameter"]' )
                .parent( 'td.setting-main' )
                .parent( 'tr' )
                .parent( 'tbody' )
				
            if( ! _param.$tbody.length ){
                _console.error( 'Error finding the table row for the parameter name %s', paramName )
                return false
            }

            // Different parameter input types are named differently;  Most param inputs are named value...
            if( _param.$element.next( jenkinsParamValueSelector ).length ){
                _param.$valueInput = _param.$element.next( jenkinsParamValueSelector )
            }

            // .. except for multi-select inputs
            else if( _param.$element.next("[name='labels']" ).length ) {
                _param.$valueInput = _param.$element.next( "[name='labels']" )
            }

            // If no element is found..
            else {
                _console.error( 'No parameter found with the name', paramName )
                return false
            }

			_console.debug( '_param.$valueInput  for param %s:', paramName, _param.$valueInput)
			
            // Parameter input type
            this.type = _param.$valueInput.prop( 'type' ) || undefined

            // If theres no 'type' attribute, then try to deduce the type manually
            if( ! this.type ){
                if( _param.$valueInput.is( 'multiselect' ) )
                    this.type = 'select-multiple'

                else if( _param.$valueInput.is( 'select' ) )
                    this.type = 'select-one'

                else
                    _console.error( 'Unable to determine the input type for parameter ' + paramName )
            }
            else if( this.type === 'checkbox' ){

            }
            else {
                // Anything here?
            }

			/**
             * Retrieve the value of the parameter
             *
             * @param 	{}
             * @return 	{string,array,boolean,null}		Depends on the input type of the parameter
             */
            this.getValue = function(){
                _console.debug( 'Returning value %s for parameter %s', _param.$valueInput.val(), paramName )

                if( this.type === 'checkbox' )
                    return _param.$valueInput.is( ':checked' )

                return _param.$valueInput.val()
            }

            /**
             * Set the value of the parameter
             *
             * @param 	{string,array,boolean}	value 	Value to set for parameter (value type depends on parameter type)
             * @return 	{void}
             */
            this.setValue = function( value ){
                if( this.type === 'checkbox' )
                    return _param.$valueInput.prop( "checked", !!value )

                return _param.$valueInput.val( value )
            }
			
			// Make a getter/setter for the 'value' property, which are just shortcuts to this.getValue and this.setValue
			Object.defineProperty( this, 'value', {
				/**
				 * Get the value of the current parameter
				 *
				 * @return	{mixed}		Returns the value. Value type depends on parameter input type
				 */
				get: this.getValue,
				
				/**
				 * Set the value of the current parameter
				 *
				 * @param	{mixed}		value	Value to set in current parameter.Value type depends on parameter input type
				 * @return	{void}
				 */
				set: this.setValue
			})
			
            /**
             * Method to show the parameter in the parameters table. This sets the CSS display property of the
             * <tbody> containing the parameter to none
             *
             * @return 	{void}
             */
            this.showParam = function(){
                _param.$tbody.css({ 'display': '' })
            }

            /**
             * Method to hide the parameter in the parameters table. This removes the CSS display property of the
             * <tbody> containing the parameter
             *
             * @return 	{void}
             */
            this.hideParam = function(){
                _param.$tbody.css({ 'display': 'none' })
            }

            /**
             * Single method that can both show and hide the parameter by acting as a short to this.hideParam() and
             * this.showParam. Which one gets executed depends on the value of the visible parameter
             *
             * @param 	{boolean} 	visible 	Determines the elements visibility. True = visible; False = invisible
             * @return 	{void}
             */
            this.visibility = function( visible ){
                if( visible )
                    return this.showParam()

                return this.hideParam()
            }

            /**
             * Disables the parameters value input. Does so by setting the disabled property/attribute to true
             *
             * @return 	{void}
             */
            this.disableParam = function(){
                _param.$valueInput.attr( "disabled", true ).prop( "disabled", true )
            }

            /**
             * Enables the parameters value input. Does so by removing the disabled property/attribute
             *
             * @return 	{void}
             */
            this.enableParam = function(){
                _param.$valueInput
                    .attr( "disabled", false )
                    .prop( "disabled", false )
            }

            /**
             * Set/Unset the readonly attribute/property of the parameter value input element
             *
             * @param 	{boolean}	readonly 	Enable/Disable readonly status (defaults to false)
             * @return 	{void}
             */
            this.setReadOnly = function( readonly ){
                _param.$valueInput
                    .attr('readonly', !!readonly )
                    .prop('readonly', !!readonly )
            }

            // Shortcut to onClick
            this.onClick = _param.$valueInput.onClick

            this.$tbody = _param.$tbody
            this.$valueInput = _param.$valueInput

            // Just some quick aliases...
            this.getVal = this.getValue
            this.setVal = this.setValue
        },

        /**
         * Check of a Jenkins parameter with a specific name exists. Jenkins creates two input fields for each parameter - a hidden
         * input named 'name' with the parameter name as the value, and then another input named 'value', which is whats shown
         * in the interface. This looks for a hidden input named 'name' with the value of the parameter name.
         *
         * @param	{string}	paramName		Parameter name to search for
         * @param	{string}	matchType		This sets what type of search to use for the jQuery selector. Can be 'start', 'end' or
         *															anything else will search for paramName ANYWHERE in the name
         * @return	{boolean}						true if anything is found, false otherwise
         */
        doesParamExist: function doesParamExist( paramName, matchType ){
            // If the matchType isnt defined (or not string), then assume this is an exact match
            if( typeof matchType === 'undefined' || typeof matchType !== 'string' )
                return $( "input:hidden[value='"+ paramName +"']" ).length > 0

            // If matchType is 'start', 'startsWith', 'starts', etc - then look for the params that START with the paramName
            if( /^start/.test( matchType ) )
                return $( "input:hidden[value^='"+ paramName +"']" ).length > 0

            // If matchType is 'end', 'endsWith', 'ends', etc - then look for the params that END with the paramName
            if( /^end/.test( matchType ) )
                return $( "input:hidden[value$='"+ paramName +"']" ).length > 0

            // For anything else, just look for params that have paramName ANYWHERE in the parameter name
            return $( "input:hidden[value*='"+ paramName +"']" ).length > 0
        },

        /**
         * Toggle the visibility of a Jenkins parameter. This function interacts with the <tbody> element that contains the targeted parameter(s), 
		 * and sets the CSS display property to 'none' when hiding, and removes it when showing the parameter. This can be used to show/hide 
		 * one parameter, or multiple parameters (by providing an array)
		 *
		 * Note: This hides/shows the parameters in the same way the showParam/hideParam/visibility methods in the Utils.jenkinsParam class. 
		 * The only difference is this allows you to hide/show the element without having to create an instance of the Utils.jenkinsParam class (at 
		 * least by yourself... this creates them internally), and you can hide/show more than one parameter.
         *
         * @param	{string,array}	paramName		Either a single parameter name in string format, or an array of parameter names
         * @param	{boolean}		visible				Desired visibility - defaults to true (visible)
         * @return	{void}										Returns nothing
         */
        setParamVisibility: function setParamVisibility( paramName, visible ){
            var	_console = new Utils.console( 'Utils.setParamVisibility' ),
                   thisParam,
                   verb = ( visible === false ? 'hiding' : 'showing' )

            if( typeof paramName === 'undefined' ){
                _console.debug( 'Utils.setParamVisibility called, but no parameter names were provided' )
                return
            }

            // If one param was provided (in string format), then just process that one
            if( typeof paramName === 'string' ){
                _console.debug( 'Utils.setParamVisibility called with a string as the parameter - %s single parameter: %s', verb, paramName )

                if( ! Utils.doesParamExist( paramName ) ){
                    _console.error( 'Failed to %s parameter - unable to find any parameter with the name "%s"', verb, paramName )
                    return
                }

                thisParam = new Utils.jenkinsParam( paramName )

                if( visible === false )
                    thisParam.hideParam()
                else
                    thisParam.showParam()

                return
            }

            // If an array was provided, then assume there was multiple, iterate through them
            if( $.isArray( paramName ) ){
                _console.debug( 'Utils.setParamVisibility called, an array of parameter names was provided: %s', paramName.join(', ') )

                paramName.each( function( param ) {
                    if( ! Utils.doesParamExist( param ) ){
                        _console.error( 'Unable to find a Jenkins parameter with the name %s - Skipping to next param name in list' )
                        return true
                    }

                    _console.debug( '%s the jenkins parameter %s', verb, param)

                    thisParam = new Utils.jenkinsParam( param )

                    if( visible === false )
                        thisParam.hideParam()
                    else
                        thisParam.showParam()

                })

                return
            }

            // If this is reached, then paramName wasnt a string or an array
            _console.error( 'Unable to %s any parameters - Neither a string or an array was provided', verb )
            return
        }
    }

    var Deployments = {
        /**
         * Sets the value of the Repository parameter based off of the value set in the Web_Application parameter.
         *
         * @param	{object}	pageDetails		Result from utils.getReqDetails( httpPath )
         * @return	{void}
         */
        setDeployRepo: function setDeployRepo( pageDetails ){
            var	_console = new Utils.console( 'Deployments.setDeployRepo' ),
                   WebApplication_param = new Utils.jenkinsParam('Web_Application'),
                   Repository_param = new Utils.jenkinsParam('Repository'),
                   //$webappSel = $( "input[value='Web_Application']" ).next("select[name='value']" ),
                   //$repoSel = $( "input[value='Repository']" ).next("select[name='value']" ),
                   setRepo

            // Whenever the Web_Application parameter is changed, execute the below logic to decide what the repo value should be,
            // or clear it out, if the Web_Application was also cleared
            WebApplication_param.$valueInput.change(function() {
                if( ! WebApplication_param.value ){
                    _console.debug( 'Webapp cleared - Clearing repo' )
                    setRepo= ''
                }
                else {
                    _console.debug( 'Webapp changed to: ', WebApplication_param.value )

                    // Use Regular Expression to deduce what application is being deployed, based off of the prefix in the Web_Application value
                    var webappName = WebApplication_param.value.match(/^(?:dev|stage|preprod)?(.*)\.cy-motion.com/)

                    // If the regex match was successful, then set the repository value
                    if ( webappName ){
                        switch ( webappName[1] ) {
                            case 'api':
                                setRepo= 'API'
                                break
                            case 'static':
                                setRepo= 'Static'
                                break
                            case 'secure':
                                setRepo= 'WebApp'
                                break
                            case 'www':
                            default:
                                setRepo= 'www'
                                break
                        }
                        _console.debug('Matched String: ' + webappName[1] + ' - Setting the repo to ' + setRepo)
                    }

                    // If the regex match failed, then default to an empty repo value
                    else {
                        _console.debug('Nothing Matched - Defaulting to the Web repo')
                        setRepo= ''
                    }
                }

                // Update the repository value
                _console.debug( 'Updating repository value to: ' + setRepo )

                Repository_param.$valueInput.val( setRepo ).change()
            })
        },

        /**
         * Hide/Show the parameters that will be used to configure the .env file, based on what server(s) are selected,
         * and if the Update_Env_File parameter is checked.
         *
         * This monitors the Update_Env_File checkbox parameter, when checked, it disables the DB settings fields,
         * and enables when its checked.
         *
         * @param	{object}	pageDetails		Must be a Utils.pageDetails object
         * @return	{void}
         * @todo		This needs to work with Siloed servers, where theres no A and B sites
         */
        manageEnvParams: function manageEnvParams( pageDetails ){
            // Get the 'Update_Env_File' field
            var	_console 					= new Utils.console( 'Deployments.manageEnvParams' ),
                   paramWebApp			= new Utils.jenkinsParam( 'Web_Application' ),
                   //paramRepo				= new Utils.jenkinsParam( 'Repository' ),
                   paramUpdateEnvFile  = new Utils.jenkinsParam( 'Update_Env_File' ),
                   paramServer 				= new Utils.jenkinsParam( 'Server' ),
                   dbParams					= {},
                   serverVals,
				   paramRepo

			
			/**
			 * Since the Configure_WebApp doesnt have a Repo param, we need to try to deduce what the repo 
			 * would be from the selected WebApp
			 */
			function assumeRepo(){
				var 	webAppVal 		= paramWebApp.value,
						webAppRegex 	= webAppVal.match( /^(?:stage|prod|preprod|dev)?(api|secure|static|www)?\.cy-motion\.com$/ ),
						resultRepo
						
				if( ! webAppRegex ){
					_console.debug3( 'Regex check for WebApp failed - its probably just empty')
					return false
				}
				
				switch( ( webAppRegex[1] || '' ).toLowerCase() ){						
					case 'api':
						resultRepo= 'API'
						break;
						
					case 'secure':
						resultRepo= 'WebApp'
						break;
						
					case 'www':
					default:
						resultRepo= 'www'
						break;
				}
				
				_console.debug3( 'Assuming repo %s', resultRepo)
				
				return resultRepo
			}
			
			if( Utils.doesParamExist( 'Repository') ){
				paramRepo= new Utils.jenkinsParam( 'Repository' )
				
			}
			else {
				paramRepo = false
			}
			
            // Set the visibility of the DB parameters on the initial page load
            showAppropriateDbParams()

            setEnvParamVisibility()

			// The config doesnt have the repo option
			if( paramRepo !== false ){
				paramRepo.$valueInput.change(function(){
					_console.debug( 'Repository parameter changed' )
					showAppropriateDbParams()
					//setEnvParamVisibility()
				})
			}
			
			// Whenever the web app gets changed, toggle the DB param visibility
			paramWebApp.$valueInput.change( function(){
                _console.debug( 'Web application parameter changed' )

                showAppropriateDbParams()
            })
			
            // Whenever the Server parameter is changed, then toggle the visibility of the DB params,
            // to show only the appropriate parameters
            paramServer.$valueInput.change( function(){
                _console.debug( 'Server parameter changed' )

                showAppropriateDbParams()
            })

            // Whenever Update_Env_File is toggled, set the display of the DB params
            paramUpdateEnvFile.$valueInput.change(function() {
                showAppropriateDbParams()

                serverVals = paramServer.value
            })

            /**
             * Gets the alpha character ID for the sites of the servers selected in the Server parameter. This function simply
             * iterates over any selected values values of the Server parameter, then uses regular expression to extract the
             * Site ID from the hostname, and adds any selected value to an array to be returned (converting it to uppercase)
             * For example, if the Server web-prd-a01 is selected, this will return A, if web-prd-b01 is selected as well, an array
             * containing A and B will be returned
             *
             * @return	{null,array}		Array of uppercase single alpha characters if any site ID's are extracted, null if nothing selected
             */
            function getSelectedSiteIds(){
                var	_console = new Utils.console( 'Deployments.manageEnvParams > getSelectedSiteIds' )
                _console.debug( 'Getting selected sites' )

                var 	selected = paramServer.value,
                       result = [], 
					   match

                // If one or more Servers are selected, then parse the selected options
                if( selected ){
                    $.each( selected, function( k, v ){
                        _console.debug( 'Matching for site character in selected site value', v )

                        match = v.match( /^[a-zA-Z]+-[a-zA-Z]+-([a|b])[0-9]{2}$/ )

                        _console.debug( 'Regex match result for %s:', v, match )

                        if( match ){
                            _console.debug( 'Matched character %s', match[1] )
                            result.push( match[1].toUpperCase() )
                        }
                        else {
                            _console.debug( 'No match found' )
                        }
                    })
                }

                _console.debug( result.length ? 'Returning selected site(s): ' + result.join(', ') : 'No selected sites found' )

                // Return false if none were selected
                return result.length
                    ? result
                    : null
            }

            /**
             * Get all database host params, meaning anything that starts with App_DB_Host or Seed_DB_Host
             *
             * @return	{array}	An array of parameter names
             */
            function getAllDbHostParams(){
                var	_console = new Utils.console( 'Deployments.manageEnvParams > getSelectedSiteIds' ),
                       sites = [], thisName

                // Search for
                $( "input:hidden[value^=App_DB_Host], input:hidden[value^=Seed_DB_Host]" ).each( function( k, i ){
                    thisName = $( i ).val()

                    _console.debug( 'Found the DB host parameter name: %s', thisName )

                    sites.push( thisName )
                })

                return sites
            }

            /**
             * This function basically sets the visibility of the DB Host/User/Pass parameters, based on the value of
             * the Server parameter, and the Update_Env_File param
             *
             * @return	{void}	This function just interacts with parameter input elements vicariously through
             *								toggleDbHostVisibility and setCredParamsVisibility
             */
            function showAppropriateDbParams(){
                var	_console 						= new Utils.console( 'Deployments.manageEnvParams > getSelectedSiteIds' ),
                       selectedServerOptions 	= paramServer.value,
                       // All DB Host params - used to keep track of which params need to be hidden after select ones are shown
                       allDbHostParams			= getAllDbHostParams(),
                       //repository 						= paramRepo.value,
                       selectedSites 					= getSelectedSiteIds() || [],
                       toHide 							= allDbHostParams || [],
                       toShow 						= [],
                       thisParam

                setEnvParamVisibility()

                // If no servers are selected, or the repo selected doesnt need them, hide the params
                if ( ( ! selectedServerOptions || selectedServerOptions.length === 0 ) ||
                    ( assumeRepo() && $.inArray( assumeRepo(), settings.envDependentApps ) === -1 ) ){

                    _console.debug( 'No servers are selected - hiding DB related params' )

                    // Hide all DB Host params
                    Utils.setParamVisibility( allDbHostParams, false )

                    // Hide the credential params
                    setCredParamsVisibility( false )

                    return
                }

                // If the Update Env File option is not selected, then hide the parameters
                if( paramUpdateEnvFile.value != true ){
                    _console.debug('Update_Env_File value is unchecked - hiding DB related params' )

                    // Hide all DB Host params
                    Utils.setParamVisibility( allDbHostParams, false )

                    // Hide the credential params
                    setCredParamsVisibility( false )

                    return
                }

                // If there are servers selected, but no sites were found - then this job may NOT be deploying
                // to site-based servers (meaning no A or B)
                if( selectedSites.length === 0 ){
                    // If the App_DB_Host and Seed_DB_Host params are found, then show those and the credential params
                    if( Utils.doesParamExist( 'App_DB_Host' ) && Utils.doesParamExist( 'Seed_DB_Host' ) ){

                        _console.debug( 'Found the parameters App_DB_Host and Seed_DB_Host - Using those as the only DB params' )

                        // Show the (Seed|App)_DB_Host params, and remove them from the toHide array
                        $.each( [ 'Seed_DB_Host', 'App_DB_Host' ], function( k, p ){
                            thisParam = new Utils.jenkinsParam( p )
                            thisParam.showParam()
                            toHide.remove( p )
                        })

                        // Hide any other DB Host params
                        Utils.setParamVisibility( toHide, false )

                        // Show credentials
                        setCredParamsVisibility( true )
                    }
                    else {
                        _console.debug( 'Some server options were selected, but no site IDs were extracted, and the App_DB_Host and/or Seed_DB_Host params '
                        +'were not found. This may be due to the servers having improper hostnames, or the parameters in this job were named incorrectly' )
                    }
                }

                // If servers ARE selected, and there were some Site IDs found in the hostnames, then show
                // the DB params for those Site IDs (if they exist)
                else {
                    _console.debug( 'There were %s Site IDs found in the selected server hostnames: %s', selectedSites.length, selectedSites.join(', ') )

                    // Iterate through the selected site IDs - Checking if theres an App_DB_Host and Seed_DB_Host for each one, and showing them if so.
                    selectedSites.each( function( site ){

                        if( Utils.doesParamExist( 'App_DB_Host_' + site ) && Utils.doesParamExist( 'Seed_DB_Host_' + site ) ){

                            _console.debug( 'Found the Application DB host and Seed DB host for site %s - Showing the parameters', site )
                            // Show the App DB host and Seed DB Host for this site
                            $.each([ 'App_DB_Host_' + site, 'Seed_DB_Host_' + site ], function( k, p ){
                                thisParam = new Utils.jenkinsParam( p )
                                thisParam.showParam()
                                toHide.remove( p )
                            })

                            // Hide any other DB Host params
                            Utils.setParamVisibility( toHide, false )

                            // Show credentials
                            setCredParamsVisibility( true )
                        }

                        else {
                            _console.debug( 'Unable to find the Application DB host and/or the Seed DB host for site %s - Unable to show parameters', site )

                            // Hide any other DB Host params
                            Utils.setParamVisibility( toHide, false )

                            // Show credentials
                            setCredParamsVisibility( false )
                        }
                    })
                }
            }

            function setEnvParamVisibility(){
                var	webappName 	= paramWebApp.value,
                       webappProject 	= webappName.match(/^(?:dev|stage|preprod)?(.*)\.cy-motion.com/)
                      // repository 			= paramRepo.value

                // Check if the selected repository uses the .env file - if so, show the Update_Env_File param.
                if( assumeRepo() && $.inArray( assumeRepo(), settings.envDependentApps ) !== -1 ){
                    paramUpdateEnvFile.showParam()
                }

                // If not, hide it
                else {
                    paramUpdateEnvFile.hideParam()
                }
            }

            /**
             * Set the visibility of the credential parameters (username, pass, appkey) by setting the CSS 'display'
             * value to 'none' for hiding them, or removing the 'style' attribute to make it visible again.
             *
             * @param	{boolean}	visible		Visibility of parameters
             * @return	{void}							This function just interacts with the CSS style of HTML elements
             */
            function setCredParamsVisibility( visible ){
                var	_console = new Utils.console( 'Deployments.manageEnvParams > setCredParamsVisibility' ),
                       // Store the params to toggle in here
                       credParams = {
                           DB_Username	: new Utils.jenkinsParam( 'DB_Username' ),
                           DB_Password	: new Utils.jenkinsParam( 'DB_Password' ),
                           Application_Key	: new Utils.jenkinsParam( 'Application_Key' )
                       }

                // If were setting them to visible, then remove the style (which would have display: none)
                if( visible === true )
                    $.each( credParams, function( name, param ){
                        _console.debug( 'Setting the visibility of the parameter %s to true', name )
                        param.showParam()
                    })

                // If were hiding them, then add the css style display: none
                else
                    $.each( credParams, function( name, param ){
                        _console.debug( 'Setting the visibility of the parameter %s to false', name )
                        param.hideParam()
                    })
            }

            /**
             * Toggle the visibility of one or both of the DB host parameter field. If one site is provided in the sites param, then the
             * other will be hidden. If this function is executed with any false value or an empty array, then both will be hidden and
             * the DB_Username and DB_Password will also be hidden, until one or both of the Server values are selected. This
             * function assumes that theres only two database servers, so this functionality is modeled around managing only two
             *
             * @param	{string,array}	sites		One or more sites. One site can be a string or array with
             *														a single element, 1+ should be an array
             * @return	{void}
             */
            function toggleDbHostVisibility( sites ){
                var	_console = new Utils.console( 'Deployments.manageEnvParams > toggleDbHostVisibility' ),
                       tmpSites = existingSiteIds

                if( typeof sites === 'string' ){
                    sites = [ sites ]
                }
                else if( typeof sites !== 'object' ){
                    _console.error( 'Function toggleDbHostVisibility expects to be handed an array or a string, not a %s', typeof sites )
                    return false
                }


                // Set the visibility of the sites provided to visible
                if( sites ){
                    $.each( sites, function( k, site ){
                        setSiteDbHostParamVisibility( site, true )
                    })
                }

                // Set the visibility of the other(s) to hidden
                $.each([ 'A', 'B' ], function( k, site ){
                    if( $.inArray( site, sites ) === -1 )
                        setSiteDbHostParamVisibility( site, false )
                })
            }

            /**
             * Set the visibility of specified DB host parameters to hidden (by setting CSS display:none).
             * This sets the Seed and App host parameters by using the site ID (A or B)
             *
             * @param	{string}		site			Site ID (A or B)
             * @param	{boolean}	visibility		Visibility to set (false is display:none; true display: block)
             * @return	{void}							This function just interacts with the CSS style of HTML elements
             */
            function setSiteDbHostParamVisibility( site, visibility ){
                var	_console = new Utils.console( 'Deployments.manageEnvParams > setSiteDbHostParamVisibility' )

                if( ! site || typeof site !== 'string' ){
                    _console.error( 'Site value not provided or not a string' )
                    return false
                }

                _console.debug( 'Setting App and Seed DB host param visibility for site %s to %s', site, visibility ? 'visible' : 'hidden' )

                if( visibility ){
                    dbParams[ site.toUpperCase() ].showParam()
                    dbParams[ site.toUpperCase() ].showParam()
                }
                else {
                    dbParams[ site.toUpperCase() ].hideParam()
                    dbParams[ site.toUpperCase() ].hideParam()
                }
            }

            function envAlertAndUncheck() {
                var 	paramUpdateEnvFile  = new Utils.jenkinsParam( 'Update_Env_File' )

                alert( 'In order to update the .env file on any server, you must select a value in the Servers parameter field, then you can check the Update_Env_File option.' )

                paramUpdateEnvFile.$valueInput.prop( "checked", false );
            }

            // Application Key parameter
            var paramAppKey = new Utils.jenkinsParam( 'Application_Key' )
        }
    }

    var General = {
		/**
		 * Redirect the viewer to the console of the build that was just executed (if one was found to be executed). This is done 
		 * by checking if the job.referrer.isBuild property is true, if so, then grab the console link from the first row in the build 
		 * history. 
		 *
		 * Note: Since Jenkins sometimes takes a second or two to add the build history entry, its best to throw this in a 
		 * setTimeout for 2 seconds or so.
		 *
		 * @param		{object}		pageDetails		Page details instance
		 * @return		{void}
		 * @todo			Needs to be able to tell if the latest build is throttled/pending, since that wont have a console.
		 */
		redirectToConsole: function( pageDetails ){
			var _console = new Utils.console( 'General.redirectToConsole' )
			
			if( ! pageDetails.job || ! pageDetails.job.referrer ){
				_console.debug3( 'No "job" and/or "job.referrer" properties found in pageDetails - not redirecting' )
				
				return
			}
			
			if( pageDetails.job.referrer.isBuild !== true ){
				_console.debug3( 'The job.referrer.isBuild property is not true - not redirecting' )
				
				return
			}
			
			var $buildLink = $( 'tr.build-row:first' )
	
			if( ! $buildLink.length ){
				_console.debug3( 'No build links were found - not redirecting' )
				return
			}
		
			if( $buildLink.hasClass( 'build-pending' )) {
				var maxChecks = 4, 
						checkInterval = 5000,
						c = 0
						
				_console.debug2('The first build entry in the build history list is pending. Will check %s times every %s milliseconds for changes', maxChecks, checkInterval)
				
				var checkLoop = setInterval( function(){
					c++
					if( $buildLink.hasClass( 'build-pending' ) ){
						_console.debug3( 'Check # %s - still pending', c )
						
						if( c === maxChecks ){
							_console.debug2( '%s checks have passed and the build is still pending, canceling redirect', c )
							clearInterval( checkLoop )
						}
					} 
					else {
						_console.debug3( 'Check # %s - Not pending! Redirecting to %s', c, $buildLink.attr( 'href' ))
						
						window.location.href = $buildLink.attr( 'href' )
					}
				}, checkInterval )
			}
			else {
				_console.debug2('URL of latest build link in build history table: %s', $buildLink.attr( 'href' ) )
			
				window.location.href = $buildLink.attr( 'href' )
			}
		},
		
        /**
         * Watch for any changes to any input parameters for a build, if anything gets changed, then show
         * a confirmation when the viewer tries to leave the page without submitting the build
         */
        confirmLeave: function( pageDetails, onChange ){

        },

        buildParamDependencies: function( pageDetails ){

        },

        jobDetails: function(){
            // Return job data such as an array of parameters, and...?
        },

        /**
         * Apply any dynamic style attributes that are easier to accomplish in Jenkins via jQuery rather than CSS
         *
         * @param	{object}	pageDetails		Result from utils.getReqDetails( httpPath )
         * @return	{void}								This function just cancels a form submission at the most.
         */
        styleViajQuery: function styleViajQuery( pageDetails ){
            $('required').replaceWith(
                $('<span/>', {
                    class: 'required-param',
                    text: '(Required)'
                })
            )
        },

        /**
         * Looks for any parameters that have a <required/> element in the description, and cancels the build
         * submission if any of said parameters are not populated.
         *
         * @param	{object}	pageDetails		Result from utils.getReqDetails( httpPath )
         * @return	{void}								This function just cancels a form submission at the most.
         */
        requireBuildParams: function requireBuildParams( pageDetails ){
            var	_console 			= new Utils.console( 'General.requireBuildParams' ),
                   $paramForm 	= $( 'form[name="parameters"]' ),
                   $reqElements 	= $( 'required, span.required-param' ),
                   reqParams 		= {},
                   emptyParams 	= [],
                   $reqElem,
                   paramName,
                   thisVal

            function isEmpty( val ){
                if( typeof val === 'object' )
                    return val.length === 0

                else
                    return val == ''
            }

            function getRequiredParams(){
                $reqElements = $( 'required, span.required-param' )
                // Look for the parameter name of any <required> elements
                $reqElements.each(function( k, re ){
                    $reqElem = $( re ).closest( 'tbody' ).children( 'tr:first' ).children( 'td.setting-name' )

                    if( ! $reqElem.length ){
                        _console.warn( 'couldnt find a param' )
                    }
                    else {
                        paramName = $.trim( $reqElem.text() )

                        _console.debug('Adding the parameter %s to the required parameters list',  paramName )

                        reqParams[ paramName ] = new Utils.jenkinsParam( paramName )
                    }
                })

                return reqParams
            }

            /*
             // Look for the parameter name of any <required> elements
             $reqElements.each(function( k, re ){
             $reqElem = $( re ).closest('tbody').children('tr:first').children('td.setting-name')

             if( ! $reqElem.length ){
             utils.console.warn( 'couldnt find a param' )
             }
             else {
             paramName = $.trim( $reqElem.text() )

             utils.console.debug('Adding the parameter %s to the required parameters list',  paramName )

             reqParams[ paramName ] = utils.getJenkinsParam( paramName )
             }
             })
             */

            // Validate the parameter inputs when the form gets submitted
            $paramForm.submit(function( e ) {
		emptyParams = []
                //e.preventDefault()
		//alert('no!')

                reqParams = getRequiredParams()

                // If none were marked required, just quit
                if( $.isEmptyObject( reqParams ) ){
                    _console.debug( 'Not requiring any parameters for this build - None were found' )
                    return true
                }

                $.each( reqParams, function( name, param ){
                    thisVal = param.value

                    _console.debug( 'The parameter "%s" has te value "%s" (length %s)', name, thisVal, thisVal.length )

                    if( thisVal.length === 0 )
                        emptyParams.push( name )
                })

                if( emptyParams.length > 0 ){
                    alert( "Unable to submit build - " + ( emptyParams.length === 1 ? '1 required parameter' : emptyParams.length + ' required parameters') +
                    " were not populated:\n\n- " + emptyParams.join("\n- ") +
                    "\n\nPlease fill out the above parameters and try to execute the build again." )
                    e.preventDefault()
                }
                else {
                    //$paramForm.submit()
                    //return true
                    _console.debug2( 'All required parameters populated - allowing form submit' )
                }
            })
        },

        /**
         * Function to get executed on the build jobs which will clear the value of the password parameters.
         * Those params can sometimes get auto-populated via the browser, which can cause confusion.
         *
         * @param	{object}	pageDetails		Result from utils.getReqDetails( httpPath )
         * @return	{void}							This function just interacts with the CSS style of HTML elements
         */
        clearPasswordParams: function clearPasswordParams( pageDetails ){
            var 	_console 		= new Utils.console( 'General.clearPasswordParams' ),
                   $pwdInputs 	= $( 'input.setting-input:password' )

            $pwdInputs.each(function( i, pi ) {
                _console.debug( 'Clearing text from password input #', i )
                $( pi ).val( '' )
            })
        },

        /**
         * Set the build description for the current build. This is done by looking for any 'build-description' elements
         * (or other names listed below), and using the HTML of said elements as the HTML of a newly created div
         * that will be inserted below the jobs <h1> title. This gets executed for the 'build' action of every job.
         *
         * @param	{object}	pageDetails		Result from utils.getReqDetails( httpPath )
         * @return	{void}
         */
        setBuildPageDescription: function setBuildPageDescription( pageDetails ){
            var	_console 		= new utils.console( 'General.setBuildPageDescription' ),
                   $buildDesc 	= $( 'builddesc, builddescription, build-desc, build-description' ),
                   descHtml,
                   thisDesc

            if( $buildDesc.length === 0 )
                return

            // If theres just one description tag, then keep it simple
            if( $buildDesc.length === 1 ){
                _console.debug( 'Only one build desc tag' )
                thisDesc = $.trim( $buildDesc.html() )

                _console.debug( 'Adding build desc text "' + thisDesc + '" to the listItems array' )

                if( thisDesc == '' )
                    return

                descHtml = thisDesc
            }

            // If theres more than one, then loop over them to create an unordered list
            else {
                _console.debug( $buildDesc.lengt + ' build desc tags FOUND' )

                var listItems = []

                // Loop through each build-description elements, creating an array of list items for the unordered list
                $.each( $buildDesc, function( k, v ){
                    thisDesc = $.trim( $( v ).html() )

                    _console.debug( 'Adding build desc text "' + thisDesc + '" to the listItems array' )

                    if( thisDesc != '' )
                        listItems.push( {
                            content: thisDesc,
                            classes: utils.getElementAttrs( $( v ) )
                        } )
                })

                // If theres nothing found, dont add the div
                if( listItems.length == 0 )
                    return

                // If theres just one list item, then dont show it in a list
                if( listItems.length == 1 ){
                    descHtml = listItems[ 0 ]
                }

                // More than one list item gets a pretty unordered list formatted
                else {
                    descHtml = '<ul class="build-description">'

                    $.each( listItems, function( k, v ){
                        descHtml += '<li class="' + v.classes.join(' ') + '">' + v.content + '</li>'
                    })

                    descHtml += '</ul>'
                }
            }

            _console.debug( 'Setting the description content to:', descHtml )

            $( '<div class="additional-job-details">' + descHtml + '</div>' ).insertAfter( 'div#main-panel > h1' )
        }
    }
})(jQuery)