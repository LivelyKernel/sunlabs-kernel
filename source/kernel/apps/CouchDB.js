// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

// A simple class to represent a database. Uses XMLHttpRequest to interface with
// the CouchDB server.
// Converted to fit the class approach of LK

module('apps.CouchDB').requires().toRun(function() {
	
Object.subclass("CouchDB", {
	documentation: "A simple class to represent a database. Uses XMLHttpRequest to interface with the CouchDB server.",

	initialize: function(name, httpHeaders) {
		this.name = name;
		this.urlStart ="/couchdb/";
		this.uri = this.urlStart + encodeURIComponent(name) + "/";
  		// The XMLHttpRequest object from the most recent request. Callers can
 		// use this to check result http status and headers.
  		this.last_req = null;
  		this.uuids_cache = [];
  		this.docQueue = [];
	},

	request: function(method, uri, requestOptions) {
      requestOptions = requestOptions || {};
      requestOptions.headers = this.combine(requestOptions.headers, httpHeaders);
      return this.request(method, uri, requestOptions);
	},

	// Creates the database on the server
	createDb: function() {
	    this.last_req = this.request("PUT", this.uri);
	    this.maybeThrowError(this.last_req);
	    return this.fromeJSON(this.last_req.responseText);
	},

  // Deletes the database on the server
	deleteDb: function() {
	    this.last_req = this.request("DELETE", this.uri);
	    if (this.last_req.status == 404)
	      return false;
	    this.maybeThrowError(this.last_req);
	    return this.fromeJSON(this.last_req.responseText);
	},

  // Save a document to the database
	save: function(doc, options) {
	    if (doc._id == undefined)
	      doc._id = this.newUuids(1)[0];
	
	    this.last_req = this.request("PUT", this.uri  +
	        encodeURIComponent(doc._id) + this.encodeOptions(options),
	        {body: this.toJSON(doc)});
	    this.maybeThrowError(this.last_req);
	    var result = this.fromeJSON(this.last_req.responseText);
	    doc._rev = result.rev;
	    return result;
	},
	
	sendAsync: function(doc, options) {
	    if (doc._id == undefined)
	      doc._id = this.newUuids(1)[0];
	     
	    var params = ["PUT", this.uri  +
	        encodeURIComponent(doc._id) + this.encodeOptions(options),
	        {body: this.toJSON(doc)}, true];
	    this.docQueue.push(params);
	    if(this.docQueue.length === 1){
	    	this.sendFromQueue();
	    }
	},
	
	sendFromQueue: function() {
		if(this.docQueue.length > 0){
			var params = this.docQueue.shift();
			this.last_req = this.requestSynOrAsynForQueue.apply(this,params);
		}
	},
	
	
	saveView: function(doc, options) {
	    if (doc._id == undefined)
	      doc._id = this.newUuids(1)[0];
	
	    this.last_req = this.request("PUT", this.uri  +
	        doc._id + this.encodeOptions(options),
	        {body: this.toJSON(doc)});
	    this.maybeThrowError(this.last_req);
	    var result = this.fromeJSON(this.last_req.responseText);
	    doc._rev = result.rev;
	    return result;
	},

  // Open a document from the database
  open: function(docId, options) {
    this.last_req = this.request("GET", this.uri + encodeURIComponent(docId) + this.encodeOptions(options));
    if (this.last_req.status == 404)
      return null;
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  // Deletes a document from the database
  deleteDoc: function(doc) {
    this.last_req = this.request("DELETE", this.uri + encodeURIComponent(doc._id) + "?rev=" + doc._rev);
    this.maybeThrowError(this.last_req);
    var result = this.fromeJSON(this.last_req.responseText);
    doc._rev = result.rev; //record rev in input document
    doc._deleted = true;
    return result;
  },

  // Deletes an attachment from a document
  deleteDocAttachment: function(doc, attachment_name) {
    this.last_req = this.request("DELETE", this.uri + encodeURIComponent(doc._id) + "/" + attachment_name + "?rev=" + doc._rev);
    this.maybeThrowError(this.last_req);
    var result = this.fromeJSON(this.last_req.responseText);
    doc._rev = result.rev; //record rev in input document
    return result;
  },

  bulkSave: function(docs, options) {
    // first prepoulate the UUIDs for new documents
    var newCount = 0;
    for (var i=0; i<docs.length; i++) {
      if (docs[i]._id == undefined)
        newCount++;
    }
    var newUuids = this.newUuids(docs.length);
    var newCount = 0;
    for (var i=0; i<docs.length; i++) {
      if (docs[i]._id == undefined)
        docs[i]._id = newUuids.pop();
    }
    var json = {"docs": docs};
    // put any options in the json
    for (var option in options) {
      json[option] = options[option];
    }
    this.last_req = this.request("POST", this.uri + "_bulk_docs", {
      body: this.toJSON(json)
    });
    if (this.last_req.status == 417) {
      return {errors: this.fromeJSON(this.last_req.responseText)};
    }
    else {
      this.maybeThrowError(this.last_req);
      var results = this.fromeJSON(this.last_req.responseText);
      for (var i = 0; i < docs.length; i++) {
        if(results[i].rev)
          docs[i]._rev = results[i].rev;
      }
      return results;
    }
  },

  ensureFullCommit: function() {
    this.last_req = this.request("POST", this.uri + "_ensure_full_commit");
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  // Applies the map function to the contents of database and returns the results.
  query: function(mapFun, reduceFun, options, keys, language) {
    var body = {language: language || "javascript"};
    if(keys) {
      body.keys = keys ;
    }
    if (typeof(mapFun) != "string")
      mapFun = mapFun.toSource ? mapFun.toSource() : "(" + mapFun.toString() + ")";
    body.map = mapFun;
    if (reduceFun != null) {
      if (typeof(reduceFun) != "string")
        reduceFun = reduceFun.toSource ? reduceFun.toSource() : "(" + reduceFun.toString() + ")";
      body.reduce = reduceFun;
    }
    if (options && options.options != undefined) {
        body.options = options.options;
        delete options.options;
    }
    this.last_req = this.request("POST", this.uri + "_temp_view" + this.encodeOptions(options), {
      headers: {"Content-Type": "application/json"},
      body: this.toJSON(body)
    });
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  view: function(viewname, options, keys) {
    var viewParts = viewname.split('/');
    var viewPath = this.uri + "_design/" + viewParts[0] + "/_view/"
        + viewParts[1] + this.encodeOptions(options);
    if(!keys) {
      this.last_req = this.request("GET", viewPath);
    } else {
      this.last_req = this.request("POST", viewPath, {
        headers: {"Content-Type": "application/json"},
        body: this.toJSON({keys:keys})
      });
    }
    if (this.last_req.status == 404)
      return null;
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  // gets information about the database
  info: function() {
    this.last_req = this.request("GET", this.uri);
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  // gets information about a design doc
  designInfo: function(docid) {
    this.last_req = this.request("GET", this.uri + docid + "/_info");
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  viewCleanup: function() {
    this.last_req = this.request("POST", this.uri + "_view_cleanup");
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  allDocs: function(options,keys) {
    if(!keys) {
      this.last_req = this.request("GET", this.uri + "_all_docs" + this.encodeOptions(options));
    } else {
      this.last_req = this.request("POST", this.uri + "_all_docs" + this.encodeOptions(options), {
        headers: {"Content-Type": "application/json"},
        body: this.toJSON({keys:keys})
      });
    }
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  designDocs: function() {
    return this.allDocs({startkey:"_design", endkey:"_design0"});
  },

  allDocsBySeq: function(options,keys) {
    var req = null;
    if(!keys) {
      req = this.request("GET", this.uri + "_all_docs_by_seq" + this.encodeOptions(options));
    } else {
      req = this.request("POST", this.uri + "_all_docs_by_seq" + this.encodeOptions(options), {
        headers: {"Content-Type": "application/json"},
        body: this.toJSON({keys:keys})
      });
    }
    this.maybeThrowError(req);
    return this.fromeJSON(req.responseText);
  },

  compact: function() {
    this.last_req = this.request("POST", this.uri + "_compact");
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  setDbProperty: function(propId, propValue) {
    this.last_req = this.request("PUT", this.uri + propId,{
      body:this.toJSON(propValue)
    });
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  getDbProperty: function(propId) {
    this.last_req = this.request("GET", this.uri + propId);
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  setAdmins: function(adminsArray) {
    this.last_req = this.request("PUT", this.uri + "_admins",{
      body:this.toJSON(adminsArray)
    });
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  getAdmins: function() {
    this.last_req = this.request("GET", this.uri + "_admins");
    this.maybeThrowError(this.last_req);
    return this.fromeJSON(this.last_req.responseText);
  },

  // Convert a options object to an url query string.
  // ex: {key:'value',key2:'value2'} becomes '?key="value"&key2="value2"'
  encodeOptions: function (options) {
    var buf = [];
    if (typeof(options) == "object" && options !== null) {
      for (var name in options) {
        if (!options.hasOwnProperty(name)) continue;
        var value = options[name];
        if (name == "key" || name == "startkey" || name == "endkey") {
          value = this.toJSON(value);
        }
        buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
      }
    }
    if (!buf.length) {
      return "";
    }
    return "?" + buf.join("&");
  },

  toJSON: function (obj) {
  	//JSON.stringify is the original API
    return obj !== null ? JSON.serialize(obj) : null;
  },
  
  fromeJSON: function(txt) {
  	// JSON.parse is the original API
  	 return JSON.unserialize(txt);
  },

  combine: function (object1, object2) {
    if (!object2)
      return object1;
    if (!object1)
      return object2;

    for (var name in object2)
      object1[name] = object2[name];

    return object1;
  },

login: function(username, password) {
  this.last_req = this.request("POST", this.urlStart+"_session", {
    headers: {"Content-Type": "application/x-www-form-urlencoded",
      "X-CouchDB-WWW-Authenticate": "Cookie"},
    body: "username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password)
  });
  return this.fromeJSON(this.last_req.responseText);
},

logout: function() {
  this.last_req = this.request("DELETE", this.urlStart+"_session", {
    headers: {"Content-Type": "application/x-www-form-urlencoded",
      "X-CouchDB-WWW-Authenticate": "Cookie"}
  });
  return this.fromeJSON(this.last_req.responseText);
},

createUser: function(username, password, email, roles, basicAuth) {
  var roles_str = "";
  if (roles) {
    for (var i=0; i< roles.length; i++) {
      roles_str += "&roles=" + encodeURIComponent(roles[i]);
    }
  }
  var headers = {"Content-Type": "application/x-www-form-urlencoded"};
  if (!basicAuth) {
    headers['X-CouchDB-WWW-Authenticate'] = 'Cookie';
  }
  
  this.last_req = this.request("POST", this.urlStart+"_user/", {
    headers: headers,
    body: "username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password) 
          + "&email="+ encodeURIComponent(email)+ roles_str
    
  });
  return this.fromeJSON(this.last_req.responseText);
},

updateUser: function(username, email, roles, password, old_password) {
  var roles_str = "";
  if (roles) {
    for (var i=0; i< roles.length; i++) {
      roles_str += "&roles=" + encodeURIComponent(roles[i]);
    }
  }

  var body = "email="+ encodeURIComponent(email)+ roles_str;

  if (typeof(password) != "undefined" && password)
    body += "&password=" + password;

  if (typeof(old_password) != "undefined" && old_password)
    body += "&old_password=" + old_password;

  this.last_req = this.request("PUT", this.urlStart+"_user/"+encodeURIComponent(username), {
    headers: {"Content-Type": "application/x-www-form-urlencoded",
      "X-CouchDB-WWW-Authenticate": "Cookie"},
    body: body
  });
  return this.fromeJSON(this.last_req.responseText);
},

allDbs: function() {
  this.last_req = this.request("GET", this.urlStart+"_all_dbs");
    this.maybeThrowError(this.last_req);
  return this.fromeJSON(this.last_req.responseText);
},

allDesignDocs: function() {
  var ddocs = {}, dbs = this.allDbs();
  for (var i=0; i < dbs.length; i++) {
    var db = new CouchDB(dbs[i]);
    ddocs[dbs[i]] = db.designDocs();
  };
  return ddocs;
},

getVersion: function() {
  this.last_req = this.request("GET", this.urlStart+"");
  this.maybeThrowError(this.last_req);
  return this.fromeJSON(this.last_req.responseText).version;
},

replicate: function(source, target, rep_options) {
  rep_options = rep_options || {};
  var headers = rep_options.headers || {};
  this.last_req = this.request("POST", this.urlStart+"_replicate", {
    headers: headers,
    body: this.toJSON({source: source, target: target})
  });
  this.maybeThrowError(this.last_req);
  return this.fromeJSON(this.last_req.responseText);
},

newXhr: function() {
  if (typeof(XMLHttpRequest) != "undefined") {
    return new XMLHttpRequest();
  } else if (typeof(ActiveXObject) != "undefined") {
    return new ActiveXObject("Microsoft.XMLHTTP");
  } else {
    throw new Error("No XMLHTTPRequest support detected");
  }
},

request: function(method, uri, options) {
	return this.requestSynOrAsyn(method, uri, options, false);
},

requestSynOrAsyn: function(method, uri, options, async, callback) {
  options = options || {};
  var req = this.newXhr();
  req.open(method, uri, async);
  if (options.headers) {
    var headers = options.headers;
    for (var headerName in headers) {
      if (!headers.hasOwnProperty(headerName)) continue;
      req.setRequestHeader(headerName, headers[headerName]);
    }
  }
  if(typeof callback === 'function'){
  	req.onreadystatechange = callback;
  }
  req.send(options.body || "");
  return req;
},

requestSynOrAsynForQueue: function(method, uri, options, async) {
	var callback = function (aEvt) {  
	   if (req.readyState == 4) {  
	      if(req.status == 200){
	      	console.log("DB request sucsesfully"); 
	       this.sendFromQueue();
	      }else{  
	      	console.warn("DB request returned HTTP-Code "+req.status);
      	}
	   }  
   }.bind(this);
   this.requestSynOrAsyn(method, uri, options, async, callback);
},

requestStats: function(module, key, test) {
  var query_arg = "";
  if(test !== null) {
    query_arg = "?flush=true";
  }

  var stat = this.request("GET", this.urlStart+"_stats/" + module + "/" + key + query_arg).responseText;
  return this.fromeJSON(stat)[module][key];
},

newUuids: function(n) {
  if (this.uuids_cache.length >= n) {
    var uuids = this.uuids_cache.slice(this.uuids_cache.length - n);
    if(this.uuids_cache.length - n == 0) {
      this.uuids_cache = [];
    } else {
      this.uuids_cache =
          this.uuids_cache.slice(0, this.uuids_cache.length - n);
    }
    return uuids;
  } else {
    this.last_req = this.request("GET", this.urlStart+"_uuids?count=" + (100 + n));
    this.maybeThrowError(this.last_req);
    var result = this.fromeJSON(this.last_req.responseText);
    this.uuids_cache =
        this.uuids_cache.concat(result.uuids.slice(0, 100));
    return result.uuids.slice(100);
  }
},

maybeThrowError: function(req) {
  if (req.status >= 400) {
    try {
      var result = this.fromeJSON(req.responseText);
    } catch (ParseError) {
      var result = {error:"unknown", reason:req.responseText};
    }
    throw result;
  }
},

params: function(options) {
  options = options || {};
  var returnArray = [];
  for(var key in options) {
    var value = options[key];
    returnArray.push(key + "=" + value);
  }
  return returnArray.join("&");
}

});

});
