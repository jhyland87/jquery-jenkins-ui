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

(function($){
	/**
	 * Settings
	 */
	var settings = {
		// Environment Folders - Add the names of the folders located in the top level of Jenkins, that should be considered "environments"
		envFolders: [
			'Production', 'Development', 'Staging', 'Pre-Prod'
		],
		buildActions: [
			'build', 'rebuild'
		],
		// List of repositories for projects that do utilize the .env file
		envDependentApps: [ 
			'API','WebApp' 
		],
		// Enable/disable debugging - This is overridden by setting the debug value in the request params
		debug: false
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
		 *
		 * @param	{string}	httpPath	Value of window.location.pathname, or a string 
		 *													following the same syntax
		 */
		init: function init( httpPath ){
			console.log( 'Welcome - jQuery Jenkins UI initiated' )
			
			var _console = new Utils.console( 'controller.init' )
			// If the GET parameter 'debug' is set to 1 or true, or the window.debug variable is set to 1 or true, then enable debugging 
			if( Utils.getUrlParam( 'debug' ) == 'true' || Utils.getUrlParam( 'debug' ) == '1' || window.debug == true || window.debug == 1 )
				settings.debug = true
			
			var pageDetails = new Utils.pageDetails( httpPath )
			
			_console.debug( 'Request Details: ', pageDetails )
			
			$.each( controller.jenkinsFunctions, function( name, func ){
				_console.debug('Executing ' + name)
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
				if( pageDetails.action === 'build' )
					General.styleViajQuery( pageDetails )
			},
			
			// Set Build Description for any builds
			setBuildDescription: function( pageDetails ){
				if( pageDetails.action === 'build' )
					General.setBuildPageDescription( pageDetails )
			},
			
			// Sets the Repository parameter based on the Web_Application value - Should excecute for any deployment builds 
			webappDeploySetRepo: function( pageDetails ){	
				// Only execute the setDeployRepo if the job is a Deploy_WebApp job, and we're on the build form
				if( pageDetails.job.name === 'Deploy_WebApp' && pageDetails.action === 'build' )
					Deployments.setDeployRepo( pageDetails )
			},
			
			// Change the status of the env param fields based on the Update_Env_File checkbox value
			webappConfigureEnvParams: function( pageDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( $.inArray( pageDetails.job.name, runOnJobs ) !== -1 && pageDetails.action === 'build' )
					Deployments.manageEnvParams( pageDetails )
			},
			
			// Clear the password parameters of the build jobs, which can be auto populated by the browser, which is misleading
			clearPasswordParams: function ( pageDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( $.inArray( pageDetails.job.name, runOnJobs ) !== -1 && pageDetails.action === 'build' )
					General.clearPasswordParams( pageDetails )
			},
			
			// Enforce specific parameters to be populated before the build form can be submitted
			requireBuildParams: function( pageDetails ){
				return // Disabled for now
				if( pageDetails.action === 'build' )
					General.requireBuildParams( pageDetails )
			}
			*/
			// Add some cool style stuff to the build pages
			styleViajQuery: function( pageDetails ){
				if( $.inArray( pageDetails.action, settings.buildActions ) !== -1 )
					General.styleViajQuery( pageDetails )
			},
			
			// Sets the Repository parameter based on the Web_Application value - Should excecute for any deployment builds 
			webappDeploySetRepo: function( pageDetails ){	
				// Only execute the setDeployRepo if the job is a Deploy_WebApp job, and we're on the build form
				if( pageDetails.job.name === 'Deploy_WebApp' && $.inArray( pageDetails.action, settings.buildActions ) !== -1 )
					Deployments.setDeployRepo( pageDetails )
			},
			
			// Change the status of the env param fields based on the Update_Env_File checkbox value
			webappConfigureEnvParams: function( pageDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( $.inArray( pageDetails.job.name, runOnJobs ) !== -1 && $.inArray( pageDetails.action, settings.buildActions ) !== -1 )
					Deployments.manageEnvParams( pageDetails )
			},
			
			// Change the status of the env param fields based on the Update_Env_File checkbox value
			webappConfigureEnvParams: function( pageDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( $.inArray( pageDetails.job.name, runOnJobs ) !== -1 && $.inArray( pageDetails.action, settings.buildActions ) !== -1 )
					Deployments.manageEnvParams( pageDetails )
			},

			// Functions I want to execute on all builds
			allBuilds: function( pageDetails ){
				//var req = new Utils.pageDetails()
				
				console.log('Utils.pageDetails username: %s', pageDetails.username )
	
				// Clear the password parameter values on any build/rebuild actions
				if( $.inArray( pageDetails.action, settings.buildActions ) !== -1 )
					General.clearPasswordParams( pageDetails )
				else 
					console.log( 'The action %s is not a build action', pageDetails.action )
			}
		}
	}
	
	/**
	 * Hooks are used to add your own functionality to the Jenkins jQuery UI
	 */
	var Hooks = {
		/**
		 * Hooks.reqDetails can be anything that updates the request details object thats given to the functions 
		 * that get executed by the controller
		 */
		reqDetails: {
			/**
			 * Determine if the 
			 */
			setEnvironment: function( reqDetails ){
				
				// See if this is in one of the environment folders, if so, set the env
				if( $.inArray( reqDetails.job.segments[ 0 ], settings.envFolders ) !== -1 )
					reqDetails.env = reqDetails.job.segments[ 0 ]
			
				/*var newStuff = {}
				// See if this is in one of the environment folders, if so, set the env
				if( $.inArray( reqDetails.job.segments[ 0 ], settings.envFolders ) !== -1 )
					newStuff.env = reqDetails.job.segments[ 0 ]
				else
					newStuff.env = 'IDK'

				return newStuff
				*/
			},
			
			/**
			 * Just an example function hook that adds some properties to the Utils.pageDetails object
			 */
			addProperties: function( reqDetailsObj ){
				if( ! ( reqDetailsObj instanceof Utils.pageDetails ) ){
						console.warn( 'Hooks.reqDetails.modifyObj was was given something that was NOT an instance of Utils.pageDetails' )
						return false
				}
				
				$.extend( reqDetailsObj, {
					location: {
						pathname: window.location.pathname
					},
					alert: function( msg ){
						alert( 'Jenkins Alert: ' + msg )
					}
				} )
				
				return reqDetailsObj
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
			// Set the prefix for any console output via the internal debug/warn/error/log methods
			this._prefix = prefix || Utils.getCallerFuncName() || null
			
			// Function to determine if debug is enabled or not (by looking at the URL)
			this._debugEnabled = function(){
				return Utils.getUrlParam( 'debug' ) == 'true' || Utils.getUrlParam( 'debug' ) == '1' || window.debug == true || window.debug == 1 
			}
			
			// Wrapper to console.log()
			this.log = function( str ){
				var args = arguments
				if( args ){
					if( this._prefix ) args[0] = '[' + this._prefix + '] ' + args[0]
					 console.log.apply( console, arguments )
				}
			}
			
			// Wrapper to console.debug()
			this.debug = function( str ){
				var args = arguments
				if( this._debugEnabled() === true && args ){
					if( this._prefix ) args[0] = '[' + this._prefix + '] ' + args[0]
					 console.debug.apply( console, arguments )
				}
			}
			
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
				 var nameMatch = funcName.match(/function ([^\(]+)/)
				 
				 if( nameMatch )
					 callerFunc = nameMatch[1]
			}	
		  
			return callerFunc || false
		},

		/**
		 * Retrieve the value of a specified GET param within the URL
		 *
		 * @param	{string}	sParam		Name of parameter to get value for
		 * @return	{string}					Value of parameter in URL
		 */
		getUrlParam: function getUrlParam( sParam ) {
			var sPageURL = decodeURIComponent(window.location.search.substring(1)),
				  sURLVariables = sPageURL.split('&'),
				  sParameterName

			for ( var i = 0; i < sURLVariables.length; i++ ) {
				sParameterName = sURLVariables[i].split('=')

				if (sParameterName[0] === sParam) 
					return sParameterName[1] === undefined ? true : sParameterName[1]
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
				elem = elem[0]

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
		pageDetails: function( reqPath ){
			if( reqPath === undefined )
				reqPath = window.location.pathname
			
			var 	thisClass = this,			
					_console = new Utils.console( 'Utils.pageDetails' ),
					// Try to get the users login from the profile link 
					$accountLink = $( 'div.login > span > a' ),
					// Get the job path and job segments from the URL
					jobMatch = reqPath.match( /(?:^|[\/;])job\/([^\/;]+)/g ),
					segs
			
			
			thisClass.username = undefined
			
			thisClass.job = {
				name: null,
				path: '',
				segments: []
			}
			
			thisClass.action = undefined
			
						
			if( $accountLink ){
				if( $accountLink.attr('href') ){
					var linkHrefMatch = $accountLink.attr('href').match( /^\/user\/(.*)$/ )

					if( linkHrefMatch ){
						_console.debug( 'Username: ' + linkHrefMatch[1])
						thisClass.username = linkHrefMatch[1]
					}
					else {
						_console.debug( 'Href not matched' )
					}
				}
				else {
					_console.debug( 'No href in profile link' )
				}
			}
			else {
				_console.debug( 'No account link found' )
			}
			
			// Loop through the job matches and only get the part thats the job name
			// TODO Figure out how to only match the required section, the regex pattern above can do it, somehow.
			if( jobMatch ){
				$.each( jobMatch, function( k, j ){	
					j = j.replace(/^\//g, '')
					segs = j.split( '/' )
					
					thisClass.job.path = thisClass.job.path + '/' + segs[1]
					thisClass.job.segments.push( segs[1] )
				})
			}
			
			// Set the job name
			thisClass.job.name = thisClass.job.segments.slice(-1)[0] 

			// Get the action being performed
			var actionMatch = reqPath.match( /\/(build|configure|ws|rebuild|changes|move|jobConfigHistory)\/?$/ )
			
			if( actionMatch )
				thisClass.action = actionMatch[1]
			
			// If there are any request details function hooks, execute them
			if( typeof Hooks.reqDetails === 'object' ){
				var tmpReqDetails
				
				$.each( Hooks.reqDetails, function( name, hook ){
					_console.debug( 'Processing pageDetails function hook "%s" (typeof: %s)', name, typeof hook )
					
					// The hooks must be functions! Anything else gets ignored
					if( typeof hook === 'function' ){
						_console.debug( 'Executing reqDetails hook function %s', name )
						
						try {
							tmpReqDetails = hook( thisClass )
							
							if( tmpReqDetails instanceof Utils.pageDetails ){
								_console.debug('Request details hook %s returned a modified Utils.pageDetails object - using the modified returned object', name )
								//reqDetails = tmpReqDetails
							}
							else if( typeof tmpReqDetails === 'object' ){
								_console.debug( 'Request details hook %s returned an object, adding each object item to the Utils.pageDetails prototype', name )
								
								$.each( tmpReqDetails, function( n, v ){
									Utils.pageDetails.prototype[ n ] = v
									_console.debug( 'Created prototype item Utils.pageDetails.prototype.%s from hook %s (typeof = %s)', n, n, typeof v)
								})
							}
							else {
								_console.warn( 'The reqDetails hook %s did not return an object or an instance of Utils.pageDetails, it returned typeof: %s', name, typeof tmpReqDetails)
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
			else if( Hooks.reqDetails !== undefined ) {
				_console.warn( 'Invalid type found for Hooks.reqDetails - Expecting an object, found typeof: %s', typeof Hooks.reqDetails )
			}
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
			var _console = new Utils.console( 'Utils.jenkinsParam' ),
				_param   = {}

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
			if( _param.$element.next( "[name='value']" ).length ){
				_param.$valueInput = _param.$element.next( "[name='value']" )
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

			/**
			 * Single method to act as both the getter and setter for the parameters value. If the value parameter is defined, then 
			 * this will act as a setter, executing this.setValue(), otherwise, this.getValue() gets returned.
			 *
			 * @param 	{null,string,array,boolean}		value 	Value to set for parameter (value type depends on parameter type) 	
			 * @return 	{void,string,array,boolean} 			If this is setting the value, then void will be returned, otherwise, 
			 * 													this.getValue() will be returned
			 */
			this.value = function( value ){
				if( typeof value !== 'undefined' )
					return this.setValue( value )

				return this.getValue()
			}

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
		 * Toggle the visibility of a Jenkins parameter. This function interacts with the <tbody> element 
		 * that contains the targeted parameter(s), and sets the CSS display property to 'none' when hiding,
		 * and removes it when showing the parameter. This can be used to show/hide one parameter, or
		 * multiple parameters (by providing an array)
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
		 * @param	{object}	reqDetails		Result from utils.getReqDetails( httpPath )
		 * @return	{void}
		 */
		setDeployRepo: function setDeployRepo( reqDetails ){
			var	_console = new Utils.console( 'Deployments.setDeployRepo' ),
					WebApplication_param = new Utils.jenkinsParam('Web_Application'),
					Repository_param = new Utils.jenkinsParam('Repository'),
					//$webappSel = $( "input[value='Web_Application']" ).next("select[name='value']" ),
					//$repoSel = $( "input[value='Repository']" ).next("select[name='value']" ),
					setRepo

			// Whenever the Web_Application parameter is changed, execute the below logic to decide what the repo value should be,
			// or clear it out, if the Web_Application was also cleared
			WebApplication_param.$valueInput.change(function() {
				if( ! WebApplication_param.getVal() ){
					_console.debug( 'Webapp cleared - Clearing repo' )
					setRepo= ''
				}
				else {
					_console.debug( 'Webapp changed to: ', WebApplication_param.getVal() )

					// Use Regular Expression to deduce what application is being deployed, based off of the prefix in the Web_Application value 
					var webappName = WebApplication_param.getValue().match(/^(?:dev|stage|preprod)?(.*)\.cy-motion.com/)

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
					paramRepo				= new Utils.jenkinsParam( 'Repository' ),
					paramUpdateEnvFile  = new Utils.jenkinsParam( 'Update_Env_File' ),
					paramServer 			= new Utils.jenkinsParam( 'Server' ),
					dbParams					= {},
					serverVals
			
			// Set the visibility of the DB parameters on the initial page load
			showAppropriateDbParams()
			
			setEnvParamVisibility()
			
			paramRepo.$valueInput.change(function(){
				_console.debug( 'Repository parameter changed' )
				showAppropriateDbParams()
				//setEnvParamVisibility()
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
				
				serverVals = paramServer.getValue()
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
				
				var 	selected = paramServer.getValue(),
						result = [], match
								
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
						selectedServerOptions 	= paramServer.getValue(),
						// All DB Host params - used to keep track of which params need to be hidden after select ones are shown
						allDbHostParams			= getAllDbHostParams(),
						repository 					= paramRepo.value(),
						selectedSites 				= getSelectedSiteIds() || [],
						toHide 							= allDbHostParams || [], 
						toShow 						= [],  
						thisParam
				
				setEnvParamVisibility()
				
				// If no servers are selected, or the repo selected doesnt need them, hide the params
				if ( (selectedServerOptions === null || selectedServerOptions.length === 0 ) || 
					$.inArray( repository, settings.envDependentApps ) === -1 ){
					
					_console.debug( 'No servers are selected - hiding DB related params' )
					
					// Hide all DB Host params
					Utils.setParamVisibility( allDbHostParams, false )
					
					// Hide the credential params
					setCredParamsVisibility( false )
					
					return
				}
				
				// If the Update Env File option is not selected, then hide the parameters
				if( paramUpdateEnvFile.getValue() != true ){
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
				var	webappName 	= paramWebApp.getValue(),
						webappProject 	= webappName.match(/^(?:dev|stage|preprod)?(.*)\.cy-motion.com/),
						repository 		= paramRepo.getValue()
						
				console.log('Deploying project in repo:', repository)
					
				// Check if the selected repository uses the .env file - if so, show the Update_Env_File param.
				if( $.inArray( repository, settings.envDependentApps ) !== -1 ){
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
		 * Watch for any changes to any input parameters for a build, if anything gets changed, then show 
		 * a confirmation when the viewer tries to leave the page without submitting the build
		 */
		confirmLeave: function( reqDetails ){

		},
	
		buildParamDependencies: function( reqDetails ){
				
		},
		
		jobDetails: function(){
			// Return job data such as an array of parameters, and...?
		},

		/**
		 * Apply any dynamic style attributes that are easier to accomplish in Jenkins via jQuery rather than CSS
		 * 
		 * @param	{object}	reqDetails		Result from utils.getReqDetails( httpPath )
		 * @return	{void}								This function just cancels a form submission at the most.
		 */
		styleViajQuery: function styleViajQuery( reqDetails ){
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
		 * @param	{object}	reqDetails		Result from utils.getReqDetails( httpPath )
		 * @return	{void}								This function just cancels a form submission at the most.
		 */
		requireBuildParams: function requireBuildParams( reqDetails ){
			var	_console 			= new utils.console( 'General.requireBuildParams' ),
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
					$reqElem = $( re ).closest('tbody').children('tr:first').children('td.setting-name')
					
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
				//e.preventDefault()
				
				reqParams = getRequiredParams()
				
				// If none were marked required, just quit
				if( $.isEmptyObject( reqParams ) ){
					_console.debug( 'Not requiring any parameters for this build - None were found' )
					return true
				}
			
				$.each( reqParams, function( name, param ){
					thisVal = param.value()
					
					_console.debug( 'The parameter "%s" has te value "%s"', name, param.value() )
					
					if( thisVal.length === 0 )
						emptyParams.push( name )	
				})

				if( emptyParams.length > 0 ){
					alert( "Unable to submit build - " + ( emptyParams.length === 1 ? '1 required parameter' : emptyParams.length + ' required parameters') + 
					" were not populated:\n\n- " + emptyParams.join("\n- ") + 
					"\n\nPlease fill out the above parameters and try to execute the build again." )
					return false
				}
				else {
					//$paramForm.submit()
					return true
				}
			})
		},
		
		/**
		 * Function to get executed on the build jobs which will clear the value of the password parameters. 
		 * Those params can sometimes get auto-populated via the browser, which can cause confusion.
		 *
		 * @param	{object}	reqDetails		Result from utils.getReqDetails( httpPath )
		 * @return	{void}							This function just interacts with the CSS style of HTML elements
		 */
		clearPasswordParams: function clearPasswordParams( reqDetails ){
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
		 * @param	{object}	reqDetails		Result from utils.getReqDetails( httpPath )
		 * @return	{void}
		 */
		setBuildPageDescription: function setBuildPageDescription( reqDetails ){
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
