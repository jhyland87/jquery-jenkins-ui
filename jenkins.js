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
		// List of repositories for projects that do utilize the .env file
		envDependentApps: [ 
			'API','WebApp' 
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
			var cnsl = new utils.console( 'controller.init' )
			// If the GET parameter 'debug' is set to 1 or true, or the window.debug variable is set to 1 or true, then enable debugging 
			if( utils.getUrlParam( 'debug' ) == 'true' || utils.getUrlParam( 'debug' ) == '1' || window.debug == true || window.debug == 1 )
				settings.debug = true
			
			var reqDetails = utils.getReqDetails( httpPath )
			
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
		}
	}
	
	/**
	 * Extra utilities to make life easier 
	 */
	var utils = {
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
			this._prefix = prefix || utils.getCallerFuncName() || null
			
			// Function to determine if debug is enabled or not (by looking at the URL)
			this._debugEnabled = function(){
				return utils.getUrlParam( 'debug' ) == 'true' || utils.getUrlParam( 'debug' ) == '1' || window.debug == true || window.debug == 1 
			}
			
			// Wrapper to console.log()
			this.warn = function( str ){
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
		 * Function to attempt to get the name of the function, that calls the function, that calls utils.getCallerFuncName(). For example, if
		 * the function Foo() wants to see who called it, it calls utils.getCallerFuncName(), and that name will be returned (if found). If
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
			var cnsl = new utils.console( 'utils.getReqDetails' ),
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
			var cnsl = new utils.console( 'utils.getJenkinsParam' )
			
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
			var	cnsl = new utils.console( 'utils.setParamVisibility' ),
					thisParam,
					verb = ( visible === false ? 'hiding' : 'showing' )
			
			if( typeof paramName === 'undefined' ){
				cnsl.debug( 'utils.setParamVisibility called, but no parameter names were provided' )
				return 
			}
			
			// If one param was provided (in string format), then just process that one
			if( typeof paramName === 'string' ){
				cnsl.debug( 'utils.setParamVisibility called with a string as the parameter - %s single parameter: %s', verb, paramName )
				
				if( ! utils.doesParamExist( paramName ) ){
					cnsl.error( 'Failed to %s parameter - unable to find any parameter with the name "%s"', verb, paramName )
					return 
				}
				
				thisParam = utils.getJenkinsParam( paramName )
				
				if( visible === false )
					thisParam.hide()
				else
					thisParam.show()
				
				return 
			}
			
			// If an array was provided, then assume there was multiple, iterate through them
			if( $.isArray( paramName ) ){
				cnsl.debug( 'utils.setParamVisibility called, an array of parameter names was provided: %s', paramName.join(', ') )
				
				paramName.each( function( param ) {
					if( ! utils.doesParamExist( param ) ){
						cnsl.error( 'Unable to find a Jenkins parameter with the name %s - Skipping to next param name in list' )
						return true
					}
					
					cnsl.debug( '%s the jenkins parameter %s', verb, param)
					
					thisParam = utils.getJenkinsParam( param )
				
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
	
	/**
	 * Functionality that can be applied to any job or multiple jobs.
	 */
	var General = {
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
			var	cnsl = new utils.console( 'General.requireBuildParams' ),
					$paramForm = $( 'form[name="parameters"]' ),
					$reqElements = $( 'required, span.required-param' ), 
					reqParams = {}, 
					emptyParams = [], 
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
						cnsl.warn( 'couldnt find a param' )
					}
					else {
						paramName = $.trim( $reqElem.text() )
						
						cnsl.debug('Adding the parameter %s to the required parameters list',  paramName )
					
						reqParams[ paramName ] = utils.getJenkinsParam( paramName )
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
					cnsl.debug( 'Not requiring any parameters for this build - None were found' )
					return true
				}
			
				$.each( reqParams, function( name, param ){
					thisVal = param.value()
					
					cnsl.debug( 'The parameter "%s" has te value "%s"', name, param.value() )
					
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
			var $pwdInputs = $('input.setting-input:password')

			$pwdInputs.each(function( i, pi ) {
				$( pi ).val('')
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
			var	cnsl = new utils.console( 'General.setBuildPageDescription' ),
					$buildDesc = $('builddesc, builddescription, build-desc, build-description'),
					descHtml, thisDesc
						
			if( $buildDesc.length === 0 )
				return
			
			// If theres just one description tag, then keep it simple
			if( $buildDesc.length === 1 ){
				cnsl.debug( 'Only one build desc tag' )
				thisDesc = $.trim( $buildDesc.html() )
				
				cnsl.debug( 'Adding build desc text "' + thisDesc + '" to the listItems array' )
				
				if( thisDesc == '' )
					return
				
				descHtml = thisDesc
			}
			
			// If theres more than one, then loop over them to create an unordered list
			else {
				cnsl.debug( $buildDesc.lengt + ' build desc tags FOUND' )
				
				var listItems = []
				
				// Loop through each build-description elements, creating an array of list items for the unordered list
				$.each( $buildDesc, function( k, v ){
					thisDesc = $.trim( $( v ).html() )
					
					cnsl.debug( 'Adding build desc text "' + thisDesc + '" to the listItems array' )
					
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
					descHtml = listItems[0]
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
			
			cnsl.debug( 'Setting the description content to:', descHtml )
			
			$( '<div class="additional-job-details">' + descHtml + '</div>' ).insertAfter('div#main-panel > h1')
		}
	}
	
	/**
	 * Functionality for Deployment related jobs/builds 
	 */
	var Deployments = {
		/**
		 * Sets the value of the Repository parameter based off of the value set in the Web_Application parameter.
		 *
		 * @param	{object}	reqDetails		Result from utils.getReqDetails( httpPath )
		 * @return	{void}
		 */
		setDeployRepo: function setDeployRepo( reqDetails ){
			var	cnsl = new utils.console( 'Deployments.setDeployRepo' ),
					$webappSel = $( "input[value='Web_Application']" ).next("select[name='value']" ),
					$repoSel = $( "input[value='Repository']" ).next("select[name='value']" ),
					setRepo

			// Whenever the Web_Application parameter is changed, execute the below logic to decide what the repo value should be,
			// or clear it out, if the Web_Application was also cleared
			$webappSel.change(function() {
				if( ! $webappSel.val() ){
					cnsl.debug( 'Webapp cleared - Clearing repo' )
					setRepo= ''
				}
				else {
					cnsl.debug( 'Webapp changed to: ', $webappSel.val() )

					// Use Regular Expression to deduce what application is being deployed, based off of the prefix in the Web_Application value 
					var webappName = $webappSel.val().match(/^(?:dev|stage|preprod)?(.*)\.cy-motion.com/)

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
						cnsl.debug('Matched String: ' + webappName[1] + ' - Setting the repo to ' + setRepo)
					}
					
					// If the regex match failed, then default to an empty repo value
					else {
						cnsl.debug('Nothing Matched - Defaulting to the Web repo')
						setRepo= ''
					}
				}
				
				// Update the repository value
				cnsl.debug( 'Updating repository value to: ' + setRepo )	
				$repoSel.val( setRepo ).change()
			})
		},
		
		/**
		 * Hide/Show the parameters that will be used to configure the .env file, based on what server(s) are selected, 
		 * and if the Update_Env_File parameter is checked.
		 * 
		 * This monitors the Update_Env_File checkbox parameter, when checked, it disables the DB settings fields, 
		 * and enables when its checked.
		 *
		 * @param	{object}	reqDetails		Result from utils.getReqDetails( httpPath )
		 * @return	{void}
		 * @todo		This needs to work with Siloed servers, where theres no A and B sites
		 */
		manageEnvParams: function manageEnvParams( reqDetails ){
			// Get the 'Update_Env_File' field
			var	cnsl = new utils.console( 'Deployments.manageEnvParams' ),
					paramWebApp			= utils.getJenkinsParam( 'Web_Application' ),
					paramRepo				= utils.getJenkinsParam( 'Repository' ),
					paramUpdateEnvFile  = utils.getJenkinsParam( 'Update_Env_File' ),
					paramServer 			= utils.getJenkinsParam( 'Server' ),
					dbParams					= {},
					serverVals
			
			// Set the visibility of the DB parameters on the initial page load
			showAppropriateDbParams()
			
			setEnvParamVisibility()
			
			/*
			paramWebApp.$valueElement.change(function(){
				cnsl.debug( 'Web Application parameter changed' )
				cnsl.debug( 'Web_Application Value:', paramWebApp.value() )
				cnsl.debug( 'Update_Env_File Value:', paramUpdateEnvFile.value() )
				cnsl.debug( 'Server Value:', paramServer.value() )
				cnsl.debug( 'Selected Sites:', getSelectedSiteIds() )
				
				//showAppropriateDbParams()
				setEnvParamVisibility()
			})
			*/
			
			paramRepo.$valueElement.change(function(){
				cnsl.debug( 'Repository parameter changed' )
				cnsl.debug( 'Web_Application Value:', paramWebApp.value() )
				cnsl.debug( 'Repository Value:', paramRepo.value() )
				cnsl.debug( 'Update_Env_File Value:', paramUpdateEnvFile.value() )
				cnsl.debug( 'Server Value:', paramServer.value() )
				cnsl.debug( 'Selected Sites:', getSelectedSiteIds() )
				
				showAppropriateDbParams()
				//setEnvParamVisibility()
			})
			
			// Whenever the Server parameter is changed, then toggle the visibility of the DB params, 
			// to show only the appropriate parameters
			paramServer.$valueElement.change( function(){
				cnsl.debug( 'Server parameter changed' )
				cnsl.debug( 'Web_Application Value:', paramWebApp.value() )
				cnsl.debug( 'Update_Env_File Value:', paramUpdateEnvFile.value() )
				cnsl.debug( 'Server Value:', paramServer.value() )
				cnsl.debug( 'Selected Sites:', getSelectedSiteIds() )
				
				showAppropriateDbParams()
			})
			
			// Whenever Update_Env_File is toggled, set the display of the DB params
			paramUpdateEnvFile.$valueElement.change(function() {	
				showAppropriateDbParams()
				
				serverVals = paramServer.value()
				
				// If someone checks the Update_Env_File
				//if( (serverVals === null || serverVals.length === 0 ) && paramUpdateEnvFile.value() == true )
				//	envAlertAndUncheck()
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
				var	_cnsl = new utils.console( 'Deployments.manageEnvParams > getSelectedSiteIds' )
				_cnsl.debug( 'Getting selected sites' )
				
				var 	selected = paramServer.value(),
						result = [], match
								
				// If one or more Servers are selected, then parse the selected options
				if( selected ){
					$.each( selected, function( k, v ){
						_cnsl.debug( 'Matching for site character in selected site value', v )
						
						match = v.match( /^[a-zA-Z]+-[a-zA-Z]+-([a|b])[0-9]{2}$/ )
						
						_cnsl.debug( 'Regex match result for %s:', v, match )
						
						if( match ){
							_cnsl.debug( 'Matched character %s', match[1] )
							result.push( match[1].toUpperCase() )
						}
						else {
							_cnsl.debug( 'No match found' )
						}
					})
				}
				
				_cnsl.debug( result.length ? 'Returning selected site(s): ' + result.join(', ') : 'No selected sites found' )
				
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
				var	_cnsl = new utils.console( 'Deployments.manageEnvParams > getSelectedSiteIds' ),
						sites = [], thisName
			
				// Search for 
				$( "input:hidden[value^=App_DB_Host], input:hidden[value^=Seed_DB_Host]" ).each( function( k, i ){
					thisName = $( i ).val()
					
					_cnsl.debug( 'Found the DB host parameter name: %s', thisName )
					
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
				var	_cnsl = new utils.console( 'Deployments.manageEnvParams > getSelectedSiteIds' ),
						selectedServerOptions = paramServer.value(),
						// All DB Host params - used to keep track of which params need to be hidden after select ones are shown
						allDbHostParams = getAllDbHostParams(),
						repository = paramRepo.value(),
						selectedSites = getSelectedSiteIds() || [],
						toHide = allDbHostParams || [], 
						toShow = [],  thisParam
				
				setEnvParamVisibility()
				
				// If no servers are selected, or the repo selected doesnt need them, hide the params
				if ( (selectedServerOptions === null || selectedServerOptions.length === 0 ) || 
					$.inArray( repository, settings.envDependentApps ) === -1 ){
					
					_cnsl.debug( 'No servers are selected - hiding DB related params' )
					
					// Hide all DB Host params
					utils.setParamVisibility( allDbHostParams, false )
					
					// Hide the credential params
					setCredParamsVisibility( false )
					
					return
				}
				
				// If the Update Env File option is not selected, then hide the parameters
				if( paramUpdateEnvFile.value() != true ){
					_cnsl.debug('Update_Env_File value is unchecked - hiding DB related params' )
					
					// Hide all DB Host params
					utils.setParamVisibility( allDbHostParams, false )
					
					// Hide the credential params
					setCredParamsVisibility( false )
					
					return
				}
			
				// If there are servers selected, but no sites were found - then this job may NOT be deploying 
				// to site-based servers (meaning no A or B)
				if( selectedSites.length === 0 ){
					// If the App_DB_Host and Seed_DB_Host params are found, then show those and the credential params
					if( utils.doesParamExist( 'App_DB_Host' ) && utils.doesParamExist( 'Seed_DB_Host' ) ){
						
						_cnsl.debug( 'Found the parameters App_DB_Host and Seed_DB_Host - Using those as the only DB params' )
						
						// Show the (Seed|App)_DB_Host params, and remove them from the toHide array
						$.each( [ 'Seed_DB_Host', 'App_DB_Host' ], function( k, p ){
							thisParam = utils.getJenkinsParam( p )
							thisParam.show()
							toHide.remove( p )
						})
						
						// Hide any other DB Host params
						utils.setParamVisibility( toHide, false )
						
						// Show credentials
						setCredParamsVisibility( true )
					}
					else {
						_cnsl.debug( 'Some server options were selected, but no site IDs were extracted, and the App_DB_Host and/or Seed_DB_Host params '
							+'were not found. This may be due to the servers having improper hostnames, or the parameters in this job were named incorrectly' )
					}
				}
				
				// If servers ARE selected, and there were some Site IDs found in the hostnames, then show 
				// the DB params for those Site IDs (if they exist)
				else {
					_cnsl.debug( 'There were %s Site IDs found in the selected server hostnames: %s', selectedSites.length, selectedSites.join(', ') )
					
					// Iterate through the selected site IDs - Checking if theres an App_DB_Host and Seed_DB_Host for each one, and showing them if so.
					selectedSites.each( function( site ){
						
						if( utils.doesParamExist( 'App_DB_Host_' + site ) && utils.doesParamExist( 'Seed_DB_Host_' + site ) ){
							
							_cnsl.debug( 'Found the Application DB host and Seed DB host for site %s - Showing the parameters', site )
							// Show the App DB host and Seed DB Host for this site
							$.each([ 'App_DB_Host_' + site, 'Seed_DB_Host_' + site ], function( k, p ){
								thisParam = utils.getJenkinsParam( p )
								thisParam.show()
								toHide.remove( p )
							})
							
							// Hide any other DB Host params
							utils.setParamVisibility( toHide, false )
							
							// Show credentials
							setCredParamsVisibility( true )
						}
						
						else {
							_cnsl.debug( 'Unable to find the Application DB host and/or the Seed DB host for site %s - Unable to show parameters', site )
							
							// Hide any other DB Host params
							utils.setParamVisibility( toHide, false )
							
							// Show credentials
							setCredParamsVisibility( false )
						}
					})
				}
			}
			
			function setEnvParamVisibility(){
				var	webappName = paramWebApp.value(),
						webappProject = webappName.match(/^(?:dev|stage|preprod)?(.*)\.cy-motion.com/),
						repository = paramRepo.value()
						
				console.log('Deploying project in repo:', repository)
					
				// Check if the selected repository uses the .env file - if so, show the Update_Env_File param.
				if( $.inArray( repository, settings.envDependentApps ) !== -1 ){
					paramUpdateEnvFile.$tableRow.css( 'display', '' )
				}
				
				// If not, hide it
				else {
					paramUpdateEnvFile.$tableRow.css( 'display', 'none' )
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
				var	_cnsl = new utils.console( 'Deployments.manageEnvParams > setCredParamsVisibility' ),
				// Store the params to toggle in here
						credParams = {
					DB_Username:  utils.getJenkinsParam( 'DB_Username' ),
					DB_Password: 	 utils.getJenkinsParam( 'DB_Password' ),
					Application_Key: utils.getJenkinsParam( 'Application_Key' )
				}
				
				// If were setting them to visible, then remove the style (which would have display: none)
				if( visible === true )
					$.each( credParams, function( name, param ){
						_cnsl.debug( 'Setting the visibility of the parameter %s to true', name )
						param.show()
					})
				
				// If were hiding them, then add the css style display: none
				else 
					$.each( credParams, function( name, param ){
						_cnsl.debug( 'Setting the visibility of the parameter %s to false', name )
						param.hide()
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
				var	_cnsl = new utils.console( 'Deployments.manageEnvParams > toggleDbHostVisibility' ),
						tmpSites = existingSiteIds
				
				if( typeof sites === 'string' ){
					sites = [ sites ]
				}
				else if( typeof sites !== 'object' ){
					_cnsl.error( 'Function toggleDbHostVisibility expects to be handed an array or a string, not a %s', typeof sites )
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
				var	_cnsl = new utils.console( 'Deployments.manageEnvParams > setSiteDbHostParamVisibility' )
				if( ! site || typeof site !== 'string' ){
					_cnsl.error( 'Site value not provided or not a string' )
					return false
				}
				
				_cnsl.debug( 'Setting App and Seed DB host param visibility for site %s to %s', site, visibility ? 'visible' : 'hidden' )
				
				if( visibility ){
					dbParams[ site.toUpperCase() ].app.$tableRow.css( 'display', '' )
					dbParams[ site.toUpperCase() ].seed.$tableRow.css( 'display', '' )
				}
				else {
					dbParams[ site.toUpperCase() ].app.$tableRow.css( 'display', 'none' )
					dbParams[ site.toUpperCase() ].seed.$tableRow.css( 'display', 'none' )
				}
			}
			
			function envAlertAndUncheck() {
				var 	paramUpdateEnvFile  = utils.getJenkinsParam( 'Update_Env_File' )
				
				alert( 'In order to update the .env file on any server, you must select a value in the Servers parameter field, then you can check the Update_Env_File option.' )
				
				paramUpdateEnvFile.$valueElement.prop( "checked", false );
			}
			
			// Application Key parameter
			var paramAppKey = utils.getJenkinsParam( 'Application_Key' )
		}
	}
})(jQuery)


