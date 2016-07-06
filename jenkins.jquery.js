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
		// Enable/disable debugging - This is overridden by setting the debug value in the request params
		debug: false
	}
	
	$( document ).ready(function() {
		controller.init( window.location.pathname )
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
			
			var cnsl = new Utils.console( 'controller.init' )
			// If the GET parameter 'debug' is set to 1 or true, or the window.debug variable is set to 1 or true, then enable debugging 
			if( Utils.getUrlParam( 'debug' ) == 'true' || Utils.getUrlParam( 'debug' ) == '1' || window.debug == true || window.debug == 1 )
				settings.debug = true
			
			var reqDetails = Utils.getReqDetails( httpPath )
			
			cnsl.debug( 'Request Details: ', reqDetails )
			
			$.each(controller.jenkinsFunctions, function( name, func ){
				cnsl.debug('Executing ' + name)
				func( reqDetails )
			})
		},
		
		/** 
		 * jQuery functions to be executed (In order they are listed) 
		 */
		jenkinsFunctions: {
			/*
			// Add some cool style stuff to the build pages
			styleViajQuery: function( reqDetails ){
				if( reqDetails.action === 'build' )
					General.styleViajQuery( reqDetails )
			},
			
			// Set Build Description for any builds
			setBuildDescription: function( reqDetails ){
				if( reqDetails.action === 'build' )
					General.setBuildPageDescription( reqDetails )
			},
			
			// Sets the Repository parameter based on the Web_Application value - Should excecute for any deployment builds 
			webappDeploySetRepo: function( reqDetails ){	
				// Only execute the setDeployRepo if the job is a Deploy_WebApp job, and we're on the build form
				if( reqDetails.job.name === 'Deploy_WebApp' && reqDetails.action === 'build' )
					Deployments.setDeployRepo( reqDetails )
			},
			
			// Change the status of the env param fields based on the Update_Env_File checkbox value
			webappConfigureEnvParams: function( reqDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( $.inArray( reqDetails.job.name, runOnJobs ) !== -1 && reqDetails.action === 'build' )
					Deployments.manageEnvParams( reqDetails )
			},
			
			// Clear the password parameters of the build jobs, which can be auto populated by the browser, which is misleading
			clearPasswordParams: function ( reqDetails ){
				var runOnJobs = [ 'Deploy_WebApp', 'Configure_WebApp' ]
				if( $.inArray( reqDetails.job.name, runOnJobs ) !== -1 && reqDetails.action === 'build' )
					General.clearPasswordParams( reqDetails )
			},
			
			// Enforce specific parameters to be populated before the build form can be submitted
			requireBuildParams: function( reqDetails ){
				return // Disabled for now
				if( reqDetails.action === 'build' )
					General.requireBuildParams( reqDetails )
			}
			*/

			tester: function( reqDetails ){
				if( reqDetails.job.name === 'test-job' && reqDetails.action === 'build' )
					General.paramTest( reqDetails )
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
		 * Compile a detailed list of info about the request, such as the job, the environment, the action, and the username 
		 * of the viewer (if set). Most of this is retrieved by parsing the URL. 
		 *
		 * @param	{string}	reqPath							URL to parse, should use the value of window.location.pathname
		 * @return	{string}	obj.username				Username of whoevers viewing the pageX
		 * @return	{string}	obj.env							Environment (parsed from one of the folders, Development, Production, Staging, etc)
		 * @return	{object}	obj.job							Object with details of the current job
		 * @return	{string}	obj.job.name				Name of the current job being ran
		 * @return	{string}	obj.job.path					Path of the job being ran (without 'job/' in each folder)
		 * @return	{array}	obj.job.segments			URL segments of job split up into an array
		 * @return	{string}	obj.action						Action being taken - build, rebuild, configure, ws (workspace), move, etc 
		 */
		getReqDetails: function getReqDetails( reqPath ){
			var cnsl = new Utils.console( 'Utils.getReqDetails' ),
			// Object to contain details about the current request (username, folder, build, etc)
				reqDetails = {
				// Default the username to null, reset it if found 
				username: null,
				env: null,
				job: {
					name: null,
					path: '',
					segments: []
				},
				action: null
			}
			
			// Try to get the users login from the profile link 
			var $accountLink = $( 'div.login > span > a' )
			
			if( $accountLink ){
				if( $accountLink.attr('href') ){
					var linkHrefMatch = $accountLink.attr('href').match( /^\/user\/(.*)$/ )
					if( linkHrefMatch ){
						cnsl.debug( 'Username: ' + linkHrefMatch[1])
						reqDetails.username = linkHrefMatch[1]
					}
					else {
						cnsl.debug( 'Href not matched' )
					}
				}
				else {
					cnsl.debug( 'No href in profile link' )
				}
			}
			else {
				cnsl.debug( 'No account link found' )
			}

			// Get the job path and job segments from the URL
			var jobMatch = reqPath.match( /(?:^|[\/;])job\/([^\/;]+)/g ),
				  segs
				  

			// Loop through the job matches and only get the part thats the job name
			// TODO Figure out how to only match the required section, the regex pattern above can do it, somehow.
			if( jobMatch )
				$.each( jobMatch, function( k, j ){	
					j = j.replace(/^\//g, '')
					segs = j.split( '/' )
					
					reqDetails.job.path = reqDetails.job.path + '/' + segs[1]
					reqDetails.job.segments.push( segs[1] )
				})

			// Set the job name
			reqDetails.job.name = reqDetails.job.segments.slice(-1)[0] 

			// See if this is in one of the environment folders, if so, set the env
			if( $.inArray( reqDetails.job.segments[0], settings.envFolders ) !== -1 )
				reqDetails.env = reqDetails.job.segments[0]

			// Get the action being performed
			var actionMatch = reqPath.match( /\/(build|configure|ws|rebuild|changes|move|jobConfigHistory)\/?$/ )
			
			if( actionMatch )
				reqDetails.action = actionMatch[1]

			return reqDetails
		},
		
		/**
		 * Retrieve the input element for a specific parameter, specified by the parameters name.
		 * 
		 * @param	{string}		paramName				Name of the parameter in the current Jenkins build
		 * @return	{string}		obj.type					Type of input (checkbox, select, multiselect, radio, text, textarea)
		 * @return	{function}	obj.value					Retrieve the value of the parameter 
		 * @return	{element}	obj.$element			jQuery element for parameter name (hidden field)
		 * @return	{element}	obj.$valueElement	jQuery element for parameter input
		 * @return	{element}	obj.$tableRow			jQuery element for the parameters parents tbody row in the table
		 * @return	{function}	obj.hide					Function to hide the parameter in the Parameters table (sets css display: none)
		 * @return	{function}	obj.show					Function to show the parameter in the Parameters table (removes css display prop)
		 */
		getJenkinsParam: function getJenkinsParam( paramName ){
			var cnsl = new Utils.console( 'Utils.getJenkinsParam' )
			
			if( ! paramName ){
					cnsl.error( 'No param name provided' )
					return false
			}
			
			var paramData = {}
			
			// jQuery handler for the hidden element containing the parameters name
			paramData.$element = $( "input:hidden[value='"+ paramName +"']" )
			
			// jQuery handler for the table row of the parameter
			paramData.$tableRow = paramData.$element
				.parent( 'div[name="parameter"]')
				.parent( 'td.setting-main' )
				.parent( 'tr' )
				.parent( 'tbody' )
				
			if( ! paramData.$tableRow.length ){
				cnsl.warn( 'Error finding the table row for the parameter name %s', paramName )
				paramData.$tableRow = null
			}
			
			// Function to show the entire row in the parameters table
			paramData.show = function(){
				paramData.$tableRow.css({ 'display': '' })
			}
			
			// Function to hide the entire row in teh parameters table
			paramData.hide = function(){
				paramData.$tableRow.css({ 'display': 'none' })
			}
			
			// Different parameter input types are named differently;  Most param inputs are named value...
			if( paramData.$element.next("[name='value']" ).length ){
				paramData.$valueElement = paramData.$element.next("[name='value']" )
			}
			
			// .. except for multi-select inputs
			else if( paramData.$element.next("[name='labels']" ).length ) {
				paramData.$valueElement = paramData.$element.next("[name='labels']" )
			}
			
			// If no element is found..
			else {
				cnsl.error( 'No parameter found with the name', paramName )
				return false
			}
			
			paramData.type = paramData.$valueElement.prop( 'type' )
			
			paramData.value = function(){
				return paramData.$valueElement.val()
			}
			
			// If theres no 'type' attribute, then try to deduce the type manually
			if( ! paramData.type ){
				if( paramData.$valueElement.is( 'multiselect' ) )
					paramData.type = 'select-multiple'
				
				else if( paramData.$valueElement.is( 'select' ) )
					paramData.type = 'select-one'
				
				else 
					cnsl.error( 'Unable to determine the input type for parameter ' + paramName )
			}
			else {
				if( paramData.type === 'checkbox' ){
					//paramData.value = paramData.$valueElement.is( ':checked' )
					paramData.value = function() {
						return paramData.$valueElement.is( ':checked' )
					}
				}
			}
		
			cnsl.debug( 'Param: ' + paramName, paramData )
			
			return paramData;
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
				//paramData.value = paramData.$valueInput.is( ':checked' )
				//paramData.value = function() {
				//	return _param.$valueInput.is( ':checked' )
				//}
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
			var	cnsl = new Utils.console( 'Utils.setParamVisibility' ),
					thisParam,
					verb = ( visible === false ? 'hiding' : 'showing' )
			
			if( typeof paramName === 'undefined' ){
				cnsl.debug( 'Utils.setParamVisibility called, but no parameter names were provided' )
				return 
			}
			
			// If one param was provided (in string format), then just process that one
			if( typeof paramName === 'string' ){
				cnsl.debug( 'Utils.setParamVisibility called with a string as the parameter - %s single parameter: %s', verb, paramName )
				
				if( ! Utils.doesParamExist( paramName ) ){
					cnsl.error( 'Failed to %s parameter - unable to find any parameter with the name "%s"', verb, paramName )
					return 
				}
				
				thisParam = Utils.getJenkinsParam( paramName )
				
				if( visible === false )
					thisParam.hide()
				else
					thisParam.show()
				
				return 
			}
			
			// If an array was provided, then assume there was multiple, iterate through them
			if( $.isArray( paramName ) ){
				cnsl.debug( 'Utils.setParamVisibility called, an array of parameter names was provided: %s', paramName.join(', ') )
				
				paramName.each( function( param ) {
					if( ! Utils.doesParamExist( param ) ){
						cnsl.error( 'Unable to find a Jenkins parameter with the name %s - Skipping to next param name in list' )
						return true
					}
					
					cnsl.debug( '%s the jenkins parameter %s', verb, param)
					
					thisParam = Utils.getJenkinsParam( param )
				
					if( visible === false )
						thisParam.hide()
					else
						thisParam.show()
					
				})
				
				return
			}
			
			// If this is reached, then paramName wasnt a string or an array
			cnsl.error( 'Unable to %s any parameters - Neither a string or an array was provided', verb )
			return
		}
	}

	var General = {
		paramTest: function( reqDetails ){
			var _console = new Utils.console( 'General.paramTest' ),
				param_String = new Utils.jenkinsParam( 'String_Param' ),
				param_Fake = new Utils.jenkinsParam( 'Fake_Param' ),
				param_Password = new Utils.jenkinsParam( 'Password_Param' ),
				param_Boolean = Utils.getJenkinsParam( 'Boolean_Param' ),
				param_ShowPass = Utils.getJenkinsParam( 'Show_Password' ),
				tmpVal

			console.log( 'param_Fake', param_Fake )

			param_Boolean.$valueElement.change( function(){
				tmpVal = param_String.getValue()

				if( tmpVal === 'foo' )
					param_String.setValue( 'bar' )
				else
					_console.log( 'String_Param:', param_String.getValue() )
			})

			param_ShowPass.$valueElement.change( function(){
				var showPassVal = param_ShowPass.value()
				_console.log( 'Show_Password Value:',showPassVal )

				if( showPassVal === true )
					param_Password.showParam()
				else
					param_Password.hideParam()
			})
		}
	}
})(jQuery)