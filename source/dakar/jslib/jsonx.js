
/*
	Copyright (c) 2004-2008, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/



if (!this.dojox) dojox = {};
dojox.json = {};
(function(){
    function slice(obj,start,end,step){
		// handles slice operations: [3:6:2]
		var len=obj.length,results = [];
		end = end || len;
		start = (start < 0) ? Math.max(0,start+len) : Math.min(len,start);
		end = (end < 0) ? Math.max(0,end+len) : Math.min(len,end);
	  	for(var i=start; i<end; i+=step){
	  		results.push(obj[i]);
	  	}
		return results;
	}
	function expand(obj,name){
		// handles ..name, .*, [*], [val1,val2], [val]
		// name can be a property to search for, undefined for full recursive, or an array for picking by index
		var results = [];
		function walk(obj){
			if(name){
				if(name===true && !(obj instanceof Array)){
					//recursive object search
					results.push(obj);
				}else if(obj[name]){
					// found the name, add to our results
					results.push(obj[name]);
				}
			}
			for(var i in obj){
				var val = obj[i];
				if(!name){
					// if we don't have a name we are just getting all the properties values (.* or [*])
					results.push(val);
				}else if(val && typeof val == 'object'){
					
					walk(val);
				}
			}
		}
		if(name instanceof Array){
			// this is called when multiple items are in the brackets: [3,4,5]
			if(name.length==1){
				// this can happen as a result of the parser becoming confused about commas 
				// in the brackets like [@.func(4,2)]. Fixing the parser would require recursive 
				// analsys, very expensive, but this fixes the problem nicely. 
				return obj[name[0]];
			}
			for(var i = 0; i < name.length; i++){
				results.push(obj[name[i]]);
			}
		}else{
			// otherwise we expanding
			walk(obj);
		}
		return results;
	}
	dojox.json.query = function(/*String*/query,/*Object?*/obj){
		// summary:
		// 		Performs a JSONQuery on the provided object and returns the results. 
		// 		If no object is provided (just a query), it returns a "compiled" function that evaluates objects
		// 		according to the provided query.
		// query:
		// 		Query string
		// 	obj:
		// 		Target of the JSONQuery
		//
		//	description:
		//		JSONQuery provides a comprehensive set of data querying tools including filtering,
		//		recursive search, sorting, mapping, range selection, and powerful expressions with
		//		wildcard string comparisons and various operators. JSONQuery generally supersets
		// 		JSONPath and provides syntax that matches and behaves like JavaScript where
		// 		possible.
		//
		//		JSONQuery evaluations begin with the provided object, which can referenced with
		// 		$. From
		// 		the starting object, various operators can be successively applied, each operating
		// 		on the result of the last operation. 
		//
		// 		Supported Operators:
		// 		--------------------
		//		* .property - This will return the provided property of the object, behaving exactly 
		// 		like JavaScript. 
		// 		* [expression] - This returns the property name/index defined by the evaluation of 
		// 		the provided expression, behaving exactly like JavaScript.
		//		* [?expression] - This will perform a filter operation on an array, returning all the
		// 		items in an array that match the provided expression. This operator does not
		//		need to be in brackets, you can simply use ?expression, but since it does not
		//		have any containment, no operators can be used afterwards when used 
		// 		without brackets.
		// 		* [/expression], [\expression], [/expression, /expression] - This performs a sort 
		// 		operation on an array, with sort based on the provide expression. Multiple comma delimited sort
		// 		expressions can be provided for multiple sort orders (first being highest priority). /
		//		indicates ascending order and \ indicates descending order
		// 		* [=expression] - This performs a map operation on an array, creating a new array
		//		with each item being the evaluation of the expression for each item in the source array.
		//		* [start:end:step] - This performs an array slice/range operation, returning the elements
		//		from the optional start index to the optional end index, stepping by the optional step number.
		// 		* [expr,expr] - This a union operator, returning an array of all the property/index values from
		// 		the evaluation of the comma delimited expressions. 
		// 		* .* or [*] - This returns the values of all the properties of the current object. 
		// 		* $ - This is the root object, If a JSONQuery expression does not being with a $, 
		// 		it will be auto-inserted at the beginning. 
		// 		* @ - This is the current object in filter, sort, and map expressions. This is generally
		// 		not necessary, names are auto-converted to property references of the current object
		// 		in expressions. 
		// 		*	..property - Performs a recursive search for the given property name, returning
		// 		an array of all values with such a property name in the current object and any subobjects
		// 		* expr = expr - Performs a comparison (like JS's ==). When comparing to
		// 		a string, the comparison string may contain wildcards * (matches any number of 
		// 		characters) and ? (matches any single character).
		// 		* expr ~ expr - Performs a string comparison with case insensitivity.
		//		* ..[?expression] - This will perform a deep search filter operation on all the objects and 
		// 		subobjects of the current data. Rather than only searching an array, this will search 
		// 		property values, arrays, and their children.
		//		* $1,$2,$3, etc. - These are references to extra parameters passed to the query
		//		function or the evaluator function.
		//		* +, -, /, *, &, |, %, (, ), <, >, <=, >=, != - These operators behave just as they do
		// 		in JavaScript.
		//		
		//	
		//	
		// 	|	dojox.json.query(queryString,object) 
		// 		and
		// 	|	dojox.json.query(queryString)(object)
		// 		always return identical results. The first one immediately evaluates, the second one returns a
		// 		function that then evaluates the object.
		//  
		// 	example:
		// 	|	dojox.json.query("foo",{foo:"bar"}) 
		// 		This will return "bar".
		//
		//	example:
		//	|	evaluator = dojox.json.query("?foo='bar'&rating>3");
		//		This creates a function that finds all the objects in an array with a property
		//		foo that is equals to "bar" and with a rating property with a value greater
		//		than 3.
		//	|	evaluator([{foo:"bar",rating:4},{foo:"baz",rating:2}])
		// 		This returns:
		// 	|	{foo:"bar",rating:4}
		//
		//	example:
		// 	|	evaluator = dojox.json.query("$[?price<15.00][\rating][0:10]");
		// 	 	This finds objects in array with a price less than 15.00 and sorts then
		// 		by rating, highest rated first, and returns the first ten items in from this
		// 		filtered and sorted list.
		tokens = [];
		var depth = 0;	
		var str = [];
		query = query.replace(/"(\\.|[^"\\])*"|'(\\.|[^'\\])*'|[\[\]]/g,function(t){  // " // dumb emacs comment
			depth += t == '[' ? 1 : t == ']' ? -1 : 0; // keep track of bracket depth
			return (t == ']' && depth > 0) ? '`]' : // we mark all the inner brackets as skippable
					(t.charAt(0) == '"' || t.charAt(0) == "'") ? "`" + (str.push(t) - 1) :// and replace all the strings
						t;     
		});
		var prefix = '';
		function call(name){
			// creates a function call and puts the expression so far in a parameter for a call 
			prefix = name + "(" + prefix;
		}
		function makeRegex(t,a,b,c,d){
			// creates a regular expression matcher for when wildcards and ignore case is used 
			return str[d].match(/[\*\?]/) ?
					"/" + str[d].substring(1,str[d].length-1).replace(/\\([btnfr\\"'])|([^\w\*\?])/g,"\\$1$2").replace(/([\*\?])/g,".$1") + (c == '~' ? '/i' : '/') + ".test(" + a + ")" : //"// Dumb emacs comment
					t;
		}
		query.replace(/(\]|\)|push|pop|shift|splice|sort|reverse)\s*\(/,function(){ 
			throw new Error("Unsafe function call");
		});
		
		query = query.replace(/([^=]=)([^=])/g,"$1=$2"). // change the equals to comparisons
			replace(/@|(\.\s*)?[a-zA-Z\$_]+(\s*:)?/g,function(t){
				return t.charAt(0) == '.' ? t : // leave .prop alone 
					t == '@' ? "$obj" :// the reference to the current object 
					(t.match(/:|^(\$|Math)$/) ? "" : "$obj.") + t; // plain names should be properties of root... unless they are a label in object initializer
			}).
			replace(/\.?\.?\[(`\]|[^\]])*\]|\?.*|\.\.([\w\$_]+)|\.\*/g,function(t,a,b){
				var oper = t.match(/^\.?\.?(\[\s*\?|\?|\[\s*==)(.*?)\]?$/); // [?expr] and ?expr and [=expr and =expr
				if(oper){
					var prefix = '';
					if(t.match(/^\./)){
						// recursive object search
						call("expand");
						prefix = ",true)";
					}
					call(oper[1].match(/\=/) ? "dojo.map" : "dojo.filter");
					return prefix + ",function($obj){return " + oper[2] + "})"; 
				}
				oper = t.match(/^\[\s*([\/\\].*)\]/); // [/sortexpr,\sortexpr]
				if(oper){
					// make a copy of the array and then sort it using the sorting expression
					return ".concat().sort(function(a,b){" + oper[1].replace(/\s*,?\s*([\/\\])\s*([^,\\\/]+)/g,function(t,a,b){
							return "var av= " + b.replace(/\$obj/,"a") + ",bv= " + b.replace(/\$obj/,"b") + // FIXME: Should check to make sure the $obj token isn't followed by characters
									";if(av>bv||bv==null){return " + (a== "/" ? 1 : -1) +";}\n" +
									"if(bv>av||av==null){return " + (a== "/" ? -1 : 1) +";}\n";
					}) + "})";
				}
				oper = t.match(/^\[(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)\]/); // slice [0:3]
				if(oper){
					call("slice");
					return "," + (oper[1] || 0) + "," + (oper[2] || 0) + "," + (oper[3] || 1) + ")"; 
				}
				if(t.match(/^\.\.|\.\*|\[\s*\*\s*\]|,/)){ // ..prop and [*]
					call("expand");
					return (t.charAt(1) == '.' ? 
							",'" + b + "'" : // ..prop 
								t.match(/,/) ? 
									"," + t : // [prop1,prop2]
									"") + ")"; // [*]
				}
				return t;
			}).
			replace(/(\$obj\s*(\.\s*[\w_$]+\s*)*)(==|~)\s*`([0-9]+)/g,makeRegex). // create regex matching
			replace(/`([0-9]+)\s*(==|~)\s*(\$obj(\s*\.\s*[\w_$]+)*)/g,function(t,a,b,c,d){ // and do it for reverse =
				return makeRegex(t,c,d,b,a);
			});
		query = prefix + (query.charAt(0) == '$' ? "" : "$") + query.replace(/`([0-9]+|\])/g,function(t,a){
			//restore the strings
			return a == ']' ? ']' : str[a];
		});
		// create a function within this scope (so it can use expand and slice)
		
		var executor = eval("1&&function($,$1,$2,$3,$4,$5,$6,$7,$8,$9){var $obj=$;return " + query + "}");
		for(var i = 0;i<arguments.length-1;i++){
			arguments[i] = arguments[i+1];
		}
		return obj ? executor.apply(this,arguments) : executor;
	};
	
})();


