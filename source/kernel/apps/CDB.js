module('apps.CDB').requires('apps.CouchDB', 'apps.Base64').toRun(function() {

Object.subclass("CDB.Logger", {
	
	// prints out a lot of debugging messages
	enableDebugging: true,

	debug: function(message) {
		if (this.enableDebugging) this.log('DEBUG', message);
	},

	log: function(severity, message) {
		console.log('[' + this.constructor.type + '] [' + severity + '] ' + message);
	}
	
});
Object.subclass("CDB.Repository", CDB.Logger.prototype, {

	/**************************************************
	 Public Properties
	 **************************************************/

	// the name of the CouchDB database
	databaseName: 'code_db',
	

	/**************************************************
	 Private Properties
	 **************************************************/

	// refers to the currently active change set if there is one
	currentChangeSet: null,

	// change set revision history
	revisionHistory: null,

	// CouchDB connection
	db: null,

	// username to use for commit messages
	username: null,

	// cache of code objects
	cache: [],

	// URL to database design
	designDocument: '_design/raw_data',

	// path to dumped CouchDB design document
	dumpDesignPath: '/repository/webwerkstatt/apps/couchdb.dump',

	// a list of constants for document URLs
	constants: {
		ChangeSetHistory: 'ChangeSetHistory',
		RevisionHistoryPrefix: 'RevisionHistory',
		RevisionPrefix: 'Revision',
		CodeObjectDelimiter: '::',
		AttachmentDelimiter: '/'
	},


	/**************************************************
	 Public Functions
	 **************************************************/

	initialize: function($super, dbName) {
		
		this.debug('creating new repository');
		if (dbName) this.databaseName = dbName;

		this.db = new CouchDB(this.databaseName);
		this.currentChangeSet = null;
		this.revisionHistory = null;
		this.username = null;
		this.cache = [];	
	},
	
	getCodeObject: function() {

		var klass = null;
		var startIndex = 0;
		var args = $A(arguments);
		var includeDrafts = false;

		if (args.length == 0) {
			throw new CDB.IllegalArgumentException('at least one argument is expected');
		}

		if (args[0] == undefined || args[0] == null) {
			throw new CDB.IllegalArgumentException('first argument must not be undefined or null');
		}

		if (args[0].isSubclassOf && args[0].isSubclassOf instanceof Function && args[0].isSubclassOf(CDB.CodeObject)) {
			klass = args[0]; startIndex++;
		}

		if (startIndex >= args.length || args[startIndex] == undefined) {
			throw new CDB.IllegalArgumentException('no code object name provided');
		}

		if (args[args.length - 1] != undefined && typeof(args[args.length - 1]) === 'boolean') {

			includeDrafts = args[args.length - 1];
			args.splice(args.length - 1, 1);
		}

		for (var i = startIndex; i < args.length; i++) {

			if (args[i] == undefined) throw new CDB.IllegalArgumentException('undefined is not allowed as an argument');
			Array.prototype.splice.apply(args, [i, 1].concat(args[i].split(this.constants.CodeObjectDelimiter)));
		}

		// concatenate qualified code object name
		var objQName = args.slice(startIndex).join(this.constants.CodeObjectDelimiter);

		// cache lookup
		if (this.cache[objQName]) {
			
			this.debug('Returning code object "' + objQName + '" from cache');
			return this.cache[objQName];
		}

		if (this.cache[objQName] === null) {
			throw new CDB.ObjectNotFoundException('Unable to find the specified code object: "' + objQName + '"');
		}

		// read code object revision history first
		this.debug('Reading code object revision history for: ' + objQName);

		// concatenate qualified name for revision history
		var historyQName = this.constants.RevisionHistoryPrefix + this.constants.CodeObjectDelimiter + objQName;

		// cache lookup
		if (this.cache[historyQName]) {

			this.debug('Using code object revision history for "' + objQName + '" from cache');
			var revHistory = this.cache[historyQName];
		
		} else {

			// read the document from the database
			var docObj = this.db.open(historyQName);

			if (docObj == null) {
				throw new CDB.ObjectNotFoundException('Unable to find the specified code object: "' + objQName + '"');
			}
		
			// create revision history object
			var revHistory = new CDB.RevisionHistory();
			revHistory.initializeFromDocument(docObj, CDB.CodeObject.Revision);

			// put history into the cache
			this.cache[historyQName] = revHistory;
		}

		if (includeDrafts == false && (revHistory.currentRevision == null || revHistory.revisions[revHistory.currentRevision.number - 1].status == 'deleted')) {
			
			this.debug('There was no active revision for code object "' + objQName + '"');
			throw new CDB.ObjectNotFoundException('Unable to find the specified code object: "' + objQName + '"');
		}

		var revision = includeDrafts ? revHistory.getLastRevision() : revHistory.currentRevision;
		
		// retrieve document
		var revQName = this.constants.RevisionPrefix + this.constants.CodeObjectDelimiter;
		revQName += revision.number + this.constants.CodeObjectDelimiter + objQName;

		this.debug('Retrieving: ' + revQName);
		var dbObj = this.db.open(revQName);
		
		if (dbObj == null) {
			throw new CDB.ObjectNotFoundException('Unable to find the specified code object: "' + objQName + '"');
		}

		var classToInstantiate = null;

		switch (dbObj.type) {
			case 'module': classToInstantiate = CDB.Module; break;
			case 'class': classToInstantiate = CDB.Klass; break;
			case 'method': classToInstantiate = CDB.Method; break;
			case 'layer': classToInstantiate = CDB.Layer; break;
		}

		if (klass != null && klass != classToInstantiate) {
			throw new CDB.TypeMismatchException('Expected ' + klass.type + ' but got ' + classToInstantiate.type);
		}

		if (classToInstantiate == null) {
			throw new CDB.Exception('No class to instantiate, please fix Repository.getCodeObject');
		}

		this.debug('Found code object "' + objQName + '" (' + classToInstantiate.type + ') revision ' + revision.number);

		var obj = new classToInstantiate(dbObj.name);
		
		// put object into the cache
		this.cache[objQName] = obj;

		obj.repository = this;
		obj.initializeFromDocument(dbObj, includeDrafts);
		obj.revisionHistory = revHistory;
		obj.revision = revision;

		return obj;
	},

	listCodeObjects: function() {

		var klass = null;
		var startIndex = 0;
		var args = $A(arguments);
		var includeDrafts = false;

		if (args.length == 0) {
			throw new CDB.IllegalArgumentException('at least one argument is expected');
		}

		if (args[0] == undefined || args[0] == null) {
			throw new CDB.IllegalArgumentException('first argument must not be undefined or null');
		}

		if (!args[0].isSubclassOf || !args[0].isSubclassOf instanceof Function || !args[0].isSubclassOf(CDB.CodeObject)) {
			throw new CDB.IllegalArgumentException('first argument should be a subclass of CDB.CodeObject');
		}

		if (args[args.length - 1] != undefined && typeof(args[args.length - 1]) === 'boolean') {

			includeDrafts = args[args.length - 1];
			args.splice(args.length - 1, 1);
		}

		for (var i = 1; i < args.length; i++) {
			Array.prototype.splice.apply(args, [i, 1].concat(args[i].split(this.constants.CodeObjectDelimiter)));
		}

		if (args.length == 1) {

			var docName = 'raw_data/by-type/modules';
			var docOptions = {};

		} else if (args.length == 2) {

			var docName = 'raw_data/by-type/classes';
			var docOptions = { module: args[1] }

		} else if (args.length == 3) {

			var docName = 'raw_data/by-type/methods';
			var docOptions = { module: args[1], klass: args[2] }
		}

		if (includeDrafts) docName += '-with-drafts';

		// retrieve document
		var dbObj = this.db.list(docName, docOptions);
		
		if (dbObj == null || dbObj.error) {
			throw new CDB.ObjectNotFoundException('Unable to find code object list');
		}

		var objects = [];

		for (var i = 0; i < dbObj.length; i++) {
			objects.push(dbObj[i].key);		
		}

		return objects;
	},
	
	getRevisionHistory: function() {
		
		if (this.revisionHistory == null) {
			this.readRevisionHistory();
		}

		return this.revisionHistory;
	},
	
	getLatestRevision: function() {
		
	},
	
	createChangeSet: function() {

		if (this.currentChangeSet != null) {
			throw new CDB.Exception("There is already an active change set");
		}

		if (this.revisionHistory == null) {
			this.readRevisionHistory();
		}

		this.currentChangeSet = new CDB.ChangeSet(this);
		this.debug("new change set created");

		return this.currentChangeSet;
	},
	
	
	/**************************************************
	 Private Functions
	 **************************************************/

	create: function() {
		this.db.createDb();
	},

	drop: function() {
		this.db.deleteDb();
	},

	dumpDesign: function() {

		var url = this.db.uri + this.designDocument;
		
		var res = new WebResource(URL.source.withPath(url)); res.get();
		var obj = JSON.unserialize(res.content);

		for (var name in obj._attachments) {

			res = new WebResource(URL.source.withPath(url + '/' + name)); res.get();

			delete obj._attachments[name].stub;
			delete obj._attachments[name].length;
			delete obj._attachments[name].revpos;
			obj._attachments[name].data = Base64.encode(res.content);
		}

		delete obj._rev;

		res = new WebResource(URL.source.withPath(this.dumpDesignPath));
		res.put(JSON.serialize(obj));
	},

	initializeDesign: function() {

		var res = new WebResource(URL.source.withPath(this.dumpDesignPath));
		res.get(); var content = res.content;

		res = new WebResource(URL.source.withPath(this.db.uri + this.designDocument));
		res.put(content);
	},

	isInitialized: function() {

		var res = new WebResource(URL.source.withPath(this.db.uri + this.designDocument));
		res.get(); return res.isExisting;
	},

	readRevisionHistory: function() {

		this.debug('reading change set revision history');

		// read the document from the database
		var docObj = this.db.open(this.constants.ChangeSetHistory);

		if (docObj == null) {
			
			this.debug('change set revision history not found - initializing');
			
			docObj = {
				currentRevision: 0,
				revisionHistory: []
			}
		
		}
		
		// create revision history object
		this.revisionHistory = new CDB.RevisionHistory();
		this.revisionHistory.initializeFromDocument(docObj, CDB.ChangeSet.Revision);
	},

	readUsername: function() {

		var res = new WebResource(URL.source.withPath('/cgi/user.sh'));
		res.get(); this.username = JSON.unserialize(res.content);
	}

});
Object.subclass("CDB.Exception", {

	/**************************************************
	 Public Properties
	 **************************************************/

	// the exception message
	message: null,

	// the stack trace (as string)
	stacktrace: null,


	/**************************************************
	 Public Functions
	 **************************************************/

	initialize: function(message) {
		this.message = message;
		this.stacktrace = printStack();
		console.log(this.message);
		console.log(this.stacktrace);
	}
	
});
CDB.Exception.subclass("CDB.DatabaseException", {
	
});
CDB.Exception.subclass("CDB.IllegalArgumentException", {
	
});
CDB.Exception.subclass("CDB.ObjectNotFoundException", {
	
});
CDB.Exception.subclass("CDB.TypeMismatchException", {
	
});
CDB.Exception.subclass("CDB.ConsistencyException", {
	
});

Object.subclass("CDB.Revision", {

	/**************************************************
	 Public Properties
	 **************************************************/

	// read only revision number
	number: null,

	/**************************************************
	 Public Functions
	 **************************************************/

	initialize: function() {
		this.number = null;
	},

	initializeFromDocument: function(docObj) {
		this.number = docObj.revision;
	}
	
});

Object.subclass("CDB.RevisionHistory", CDB.Logger.prototype, {

	/**************************************************
	 Public Properties
	 **************************************************/

	// read only: current revision
	currentRevision: null,

	// read only: all revisions
	revisions: [],


	/**************************************************
	 Private Properties
	 **************************************************/

	// CouchDB document
	documentObject: null,


	/**************************************************
	 Public Functions
	 **************************************************/

	initialize: function() {

		this.revisions = [];
		this.currentRevision = null;
	
		this.documentObject = {};
		this.documentObject.currentRevision = 0;
		this.documentObject.revisionHistory = [];
	},

	initializeFromDocument: function(dbObj, revClass) {

		if (!dbObj.revisionHistory || ! dbObj.revisionHistory instanceof Array) {
			throw new CDB.DatabaseException('invalid revision history');
		}

		if (!revClass.isSubclassOf || !revClass.isSubclassOf instanceof Function || !revClass.isSubclassOf(CDB.Revision)) {
			throw new CDB.IllegalArgumentException('provided class does not inherit from CDB.Revision');
		} 
		
		this.documentObject = dbObj;

		for (var idx = 0; idx < dbObj.revisionHistory.length; idx++) {
			var rev = new revClass();
			rev.initializeFromDocument(dbObj.revisionHistory[idx]);
			this.revisions.push(rev);			
		}

		if (dbObj.currentRevision > 0 && !this.revisions[dbObj.currentRevision - 1]) {
			throw new CDB.DatabaseException('inconsistent revision history');
		} else if (dbObj.currentRevision > 0) {
			this.currentRevision = this.revisions[dbObj.currentRevision - 1];
		}
	},

	addRevision: function(rev) {

		if (this.revisions.length > 0 && this.revisions[this.revisions.length - 1].number + 1 != rev.number) {
			throw new CDB.IllegalArgumentException('Revision numbers have to be increasing and steady');
		}

		this.revisions.push(rev);
		this.updateDocumentObject('add', rev);
	},

	setCurrentRevision: function(rev) {
	
		if (rev.number > this.revisions.length) {
			throw new CDB.IllegalArgumentException('Revision does not belong to this revision history');
		}

		if (rev instanceof CDB.CodeObject.Revision && rev.status != 'active') {
			throw new CDB.IllegalArgumentException('Active revision expected');
		}

		this.currentRevision = rev;
		this.updateDocumentObject('current', rev);
	},

	getRevision: function(revNo) {

		if (!this.revisions[revNo - 1]) {
			throw new CDB.IllegalArgumentException('Revision number ' + revNo + ' is out of range.');
		}

		return this.revisions[revNo - 1];
	},

	getLastRevision: function() {
		return this.revisions[this.revisions.length - 1];
	},

	updateDocumentObject: function(action, rev) {

		if (action == 'add') {

			this.debug('Adding new revision: ' + rev.number);
			this.documentObject.revisionHistory.push(rev.getWritableDocumentObject());
		
		} else if (action == 'update') {

			this.debug('Updating existing revision: ' + rev.number);
			this.documentObject.revisionHistory[rev.number - 1] = rev.getWritableDocumentObject();

		} else if (action == 'current') {

			this.documentObject.currentRevision = rev.number;
		}
	}
	
});

Object.subclass("CDB.CodeObject", CDB.Logger.prototype, 

'public properties ', {

	// code object name
	name: null,

	// some user provided documentation of the code object
	documentation: null,

	// parent code object
	parent: null,

	// code object revision
	revision: null,

}, 'private properties', {
	
	// the repository this code object belongs to
	repository: null,

	// has this code object ever been persisted?
	persistent: false,

	// action to take with this code object (only relevant if part of a change set)
	action: 0, // 0: update, 1: add, 2: delete, 

	// the revision history of this code object
	revisionHistory: null,

	// CouchDB document object (set once first persisted)
	documentObject: null,

	// child code objects
	childObjects: [],

	// names of all child code objects
	childNames: [],

	// true if lazy loading should include drafts
	includeDraftsOnLazyLoad: false,

}, 'public functions', {

	initialize: function(name) {

		this.name = name;
		this.documentation = null;
		
		this.revisionHistory = null;
		this.revision = null;

		this.action = 1; // add
		this.persistent = false;
		
		this.repository = null;
		this.documentObject = null;

		this.parent = null;
		this.childObjects = [];
		this.childNames = [];
	},

	initializeFromDocument: function(docObj, includeDrafts) {

		this.action = 0; // update
		this.persistent = true;
		
		this.name = docObj.name;
		this.documentation = docObj.documentation;
		
		if (docObj.parent) {
			this.setParent(this.repository.getCodeObject(docObj.parent, includeDrafts));
		}

		this.documentObject = docObj;
		this.includeDraftsOnLazyLoad = includeDrafts;

		this.childNames = docObj.children;
	},

	setParent: function(p) {
		this.parent = p;
	},

	equals: function(other) {
		
		return this.constructor.type == other.constructor.type && this.name == other.name
			&& ((this.parent == null && other.parent == null)
				|| (this.parent != null && other.parent != null && this.parent.equals(other.parent))
			);
	},

	addChildCodeObject: function(obj, cls) {

		if (cls && cls.isSubclassOf && cls.isSubclassOf instanceof Function && cls.isSubclassOf(CDB.CodeObject) && ! obj instanceof cls) {
			throw new CDB.IllegalArgumentException('Expected an instance of ' + cls.type + ' but got ' + obj.constructor.type);
		} else if (!obj || ! obj instanceof CDB.CodeObject) {
			throw new CDB.IllegalArgumentException('Code Object expected');
		}

		for (var idx = 0; idx < this.childNames.length; idx++) {
			if (this.childNames[idx] == obj.name) {
				throw new CDB.IllegalArgumentException('There is already a child with the same name in this code object');
			}
		}

		this.childObjects.push(obj);
		this.childNames.push(obj.name);

		obj.setParent(this);
	},

	getChildCodeObject: function(name, cls) {

		// first check whether it has already been loaded
		for (var idx = 0; idx < this.childObjects.length; idx++) {
			
			if (this.childObjects[idx].name == name) {
				
				if (!cls || this.childObjects[idx] instanceof cls) return this.childObjects[idx];
				else throw new CDB.TypeMismatchException('Expected ' + cls.type + ' but got ' + this.childObjects[idx].constructor.type);
			}
		}

		// object is not yet loaded - check whether it exists
		for (var idx = 0; idx < this.childNames.length; idx++) {
			
			if (this.childNames[idx] == name) {

				var objName = this.getUnprefixedDocumentName();
				var obj = this.repository.getCodeObject(objName, name, this.includeDraftsOnLazyLoad);
				
				this.childObjects.push(obj); 
	
				if (cls && ! (obj instanceof cls)) {
					throw new CDB.TypeMismatchException('Expected ' + cls.type + ' but got ' + obj.constructor.type);
				}

				return obj;
			}
		}

		throw new CDB.ObjectNotFoundException('Unable to find the specified code object: ' + name);
	},

	getChildCodeObjects: function(type) {

		if (!type.isSubclassOf || !(type.isSubclassOf instanceof Function) || !type.isSubclassOf(CDB.CodeObject)) {
			throw new CDB.IllegalArgumentException('Subclass of CDB.CodeObject expected');
		}

		var requestedChildren = [];

		for (var idx = 0; idx < this.childObjects.length; idx++) {
			if (this.childObjects[idx] instanceof type) requestedChildren.push(this.childObjects[idx]);
		}

		if (!this.repository) return requestedChildren; // we can be sure that this is the complete list

		var myName = this.getUnprefixedDocumentName();
		var listOfNames = this.repository.listCodeObjects(type, myName, this.includeDraftsOnLazyLoad);

		var namesToFetch = [];

		// this list might contain names that are not part of this.childNames -> filter them out
		for (var idx = 0; idx < listOfNames.length; idx++) {
			for (var jdx = 0; jdx < this.childNames.length; jdx++) {
				if (listOfNames[idx] == this.childNames[jdx]) namesToFetch.push(listOfNames[idx]);
			}
		}

		// children might already contain objects named in namesToFetch
		outer: for (var idx = 0; idx < namesToFetch.length; idx++) {
			
			for (var jdx = 0; jdx < requestedChildren.length; jdx++) {
				if (requestedChildren[jdx].name == namesToFetch[idx]) break outer;
			}
			
			// we actually need to fetch the object
			var obj = this.repository.getCodeObject(type, myName, namesToFetch[idx], this.includeDraftsOnLazyLoad);
			this.childObjects.push(obj); requestedChildren.push(obj);
		}

		return requestedChildren;
	},

	removeChildCodeObject: function(obj, cls) {

		if (cls && cls.isSubclassOf && cls.isSubclassOf instanceof Function && cls.isSubclassOf(CDB.CodeObject) && ! obj instanceof cls) {
			throw new CDB.IllegalArgumentException('Expected an instance of ' + cls.type + ' but got ' + obj.constructor.type);
		} else if (!obj || ! obj instanceof CDB.CodeObject) {
			throw new CDB.IllegalArgumentException('Code Object expected');
		}

		// first check whether it really is a child
		for (var idx = 0; idx < this.childObjects.length; idx++) {

			if (this.childObjects[idx] == obj) {

				// remove from list of child objects				
				this.childObjects.splice(idx, 1);

				for (var jdx = 0; jdx < this.childNames.length; jdx++) {

					if (this.childNames[jdx] == obj.name) {

						this.childNames.splice(jdx, 1);
						// do not remove parent here

						return;
					}
				}
			}
		}

		throw new CDB.ObjectNotFoundException('Unable to find the specified code object: ' + obj.name);		
	},

	getRevision: function(revNo) {
		return this.revisionHistory.getRevision(revNo);
	},
	
	getLatestRevision: function() {
		return this.revisionHistory.currentRevision;
	},
	
	getRevisionHistory: function() {
		return this.revisionHistory;
	},

	save: function() {

		if (!this.repository) {
			throw new CDB.Exception('Code Object is not assigned to a repository');
		}

		if (!this.repository.currentChangeSet) {
			throw new CDB.Exception('There is no active change set');
		}

		var objQName = this.getUnprefixedDocumentName();
		var historyQName = this.repository.constants.RevisionHistoryPrefix 
			+ this.repository.constants.CodeObjectDelimiter + objQName;

		this.debug('Saving: ' + objQName);
		this.createNewRevision(true);
		this.debug('Successfully saved: ' + objQName);

		if (!this.repository.cache[objQName]) {

			this.repository.cache[objQName] = this;
			this.repository.cache[historyQName] = this.revisionHistory;
		}
	},

	isDraft: function() {
		return this.revision && this.revision.status == 'draft';
	},

	deleteFromRepository: function(recursive) {

		if (!this.repository) {
			throw new CDB.IllegalArgumentException('Code object has not been attached to a repository yet');
		}
		
		var myName = this.getUnprefixedDocumentName();

		this.action = 2;
		this.debug('Code object "' + myName + '" (' + this.constructor.type + ') is now scheduled for deletion');

		if (recursive) {

			// load all remaining objects
			outer: for (var idx = 0; idx < this.childNames.length; idx++) {
			
				for (var jdx = 0; jdx < this.childObjects.length; jdx++) {
					if (this.childObjects[jdx].name == this.childNames[idx]) continue outer;
				}

				this.childObjects.push(this.repository.getCodeObject(myName, this.childNames[idx], this.includeDraftsOnLazyLoad));
			}

			// delete all objects
			for (var idx = 0; idx < this.childObjects.length; idx++) {
				this.childObjects[idx].deleteFromRepository(recursive);
			}
		}

		if (this.parent) {
			this.parent.removeChildCodeObject(this);
		}
	},
	

}, 'private functions', {

	addToRepository: function(rep) {
		
		this.repository = rep;

		for (var idx = 0; idx < this.childObjects.length; idx++) {
			this.childObjects[idx].addToRepository(rep);
		}
	},

	checkConsistency: function() {

		this.debug('Running consistency check for "' + this.name + '" (' + this.constructor.type + ')');

		if (this.persistent && this.action == 1) {
			throw new CDB.ConsistencyException('Code Object "' + this.name 
				+ '" (' + this.constructor.type + ') is already persistent and cannot be added again');
		}

		if (!this.persistent && this.action != 1 && (null == this.revisionHistory 
			|| this.revisionHistory.currentRevision == 0)) {
			throw new CDB.ConsistencyException('Code Object "' + this.name 
					+ '" (' + this.constructor.type + ') is not persistent and can only be added');
		}

		if (!this.isDraft()) {

			if (this.parent && this.action == 1 /* add */ && !this.repository.currentChangeSet.includes(this.parent)) {
				throw new CDB.ConsistencyException('Parent code object "' + this.parent.name + '" is not part of the change set');
			}

			if (this.parent && this.action == 2 /* delete */ && !this.repository.currentChangeSet.includes(this.parent)) {
				throw new CDB.ConsistencyException('Parent code object "' + this.parent.name + '" is not part of the change set');
			}

			for (var idx = 0; idx < this.childObjects.length; idx++) {
	
				if (this.childObjects[idx].action > 0 /* add or delete */ && !this.repository.currentChangeSet.includes(this.childObjects[idx])) {
					throw new CDB.ConsistencyException('Child object "' + this.childObjects[idx].name + '" is not part of the change set');
				}
			}
		}


		var historyQName = this.repository.constants.RevisionHistoryPrefix;
		historyQName += this.repository.constants.CodeObjectDelimiter;
		historyQName += this.getUnprefixedDocumentName();
		
		var docObj = this.repository.db.open(historyQName);

		if (this.persistent && docObj == null) {
			throw new CDB.ConsistencyException('Code Object "' + this.name 
					+ '" (' + this.constructor.type + ') claims to be persistent but it is not present in the database');
		}

		if (!this.persistent && docObj != null && docObj.currentRevision > 0 
			&&  docObj.revisionHistory[docObj.currentRevision - 1].status == 'active') {
			throw new CDB.ConsistencyException('You are trying to add code object "' + this.name 
				+ '" (' + this.constructor.type + ') but there is already an active revision in the database');
		}

		if (!this.persistent && docObj != null) {

			// code object is already persistent
			this.persistent = true;

			// initialize from existing revision history
			this.revisionHistory = new CDB.RevisionHistory();
			this.revisionHistory.initializeFromDocument(docObj, CDB.CodeObject.Revision);

			// put history into the cache
			this.repository.cache[docObj._id] = this.revisionHistory;
		}
	},
	getUnprefixedDocumentName: function() {

		// return plain name if there is no parent
		if (this.parent == null) return this.name;

		// concatenate names
		return this.parent.getUnprefixedDocumentName() + this.repository.constants.CodeObjectDelimiter + this.name;
	},


	getWritableDocumentObject: function() {

		obj = {
			'type': this.typeName,
			'name': this.name,
			'documentation': this.documentation
		};

		if (this.parent) {
			obj.parent = this.parent.getUnprefixedDocumentName();
		}

		obj.children = [];

		for (var idx = 0; idx < this.childNames.length; idx++) {
			obj.children.push(this.childNames[idx]);
		}

		return obj;
	},

	createNewRevision: function(draft) {

		// get document object
		var docObj = this.getWritableDocumentObject();

		// create a new code object revision
		this.revision = new CDB.CodeObject.Revision();

		// set document status
		if (draft) this.revision.status = 'draft';
		else if (this.action == 2) this.revision.status = 'deleted';
		else this.revision.status = 'active';

		// check code object consistency
		this.checkConsistency();

		if (!this.persistent && null == this.revisionHistory) {

			// create an empty revision history
			this.revisionHistory = new CDB.RevisionHistory();
			
			// initialize first revision
			this.revision.number = 1;
			this.revision.action = 'add';

			// from now on this code object is persistent
			this.persistent = true;

		} else {

			// initialize new revision
			this.revision.number = this.revisionHistory.getLastRevision().number + 1;

			if (this.action == 2) this.revision.action = 'delete';
			else if (this.action == 1) this.revision.action = 'add';
			else this.revision.action = 'update';
		}

		this.action = 0; // update

		// insert change set revision number
		this.revision.changeset = this.repository.currentChangeSet.getRevisionNumber();

		// add new revision to history
		this.revisionHistory.addRevision(this.revision);
		if (!draft) this.revisionHistory.setCurrentRevision(this.revision);

		// save revision history
		this.saveRevisionHistory();

		// save revision as separate document
		docObj._id = this.repository.constants.RevisionPrefix + this.repository.constants.CodeObjectDelimiter;
		docObj._id += this.revision.number + this.repository.constants.CodeObjectDelimiter 
			+ this.getUnprefixedDocumentName();

		this.debug('Persisting ' + JSON.serialize(docObj._id));
		var dbResponse = this.repository.db.save(docObj);

		if (dbResponse.error) {
			throw new CDB.DatabaseException('CouchDB said: ' + dbResponse.reason);
		}
	},

	saveRevisionHistory: function(attachment) {

		// set revision history document name if neccessary
		if (this.revisionHistory.documentObject._id == null) {

			this.revisionHistory.documentObject._id = this.repository.constants.RevisionHistoryPrefix
				+ this.repository.constants.CodeObjectDelimiter + this.getUnprefixedDocumentName();
		}

		// add attachment is available
		if (attachment) {

			if (!this.revisionHistory.documentObject._attachments) {
				this.revisionHistory.documentObject._attachments = {};
			}

			this.revisionHistory.documentObject._attachments[attachment.name] = attachment.payload;
		}

		this.debug('Persisting ' + JSON.serialize(this.revisionHistory.documentObject._id));
	
		if (this.revisionHistory.documentObject._rev) {
			this.debug('Last known CouchDB revision of Code Object revision history: ' 
				+ this.revisionHistory.documentObject._rev);
		}

		var dbResponse = this.repository.db.save(this.revisionHistory.documentObject);

		if (dbResponse.error) {
			throw new CDB.DatabaseException('CouchDB said: ' + dbResponse.reason);
		}

		this.revisionHistory.documentObject._rev = dbResponse.rev;
	},

	makeActiveRevision: function() {

		if (!this.revisionHistory) {
			throw new CDB.ConsistencyException('Code object ' + JSON.serialize(this.getUnprefixedDocumentName())
				 + ' was never saved');
		}

		// no need to change anything if there was never a draft status
		if (this.revisionHistory.currentRevision != null 
			&& this.revisionHistory.getLastRevision().status == 'active') return;

		var rev = this.revisionHistory.getLastRevision();
		
		if (rev.action === 'delete') rev.status = 'deleted';
		else rev.status = 'active';

		this.revisionHistory.currentRevision = rev;
		
		this.revisionHistory.updateDocumentObject('update', rev);
		this.revisionHistory.updateDocumentObject('current', rev);

		// save the revision history
		this.saveRevisionHistory();

		if (rev.status === 'deleted') {

			var objQName = this.getUnprefixedDocumentName();
			this.repository.cache[objQName] = null;
		}
	}

});

CDB.Revision.subclass("CDB.CodeObject.Revision", {
	
	/**************************************************
	 Public Functions
	 **************************************************/

	initialize: function($super) {

		// call parent initializer
		$super();
	},

	initializeFromDocument: function($super, docObj) {
	
		$super(docObj);

		this.changeset = docObj.changeset;
		this.action = docObj.action;
		this.status = docObj.status;
	},

	diff: function(other) {
		
	},
	

	/**************************************************
	 Private Functions
	 **************************************************/

	getWritableDocumentObject: function() {

		return {
			'revision': this.number,
			'changeset': this.changeset,
			'action': this.action,
			'status': this.status
		}
	}

});

CDB.CodeObject.subclass("CDB.Module", {

	/**************************************************
	 Public Properties
	 **************************************************/

	// constants: code object type name
	typeName: 'module',

	// module requirements
	requirements: [],


	/**************************************************
	 Public Functions
	 **************************************************/

	initialize: function($super, name) {

		$super(name);

		this.requirements = [];
	},

	initializeFromDocument: function($super, docObj, includeDrafts) {
		
		$super(docObj, includeDrafts);
		
		this.requirements = docObj.requirements;
	},

	addClass: function(cls) {
		this.addChildCodeObject(cls, CDB.Klass);
	},

	addLayer: function(layer) {
		this.addChildCodeObject(layer, CDB.Layer);
	},

	getClass: function(name) {
		return this.getChildCodeObject(name, CDB.Klass);
	},

	getClasses: function() {
		return this.getChildCodeObjects(CDB.Klass);
	},
	
	removeClass: function(cls) {
		this.removeChildCodeObject(cls, CDB.Klass);
	},
	

	/**************************************************
	 Private Functions
	 **************************************************/

	getWritableDocumentObject: function($super) {

		var docObj = $super();
		docObj.requirements = this.requirements;

		return docObj;
	}

});

CDB.CodeObject.subclass("CDB.Klass", {

	/**************************************************
	 Public Properties
	 **************************************************/

	// constants: code object type name
	typeName: 'class',

	// read only: module this class belongs to
	module: null,

	// the super class of this class
	superclass: null,


	/**************************************************
	 Public Functions
	 **************************************************/
	
	initialize: function($super, name) {
		
		$super(name);
		
		this.module = null;
		this.superclass = null;
	},

	initializeFromDocument: function($super, docObj, includeDrafts) {
		
		$super(docObj, includeDrafts);

		this.superclass = docObj.superclass;
	},

	setParent: function($super, p) {
		$super(p); this.module = p;
	},

	setModule: function(m) {
		this.setParent(m);
	},

	addMethod: function(meth) {
		this.addChildCodeObject(meth, CDB.Method);
	},

	getMethod: function(name) {
		return this.getChildCodeObject(name, CDB.Method);
	},

	getMethods: function() {
		return this.getChildCodeObjects(CDB.Method);
	},

	removeMethod: function(meth) {
		this.removeChildCodeObject(meth, CDB.Method);
	},


	

	/**************************************************
	 Private Functions
	 **************************************************/

	getWritableDocumentObject: function($super) {

		var docObj = $super();
		docObj.superclass = this.superclass;

		return docObj;
	}

});

CDB.CodeObject.subclass("CDB.Method", {

	/**************************************************
	 Public Properties
	 **************************************************/

	// constants: code object type name
	typeName: 'method',

	// the actual sorce code of the method
	source: null,

	// read only: the class this method belongs to
	klass: null,


	/**************************************************
	 Public Functions
	 **************************************************/

	initialize: function($super, name) {
		
		$super(name);
		
		this.klass = null;
		this.source = null;
	},

	initializeFromDocument: function($super, docObj, includeDrafts) {

		$super(docObj, includeDrafts);

		this.source = docObj.source;
	},

	setParent: function($super, p) {
		$super(p); this.klass = p;
	},

	setClass: function(c) {
		this.setParent(c);
	},




	/**************************************************
	 Private Functions
	 **************************************************/

	checkConsistency: function($super) {
	
		// common consistency checks
		$super();

		if (this.klass == null) {
			throw new CDB.ConsistencyException('Method "' + this.name + '" does not belong to a class');
		}
	},



	getWritableDocumentObject: function($super) {

		var docObj = $super();
		docObj.source = this.source;

		return docObj;
	}
	
});
CDB.CodeObject.subclass("CDB.Layer", {

	/**************************************************
	 Public Properties
	 **************************************************/

	// constants: code object type name
	typeName: 'layer',

	// read only: module this class belongs to
	module: null,


	/**************************************************
	 Public Functions
	 **************************************************/
	
	initialize: function($super, name) {
		
		$super(name);
		
		this.module = null;
	},

	initializeFromDocument: function($super, docObj, includeDrafts) {
		
		$super(docObj, includeDrafts);
	},

	setParent: function($super, p) {
		$super(p); this.module = p;
	},

	setModule: function(m) {
		this.setParent(m);
	},

	deleteFromRepository: function($super, recursive) {
		
		$super(recursive);

		// remove from module
		this.module.removeLayer(this);
	},
	

	/**************************************************
	 Private Functions
	 **************************************************/

	getWritableDocumentObject: function($super) {

		var docObj = $super();

		return docObj;
	}

});

Object.subclass("CDB.ChangeSet", CDB.Logger.prototype, {

	/**************************************************
	 Private Properties
	 **************************************************/
	
	// list of code objects that were added/changed/deleted
	objects: [],

	// reference to the repository this change set belongs to
	repository: null,

	// commit message
	message: 'test commit',


	/**************************************************
	 Public Functions
	 **************************************************/
	
	initialize: function(rep) {
		this.repository = rep;
		this.objects = [];
	},

	add: function(obj) {

		this.checkConnected();

		if (!obj || ! obj instanceof CDB.CodeObject) {
			throw new CDB.IllegalArgumentException('Code Object expected');
		}

		if (!obj.name || ! obj.name instanceof String) {
			throw new CDB.IllegalArgumentException('Invalid or empty code object name');
		}

		if (this.objects.length > 0) {
			this.debug('there are already ' + this.objects.length + ' objects in the change set');
		}

		for (var idx = 0; idx < this.objects.length; idx++) {
			
			if (this.objects[idx] == obj) {
				throw new CDB.IllegalArgumentException('Code Object is already part of this change set');
			}

			if (this.objects[idx].equals(obj)) {
				throw new CDB.IllegalArgumentException('There is already a code object of the same type with the same name in this change set');
			}
		}
		
		this.debug('adding code object "' + obj.name + '" of type "' + obj.constructor.type + '"');
		
		this.objects.push(obj);
		obj.addToRepository(this.repository);
	},

	includes: function(obj) {

		for (var idx = 0; idx < this.objects.length; idx++) {
			if (this.objects[idx] == obj) return true;
		}

		return false;
	},
	
	commit: function() {

		if (this.repository.username == null) {
			this.repository.readUsername();
		}

		if (this.objects.length == 0) {
			throw new CDB.Exception('This change set is empty');
		}

		this.checkConnected();
		this.checkConsistency();

		this.createCodeObjectRevisions();
		this.createChangeSetRevision();

		this.debug('commit complete');

		this.repository.currentChangeSet = null;
		this.disconnected = true;
	},
	
	discard: function() {

		this.disconnected = true;		
	},
	

	/**************************************************
	 Private Functions
	 **************************************************/

	checkConsistency: function() {

		for (var idx = 0; idx < this.objects.length; idx++) {
			this.objects[idx].checkConsistency();
		}

		// make sure that we don't run into versioning conflicts (although sure is relative in this context)
		this.checkForUpdates();
		this.debug('Consistency checks for change set commit passed');
	},

	checkConnected: function() {

		if (this.disconnected) {
			throw new CDB.Exception('This change set has already been committed or discarded');
		}
	},

	checkForUpdates: function() {

		this.debug('Checking whether change set revision history is still up-to-date');

		// read the document from the database
		var docObj = this.repository.db.open(this.repository.constants.ChangeSetHistory);

		if (docObj == null && this.repository.revisionHistory.currentRevision != null) {
			this.debug('currentRevision: ' + JSON.serialize(this.repository.revisionHistory.currentRevision));
			throw new CDB.DatabaseException('Serious database error: change set revision history is gone');
		} else if (docObj != null) {

			if (!docObj.currentRevision || this.repository.revisionHistory.currentRevision == null ||
				docObj.currentRevision != this.repository.revisionHistory.currentRevision.number) {
				
				this.debug('Got revision ' + docObj.currentRevision + ', we assumed revision ' + this.repository.revisionHistory.currentRevision.number);
				throw new CDB.ConsistencyException('Versioning conflict: database is more recent');
			}
		}

		this.debug('Change set revision history is still up-to-date');
	},

	getRevisionNumber: function() {
	
		if (this.repository.revisionHistory.currentRevision == null) return 1;
		return this.repository.revisionHistory.currentRevision.number + 1;
	},

	createCodeObjectRevisions: function() {

		this.debug('Changing last code object revisions from "draft" to "active"');

		for (var idx = 0; idx < this.objects.length; idx++) {
			this.objects[idx].makeActiveRevision();
		}

		this.debug('Finished updating code object revisions');
	},

	createChangeSetRevision: function() {

		this.debug('Creating change set revision');

		// create new revision object
		var rev = new CDB.ChangeSet.Revision();
		rev.number = this.getRevisionNumber();
		rev.date = new Date();

		// hard coded for now
		rev.author = this.repository.username;
		rev.message = this.message;
		rev.objects = this.objects;

		// add new revision
		this.repository.revisionHistory.addRevision(rev);
		this.repository.revisionHistory.setCurrentRevision(rev);

		// save change set revision history
		if (this.repository.revisionHistory.documentObject._id == null) {
			this.repository.revisionHistory.documentObject._id = this.repository.constants.ChangeSetHistory;
		}

		this.debug('Persisting ' + JSON.serialize(this.repository.revisionHistory.documentObject._id));
		var dbResponse = this.repository.db.save(this.repository.revisionHistory.documentObject);

		if (dbResponse.error) {
			throw new CDB.DatabaseException('CouchDB said: ' + dbResponse.reason);
		}

		this.repository.revisionHistory.documentObject._rev = dbResponse.rev;
		this.debug('Finished creating change set revision');
	}
	
});

CDB.Revision.subclass("CDB.ChangeSet.Revision", {

	/**************************************************
	 Public Functions
	 **************************************************/

	initialize: function($super) {

		// call parent initializer
		$super();
	},

	initializeFromDocument: function($super, docObj) {
	
		$super(docObj);

		this.message = docObj.message;
		this.author = docObj.author;
		this.date = docObj.date;

		// this.objects // is still TODO
	},


	/**************************************************
	 Private Functions
	 **************************************************/

	getWritableDocumentObject: function() {

		var docObj = {
			'revision': this.number,
			'author': this.author,
			'date': this.date,
			'message': this.message,
			'objects': []
		};

		for (var idx = 0; idx < this.objects.length; idx++) {

			var o = {
				'name': this.objects[idx].getUnprefixedDocumentName(),
				'revision': this.objects[idx].revisionHistory.currentRevision.number,
				'action': this.objects[idx].revisionHistory.currentRevision.action
			};

			docObj.objects.push(o);
		}

		return docObj;
	}
	
});

}) // end of module