// summary:
// Adds advanced JSON {de}serialization capabilities to the base json library.
// This enhances the capabilities of dojo.toJson and dojo.fromJson,
// adding referencing support, date handling, and other extra format handling.
// On parsing, references are resolved. When references are made to
// ids/objects that have been loaded yet, the loader function will be set to
// _loadObject to denote a lazy loading (not loaded yet) object. 

dojox.json.ref = {
	resolveJson: function(/*Object*/ root,/*Object?*/ args){
		// summary:
		// 		Indexes and resolves references in the JSON object.
		// description:
		// 		A JSON Schema object that can be used to advise the handling of the JSON (defining ids, date properties, urls, etc)
		//
		// root:
		//		The root object of the object graph to be processed
		// args:
		//		Object with additional arguments:
		//
		// The *index* parameter.
		//		This is the index object (map) to use to store an index of all the objects. 
		// 		If you are using inter-message referencing, you must provide the same object for each call.
		// The *defaultId* parameter.
		//		This is the default id to use for the root object (if it doesn't define it's own id)
		//	The *idPrefix* parameter.
		//		This the prefix to use for the ids as they enter the index. This allows multiple tables 
		// 		to use ids (that might otherwise collide) that enter the same global index. 
		// 		idPrefix should be in the form "/Service/".  For example,
		//		if the idPrefix is "/Table/", and object is encountered {id:"4",...}, this would go in the
		//		index as "/Table/4".
		//	The *idAttribute* parameter.
		//		This indicates what property is the identity property. This defaults to "id"
		//	The *assignAbsoluteIds* parameter.
		//		This indicates that the resolveJson should assign absolute ids (__id) as the objects are being parsed.
		//  
		// The *schemas* parameter
		//		This provides a map of schemas, from which prototypes can be retrieved
		// The *loader* parameter
		//		This is a function that is called added to the reference objects that can't be resolved (lazy objects)
		// return:
		//		An object, the result of the processing
		args = args || {};
		var idAttribute = args.idAttribute || 'id';
		var prefix = args.idPrefix || '/'; 
		var assignAbsoluteIds = args.assignAbsoluteIds;
		var index = args.index || {}; // create an index if one doesn't exist
		var ref,reWalk=[];
		var pathResolveRegex = /^(.*\/)?(\w+:\/\/)|[^\/\.]+\/\.\.\/|^.*\/(\/)/;
		var addProp = this._addProp;
		function walk(it, stop, defaultId, defaultObject){
			// this walks the new graph, resolving references and making other changes
		 	var update, val, id = it[idAttribute] || defaultId;
		 	if(id !== undefined){
		 		id = (prefix + id).replace(pathResolveRegex,'$2$3');
		 	}
		 	var target = defaultObject || it;
			if(id !== undefined){ // if there is an id available...
				if(assignAbsoluteIds){
					it.__id = id;
				}
				// if the id already exists in the system, we should use the existing object, and just 
				// update it... as long as the object is compatible
				if(index[id] && ((it instanceof Array) == (index[id] instanceof Array))){ 
					target = index[id];
					delete target.$ref; // remove this artifact
					update = true;
				}else{
				 	var proto = args.schemas && (!(it instanceof Array)) && // won't try on arrays to do prototypes, plus it messes with queries 
		 					(val = id.match(/^(.+\/)[^\.\[]*$/)) && // if it has a direct table id (no paths)
		 					(val = args.schemas[val[1]]) && val.prototype; // and if has a prototype
					if(proto){
						// if the schema defines a prototype, that needs to be the prototype of the object
						var F = function(){};
						F.prototype = proto;
						target = new F();
					}
				}
				index[id] = target; // add the prefix, set _id, and index it
			}
	
	
			for(var i in it){
				if(it.hasOwnProperty(i)){
					if((typeof (val=it[i]) =='object') && val){
						ref=val.$ref;
						if(ref){ // a reference was found
							var stripped = ref.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');// trim it
							if(/[\w\[\]\.\$# \/\r\n\t]/.test(stripped) && !/\=|((^|\W)new\W)/.test(stripped)){
								// make sure it is a safe reference
								delete it[i];// remove the property so it doesn't resolve to itself in the case of id.propertyName lazy values
								var path = ref.match(/(^([^\[]*\/)?[^\.\[]*)([\.\[].*)?/); // divide along the path
								if((ref = (path[1]=='$' || path[1]=='this' || path[1]=='#') ? root : index[(prefix + path[1]).replace(pathResolveRegex,'$2$3')])){  // a $ indicates to start with the root, otherwise start with an id
									// // starting point was found, use eval to resolve remaining property references
									// // need to also make reserved words safe by replacing with index operator
									try{
										ref = path[3] ? eval('ref' + path[3].replace(/^#/,'').replace(/^([^\[\.])/,'.$1').replace(/\.([\w$_]+)/g,'["$1"]')) : ref;
									}catch(e){
										ref = null;
									}
								}
								if(ref){
									// otherwise, no starting point was found (id not found), if stop is set, it does not exist, we have
									// unloaded reference, if stop is not set, it may be in a part of the graph not walked yet,
									// we will wait for the second loop
									val = ref;
								}else{
									if(!stop){
										var rewalking;
										if(!rewalking){
											reWalk.push(target); // we need to rewalk it to resolve references
										}
										rewalking = true; // we only want to add it once
									}else{
										val = walk(val, false, val.$ref);
										// create a lazy loaded object
										val._loadObject = args.loader;
									}
								}
							}
						}else{
							if(!stop){ // if we are in stop, that means we are in the second loop, and we only need to check this current one,
								// further walking may lead down circular loops
								val = walk(
									val,
									reWalk==it,
									id && addProp(id, i), // the default id to use 
									// if we have an existing object child, we want to 
									// maintain it's identity, so we pass it as the default object
									target != it && typeof target[i] == 'object' && target[i] 
								);
							}
						}
					}
					it[i] = val;
					if(target!=it){// performance guard				
						var old = target[i];
						target[i] = val; // update the target
						if(update && val !== old){ // only update if it changed
							if(index.onUpdate){
								index.onUpdate(target,i,old,val); // call the listener for each update
							}
						}
					}
				}
			}
	
			if(update){
				// this means we are updating, we need to remove deleted
				for(i in target){
					if(!it.hasOwnProperty(i) && i != '__id' && i != '__clientId' && !(target instanceof Array && isNaN(i))){
						if(index.onUpdate){
							index.onUpdate(target,i,target[i],undefined); // call the listener for each update
						}
						delete target[i];
						while(target instanceof Array && target.length && target[target.length-1] === undefined){
							// shorten the target if necessary
							target.length--;
						}
					}
				}
			}else{
				if(index.onLoad){
					index.onLoad(target);
				}
			}
			return target;
		}
		if(root && typeof root == 'object'){
			root = walk(root,false,args.defaultId); // do the main walk through
			walk(reWalk,false); // re walk any parts that were not able to resolve references on the first round
		}
		return root;
	},


	fromJson: function(/*String*/ str,/*Object?*/ args){
	// summary:
	// 		evaluates the passed string-form of a JSON object.
	//
	// str:
	//		a string literal of a JSON item, for instance:
	//			'{ "foo": [ "bar", 1, { "baz": "thud" } ] }'
	// args: See resolveJson
	//
	// return:
	//		An object, the result of the evaluation
		function ref(target){ // support call styles references as well
			return {$ref:target};
		}
		var root = eval('(' + str + ')'); // do the eval
		if(root){
			return this.resolveJson(root, args);
		}
		return root;
	},
	
	toJson: function(/*Object*/ it, /*Boolean?*/ prettyPrint, /*Object?*/ idPrefix, /*Object?*/ indexSubObjects){
		// summary:
		//		Create a JSON serialization of an object.
		//		This has support for referencing, including circular references, duplicate references, and out-of-message references
		// 		id and path-based referencing is supported as well and is based on http://www.json.com/2007/10/19/json-referencing-proposal-and-library/.
		//
		// it:
		//		an object to be serialized.
		//
		// prettyPrint:
		//		if true, we indent objects and arrays to make the output prettier.
		//		The variable dojo.toJsonIndentStr is used as the indent string
		//		-- to use something other than the default (tab),
		//		change that variable before calling dojo.toJson().
		//
		// idPrefix: The prefix that has been used for the absolute ids
		//
		// return:
		//		a String representing the serialized version of the passed object.
		var useRefs = this._useRefs;
		var addProp = this._addProp;
		idPrefix = idPrefix || ''; // the id prefix for this context
		var paths=indexSubObjects || {};
		function serialize(it,path,_indentStr){
			if(typeof it == 'object' && it){
				var value;
				if(it instanceof Date){ // properly serialize dates
					return '"' + dojo.date.stamp.toISOString(it,{zulu:true}) + '"';
				}
				var id = it.__id;
				if(id){ // we found an identifiable object, we will just serialize a reference to it... unless it is the root
					if(path != '#' && (useRefs || paths[id])){
						var ref = id; // a pure path based reference, leave it alone
	
						if(id.charAt(0)!='#'){
							if(id.substring(0, idPrefix.length) == idPrefix){ // see if the reference is in the current context
								// a reference with a prefix matching the current context, the prefix should be removed
								ref = id.substring(idPrefix.length);
							}else{
								// a reference to a different context, assume relative url based referencing
								ref = id;
							}
						}
						return serialize({
							$ref: ref
						},'#');
					}
					path = id;
				}else{
					it.__id = path; // we will create path ids for other objects in case they are circular
					paths[path] = it;// save it here so they can be deleted at the end
				}
				_indentStr = _indentStr || "";
				var nextIndent = prettyPrint ? _indentStr + dojo.toJsonIndentStr : "";
				var newLine = prettyPrint ? "\n" : "";
				var sep = prettyPrint ? " " : "";
	
				if(it instanceof Array){
					var res = dojo.map(it, function(obj,i){
						var val = serialize(obj, addProp(path, i), nextIndent);
						if(typeof val != "string"){
							val = "undefined";
						}
						return newLine + nextIndent + val;
					});
					return "[" + res.join("," + sep) + newLine + _indentStr + "]";
				}
	
				var output = [];
				for(var i in it){
					if(it.hasOwnProperty(i)){
						var keyStr;
						if(typeof i == "number"){
							keyStr = '"' + i + '"';
						}else if(typeof i == "string" && i.charAt(0) != '_'){
							keyStr = dojo._escapeString(i);
						}else{
							// skip non-string or number keys
							continue;
						}
						var val = serialize(it[i],addProp(path, i),nextIndent);
						if(typeof val != "string"){
							// skip non-serializable values
							continue;
						}
						output.push(newLine + nextIndent + keyStr + ":" + sep + val);
					}
				}
				return "{" + output.join("," + sep) + newLine + _indentStr + "}";
			}else if(typeof it == "function" && dojox.json.ref.serializeFunctions){
				return it.toString();
			}
	
			return dojo.toJson(it); // use the default serializer for primitives
		}
		var json = serialize(it,'#','');
		if(!indexSubObjects){
			for(i in paths)  {// cleanup the temporary path-generated ids
				delete paths[i].__id;
			}
		}
		return json;
	},
	_addProp: function(id, prop){
		return id + (id.match(/#/) ? '' : '#') +
					(typeof prop == 'string' ? // is it a string
						prop.match(/^[a-zA-Z]\w*$/) ? ('.' + prop) : // yes, otherwise we have to escape it
							('[' + dojo._escapeString(prop).replace(/"/g,"'") + ']') :
						('[' + prop + ']'));
	},
	_useRefs: false,
	serializeFunctions: false
}

dojox.json.schema = {};

dojox.json.schema.validate = function(/*Any*/instance,/*Object*/schema){
	// summary:
	//  	To use the validator call this with an instance object and an optional schema object.
	// 		If a schema is provided, it will be used to validate. If the instance object refers to a schema (self-validating), 
	// 		that schema will be used to validate and the schema parameter is not necessary (if both exist, 
	// 		both validations will occur).
	//	instance:
	//		The instance value/object to validate
	// schema:
	//		The schema to use to validate
	// description: 
	// 		The validate method will return an object with two properties:
	// 			valid: A boolean indicating if the instance is valid by the schema
	// 			errors: An array of validation errors. If there are no errors, then an 
	// 					empty list will be returned. A validation error will have two properties: 
	// 						property: which indicates which property had the error
	// 						message: which indicates what the error was
	//
	return this._validate(instance,schema,false);
};
dojox.json.schema.checkPropertyChange = function(/*Any*/value,/*Object*/schema){
	// summary:
	// 		The checkPropertyChange method will check to see if an value can legally be in property with the given schema
	// 		This is slightly different than the validate method in that it will fail if the schema is readonly and it will
	// 		not check for self-validation, it is assumed that the passed in value is already internally valid.  
	// 		The checkPropertyChange method will return the same object type as validate, see JSONSchema.validate for 
	// 		information.
	//	value:
	//		The new instance value/object to check
	// schema:
	//		The schema to use to validate
	// return: 
	// 		see dojox.validate.jsonSchema.validate
	//
	return this._validate(value,schema,true);
};
dojox.json.schema._validate = function(/*Any*/instance,/*Object*/schema,/*Boolean*/ _changing){
	
	var errors = [];
		// validate a value against a property definition
	function checkProp(value, schema, path,i){
		if(typeof schema != 'object'){
			return null;
		}			
		path += path ? typeof i == 'number' ? '[' + i + ']' : typeof i == 'undefined' ? '' : '.' + i : i;
		function addError(message){
			errors.push({property:path,message:message});
		}
		if(_changing && schema.readonly){
			addError("is a readonly field, it can not be changed");
		}
		if(schema instanceof Array){
			if(!(value instanceof Array)){
				return [{property:path,message:"An array tuple is required"}];
			}
			for(i =0; i < schema.length; i++){
				errors.concat(checkProp(value[i],schema[i],path,i));
			}
			return errors;
		}
		if(schema['extends']){ // if it extends another schema, it must pass that schema as well
			checkProp(value,schema['extends'],path,i);
		}
		// validate a value against a type definition
		function checkType(type,value){
			if(type){
				if(typeof type == 'string' && type != 'any' && 
						(type == 'null' ? value !== null : typeof value != type) && 
						!(value instanceof Array && type == 'array') &&
						!(type == 'integer' && !(value%1))){
					return [{property:path,message:(typeof value) + " value found, but a " + type + " is required"}];
				}
				if(type instanceof Array){
					var unionErrors=[];
					for(var j = 0; j < type.length; j++){ // a union type 
						if(!(unionErrors=checkType(type[j],value)).length){
							break;
						}
					}
					if(unionErrors.length){
						return unionErrors;
					}
				}else if(typeof type == 'object'){
					checkProp(value,type,path);
				} 
			}
			return [];
		}
		if(value !== null){
			if(value === undefined){
				if(!schema.optional){  
					addError("is missing and it is not optional");
				}
			}else{
				errors = errors.concat(checkType(schema.type,value));
				if(schema.disallow && !checkType(schema.disallow,value).length){
					addError(" disallowed value was matched");
				}
				if(value instanceof Array){
					if(schema.items){
						for(i =0,l=value.length; i < l; i++){
							errors.concat(checkProp(value[i],schema.items,path,i));
						}							
					}
					if(schema.minItems && value.length < schema.minItems){
						addError("There must be a minimum of " + schema.minItems + " in the array");
					}
					if(schema.maxItems && value.length > schema.maxItems){
						addError("There must be a maximum of " + schema.maxItems + " in the array");
					}
				}else if(schema.properties && typeof value == 'object'){
					errors.concat(checkObj(value,schema.properties,path,schema.additionalProperties));
				}
				if(schema.pattern && typeof value == 'string' && !value.match(schema.pattern)){
					addError("does not match the regex pattern " + schema.pattern);
				}
				if(schema.maxLength && typeof value == 'string' && value.length > schema.maxLength){
					addError("may only be " + schema.maxLength + " characters long");
				}
				if(schema.minLength && typeof value == 'string' && value.length < schema.minLength){
					addError("must be at least " + schema.minLength + " characters long");
				}
				if(typeof schema.minimum !== undefined && typeof value == typeof schema.minimum && 
						schema.minimum > value){
					addError("must have a minimum value of " + schema.minimum);
				}
				if(typeof schema.maximum !== undefined && typeof value == typeof schema.maximum && 
						schema.maximum < value){
					addError("must have a maximum value of " + schema.maximum);
				}
				if(schema['enum']){
					var enumer = schema['enum'];
					l = enumer.length;
					var found;
					for(var j = 0; j < l; j++){
						if(enumer[j]===value){
							found=1;
							break;
						}
					}
					if(!found){
						addError("does not have a value in the enumeration " + enumer.join(", "));
					}
				}
				if(typeof schema.maxDecimal == 'number' && (value * 10^schema.maxDecimal)%1){
					addError("may only have " + schema.maxDecimal + " digits of decimal places");
				}
			}
		}
		return null;
	}
	// validate an object against a schema
	function checkObj(instance,objTypeDef,path,additionalProp){
	
		if(typeof objTypeDef =='object'){
			if(typeof instance != 'object' || instance instanceof Array){
				errors.push({property:path,message:"an object is required"});
			}
			
			for(var i in objTypeDef){ 
				if(objTypeDef.hasOwnProperty(i)){
					var value = instance[i];
					var propDef = objTypeDef[i];
					checkProp(value,propDef,path,i);
				}
			}
		}
		for(i in instance){
			if(instance.hasOwnProperty(i) && objTypeDef && !objTypeDef[i] && additionalProp===false){
				errors.push({property:path,message:(typeof value) + "The property " + i +
						" is not defined in the objTypeDef and the objTypeDef does not allow additional properties"});
			}
			var requires = objTypeDef && objTypeDef[i] && objTypeDef[i].requires;
			if(requires && !(requires in instance)){
				errors.push({property:path,message:"the presence of the property " + i + " requires that " + requires + " also be present"});
			}
			value = instance[i];
			if(objTypeDef && typeof objTypeDef == 'object' && !(i in objTypeDef)){
				checkProp(value,additionalProp,path,i); 
			}
			if(!_changing && value && value.$schema){
				errors = errors.concat(checkProp(value,value.$schema,path,i));
			}
		}
		return errors;
	}
	if(schema){
		checkProp(instance,schema,'','');
	}
	if(!_changing && instance.$schema){
		checkProp(instance,instance.$schema,'','');
	}
	return {valid:!errors.length,errors:errors};
};



