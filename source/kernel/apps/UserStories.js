module('apps.UserStories').requires('lively.bindings', 'cop.Layers', 'lively.Connector').toRun(function() {

Object.extend(Global, {
	
	// FIXME this or something better should be implemented in lively.Connector!!!
	connectMorphs: function(c, newMorph, isStart) {
		if (newMorph)
			newMorph.setWithLayers([NodeMorphLayer]);
		if (isStart) {
				if (c.startMorph) {
					c.startMorph.deconnectLineMorph(c);
				}
			c.startMorph = newMorph;
		} else {
			if (c.endMorph) {
				c.endMorph.deconnectLineMorph(c);
			}
			c.endMorph = newMorph;
		}

		if (newMorph)
			newMorph.connectLineMorph(c);
		c.updateConnection();
	},
	
});

createLayer('UserStoryLayer');
layerClass(UserStoryLayer, WorldMorph, {
	toolSubMenuItems: function(proceed, evt) {
		var menuItems = proceed(evt);
		menuItems.push(["User Sory controls", function(evt) {
			var w = WorldMorph.current();
			
			var btn1 = new ScriptableButtonMorph(new Rectangle(0,0, 80, 25));
			btn1.setLabel('add user story');
			btn1.applyStyle({fill: null, borderColor: Color.gray.darker(), borderWidth: 1});
			btn1.margin = new Rectangle(2, 0, 2, 0);
			btn1.scriptSource = 'apps.UserStories.UserStoryMorph.open()';
			
			
			var btn2 = new ScriptableButtonMorph(new Rectangle(0,0, 50, 25));
			btn2.setLabel('add task');
			btn2.applyStyle({fill: null, borderColor: Color.gray.darker(), borderWidth: 1});
			btn2.margin = new Rectangle(2, 0, 2, 0);
			btn2.scriptSource = 'apps.UserStories.TaskMorph.open()';
			
			var btn3 = new ScriptableButtonMorph(new Rectangle(0,0, 50, 25));
			btn3.setLabel('renew');
			btn3.applyStyle({fill: null, borderColor: Color.gray.darker(), borderWidth: 1});
			btn3.margin = new Rectangle(2, 0, 2, 0);
			btn3.scriptSource = 'apps.UserStories.UserStoryMorph.renewAll()';
			
			var buttonHolder = new BoxMorph(new Rectangle(0,0, 210, 35));
			buttonHolder.padding = new Rectangle(5, 5, 5, 5);
			buttonHolder.layoutManager = new HorizontalLayout(),
			buttonHolder.addMorph(btn1);
			buttonHolder.addMorph(btn2);
			buttonHolder.addMorph(btn3);
			w.addMorph(buttonHolder);
			buttonHolder.applyStyle({fill: Color.white, borderWidth: 1, borderColor: Color.gray.darker(), suppressHandles: true});
			buttonHolder.centerAt(w.visibleBounds().center());
		}]);
		return menuItems;
	}
});
enableLayer(UserStoryLayer);

BoxMorph.subclass('apps.UserStories.UserStoryBaseMorph', {

	style: {fill: Color.rgb(255,234,79), fillOpacity: 0.34, suppressGrabbing: true},

	defaultExtent: pt(420,320),

	initialize: function($super) {
		$super(this.defaultExtent.extentAsRectangle());
		this.priorExtent = this.getExtent()

		this.expectedTime = 0;
		this.actualTime = 0;

		this.resizeComplete = []
		this.resizeWidth = []
		this.moveVertical = []
		this.moveHorizontal = []
	},

	initializeFrom: function(other) {
		this.setExtent(other.getExtent());
		this.setPosition(other.getPosition());
		this.adjustForNewBounds();
	},


	titleString: function() { return this.title.textString },

	makeBounds: function(x1, y1, x2, y2) {
		var r = new Rectangle(x1,y1, x2-x1, y2-y1);
		return this.defaultExtent.extentAsRectangle().scaleByRect(r);
	},

	adjustForNewBounds: function ($super) {
			// Compute scales of old submorph extents in priorExtent, then scale up to new extent
			$super();
			var newExtent = this.innerBounds().extent();
			var scalePt = newExtent.scaleByPt(this.priorExtent.invertedSafely());

			var diff = newExtent.subPt(this.priorExtent)

			this.resizeComplete.forEach(function(sub) {
				sub.setExtent(sub.getExtent().addPt(diff));
			}) 
			this.resizeWidth.forEach(function(sub) {
				sub.setExtent(sub.getExtent().addPt(pt(diff.x, 0))); // just resize width
			}) 
			this.moveVertical.forEach(function(sub) {
				sub.setPosition(sub.getPosition().addPt(pt(0,diff.y)));
			}) 
			this.moveHorizontal.forEach(function(sub) {
				sub.setPosition(sub.getPosition().addPt(pt(diff.x,0)));
			}) 

			// this.submorphs.forEach(function(sub) {
				// if (sub.constructor == TextMorph) return;
	// 
				// sub.setPosition(sub.getPosition().scaleByPt(scalePt));
				// sub.setExtent(sub.getExtent().scaleByPt(scalePt));
			// });
			this.priorExtent = newExtent;

		},
		
	createButton: function(label, bounds) {
		var btn = new ButtonMorph(bounds || new Rectangle(0,0, 0.5, 0.5));
		btn.applyStyle({fill: null, borderColor: Color.gray, borderWidth: 3})
		btn.setLabel(label || '');
		this.addMorph(btn);
		return btn
	},

	createTextPane: function(name, text, bounds) {
		var t = newTextPane(bounds, text)
		this.addMorph(t);
		t.withAllSubmorphsDo(function() { this.suppressGrabbing = true })
		t.innerMorph().useChangeClue = false
		t.innerMorph().noEval = true
		t.scrollBar.setBorderWidth(0);
		this[name] = t
		return t;
	},

	addMoveBtn: function() {
		var btn = this.createButton('move', this.makeBounds(0.8, 0.01, 0.93, 0.12));
		lively.bindings.connect(btn, 'value', this, 'toggleMove');
		this.moveHorizontal.push(btn);
		this.moveBtn = btn
	},

	addCloseBtn: function() {
		var btn = this.createButton('X', this.makeBounds(0.93, 0.01, 0.98, 0.12))
		lively.bindings.connect(btn, 'fire', this, 'remove');
		this.moveHorizontal.push(btn);
	},

	toggleMove: function(val) {
		if (val) {
			this.moveConnection = connect(this.world().firstHand(), 'origin', this, 'setPosition',
			{converter: function(pos) { return pos.subPt(this.getTargetObj().moveBtn.getPosition()) }})
		} else {
			if (this.moveConnection)
				this.moveConnection.disconnect()
		}
	},
	
	openCenteredIn: function(ownerOrNothing) {
		var w = WorldMorph.current();
		(ownerOrNothing || w).addMorph(this);
		this.centerAt(ownerOrNothing ? ownerOrNothing.getCenter() : w.visibleBounds().center());
		
	},

});


apps.UserStories.UserStoryBaseMorph.subclass('apps.UserStories.UserStoryMorph', {

	style: {fill: Color.rgb(255,234,79), fillOpacity: 0.34, suppressGrabbing: true},
	defaultExtent: pt(420,320),
	isUserStory: true,

	initialize: function($super) {
		$super(this.defaultExtent.extentAsRectangle());

		this.tasks = [];

		this.addTitle();
		this.addStory();
		this.addNotes();
		this.addResizer();
		this.addTimings();
		this.addCloseBtn();
		this.addMoveBtn()
	},
	
	initializeFrom: function($super, other) {
		$super(other);
		this.title.setRichText(other.title.getRichText());
		this.story.innerMorph().setRichText(other.story.innerMorph().getRichText());
		this.notes.innerMorph().setRichText(other.notes.innerMorph().getRichText());

		$A(other.tasks).forEach(function(otherT) {
			otherT.toggleUserStoryConnect();
			otherT.remove()
			var t = new apps.UserStories.TaskMorph()
			if (this.owner) this.owner.addMorph(t)
			t.initializeFrom(otherT);
			t.physicallyConnectTo(this);
		}, this);
		
	},

	addTitle: function() {
		var t = new TextMorph(this.makeBounds(0.03, 0, 0.97, 0.15), 'Title of Story')
		t.applyStyle({fontSize: 22, fill: null, borderColor: null, suppressGrabbing: true});
		this.addMorph(t);
		this.title = t;
		this.resizeWidth.push(t)
	},

	addStory: function() {
		var t = this.createTextPane('story', 'Story description', this.makeBounds(0.03, 0.15, 0.97, 0.5));
		this.resizeWidth.push(t)
	},

	addNotes: function() {
		var t = this.createTextPane('notes', 'Notes and Tests', this.makeBounds(0.03, 0.52, 0.97, 0.9));
		this.resizeComplete.push(t);
	},

	addResizer: function() {
		var resizer = new HorizontalDivider(this.makeBounds(0.03, 0.5, 0.97, 0.52));
		resizer.addScalingAbove(this.story);
		resizer.addScalingBelow(this.notes);
		this.resizeWidth.push(resizer)
		this.addMorph(resizer)
		this.resizer = resizer
	},

	addTimings: function() {
		var l1 = new TextMorph(this.makeBounds(0.03, 0.92, 0.2, 0.95), 'expected:').beLabel()
		this.addMorph(l1);
		this.moveVertical.push(l1);

		var t = new TextMorph(this.makeBounds(0.2, 0.92, 0.35, 1), '0')
		this.addMorph(t);
		t.suppressHandles=true
		this.expectedTimeMorph = t
		this.moveVertical.push(t);
		t.beLabel()
		connect(this, 'expectedTime', t, 'setTextString', {converter: function(t) { return t.toString() }});

		var l2 = new TextMorph(this.makeBounds(0.38, 0.92, 0.43, 0.95), 'actual:').beLabel()
		this.addMorph(l2);
		this.moveVertical.push(l2);

		var t = new TextMorph(this.makeBounds(0.5, 0.92, 0.65, 1), '0')
		this.actualTimeMorph = t
		this.addMorph(t);
		t.suppressHandles=true
		this.moveVertical.push(t);
		t.beLabel()
		connect(this, 'actualTime', t, 'setTextString', {converter: function(t) { return t.toString() }});
	},

	taskRemoved: function(task) {
		disconnect(task, 'expectedTime', this, 'timeChanged');
		disconnect(task, 'actualTime', this, 'timeChanged');
		if (this.tasks) this.tasks = this.tasks.without(task);
		this.timeChanged()
	},

	taskAdded: function(task) {
		if (this.tasks.detect(function(ea) { return ea === task })) return;
		connect(task, 'expectedTime', this, 'timeChanged');
		connect(task, 'actualTime', this, 'timeChanged');
		this.tasks.push(task);
		this.timeChanged()
	},
	
	timeChanged: function() {
		if (!this.tasks) return
		this.expectedTime = this.tasks.inject(0, function(time, task) {
			return time + (task.expectedTime ? task.expectedTime : 0)
		});
		this.actualTime = this.tasks.inject(0, function(time, task) {
			return time + (task.actualTime ? task.actualTime : 0)
		});
	},

});

Object.extend(apps.UserStories.UserStoryMorph, {
	
	renewAll: function(morphToSearchIn) {
		// apps.UserStories.UserStoryMorph.renewAll();
		morphToSearchIn = morphToSearchIn || WorldMorph.current()
		var allUserStories = morphToSearchIn.submorphs.select(function(ea) { return ea.constructor == apps.UserStories.UserStoryMorph })
		allUserStories.forEach(function(ea) {
			var newS = new apps.UserStories.UserStoryMorph()
			if (ea.owner) ea.owner.addMorph(newS)
			newS.initializeFrom(ea);
			ea.remove();
		})
		allUserStories.forEach(function(ea) { ea.timeChanged() })
	},
	
	open: function(ownerOrNothing) { new apps.UserStories.UserStoryMorph().openCenteredIn(ownerOrNothing) },

});


apps.UserStories.UserStoryBaseMorph.subclass('apps.UserStories.TaskMorph', {

	style: {fill: Color.rgb(143,255,208), fillOpacity: 0.34, suppressGrabbing: true},

	defaultExtent: pt(260,160),

	titleString: function() { return this.title.textString },

	initialize: function($super) {
		$super(this.defaultExtent.extentAsRectangle());

		this.userStory = null;
		this.connectionMorphs = [];

		this.addTitle();
		this.addDescription();
		this.addDeveloperList();
		this.addResizer()
		this.addTimings();
		this.addConnect();
		this.addCloseBtn();
		this.addMoveBtn()
	},
	
	initializeFrom: function($super, other) {
		$super(other);
		this.expectedTime = other.expectedTime;
		this.actualTime = other.actualTime;

		this.title.setText(other.title.getText());
		this.taskDescription.innerMorph().setRichText(other.taskDescription.innerMorph().getRichText());
		this.responsibleList.innerMorph().setRichText(other.responsibleList.innerMorph().getRichText());
		
	},

	addTitle: function() {
		var t = new TextMorph(this.makeBounds(0.03, 0, 0.97, 0.1), 'Title of Task')
		t.applyStyle({fontSize: 16, fill: null, borderColor: null, suppressGrabbing: true});
		this.addMorph(t);
		this.title = t;
		this.resizeWidth.push(t)
	},

	addDescription: function() {
		var t = this.createTextPane('taskDescription', 'Task description', this.makeBounds(0.03, 0.14, 0.97, 0.5));
		this.resizeWidth.push(t)
	},

	addResizer: function() {
		var resizer = new HorizontalDivider(this.makeBounds(0.03, 0.5, 0.97, 0.52));
		resizer.addScalingAbove(this.taskDescription);
		resizer.addScalingBelow(this.responsibleList);
		this.addMorph(resizer)
		this.resizer = resizer
		this.resizeWidth.push(resizer)
	},

	addDeveloperList: function() {
		var t = this.createTextPane('responsibleList', 'Who is responsible?', this.makeBounds(0.03, 0.52, 0.97, 0.7));
		this.resizeComplete.push(t)
	},

	addTimings: function() {
		var l1 = new TextMorph(this.makeBounds(0.03, 0.72, 0.2, 0.75), 'expected:').beLabel()
		this.addMorph(l1);
		this.moveVertical.push(l1);

		var t = new TextMorph(this.makeBounds(0.25, 0.71, 0.45, 0.8), '0')
		this.addMorph(t);
		t.suppressHandles=true
		this.expectedTimeMorph = t
		this.moveVertical.push(t);
		connect(t, 'textString', this, 'expectedTime',
			{converter: function(str) { return str.endsWith('.') ? null : Number(str) }});
		connect(this, 'expectedTime', t, 'setTextString', {converter: function(n) { return n.toString() }});

		var l2 = new TextMorph(this.makeBounds(0.48, 0.72, 0.5, 0.75), 'actual:').beLabel()
		this.addMorph(l2);
		this.moveVertical.push(l2);

		var t = new TextMorph(this.makeBounds(0.65, 0.71, 0.85, 0.8), '0')
		this.actualTimeMorph = t
		this.addMorph(t);
		t.suppressHandles=true
		this.moveVertical.push(t);
		connect(t, 'textString', this, 'actualTime',
			{converter: function(str) { return str.endsWith('.') ? null : Number(str) }});
		connect(this, 'actualTime', t, 'setTextString', {converter: function(n) { return n.toString() }});
	},

	addConnect: function() {
		var btn = this.createButton('Connect to Story', this.makeBounds(0.03, 0.87, 0.57, 0.97));
		lively.bindings.connect(btn, 'fire', this, 'createConnection');
		lively.bindings.connect(btn, 'fire', this, 'addDisconnect');
		lively.bindings.connect(btn, 'fire', btn, 'remove');
		this.moveVertical.push(btn);
		if (this.connectionBtn)
			btn.setPosition(this.connectionBtn.getPosition())
		this.connectionBtn = btn
	},

	addDisconnect: function() {
		var btn = this.createButton('Disconnect from Story', this.makeBounds(0.03, 0.87, 0.57, 0.97))
		lively.bindings.connect(btn, 'fire', this, 'toggleUserStoryConnect');
		// lively.bindings.connect(btn, 'fire', this, 'addConnect');
		// lively.bindings.connect(btn, 'fire', btn, 'remove');
		this.moveVertical.push(btn);
		if (this.connectionBtn)
			btn.setPosition(this.connectionBtn.getPosition())
		this.connectionBtn = btn
	},

	createConnection: function() {
		var p = (this.world() && this.world().firstHand().getPosition()) || pt(100,100)
		var c = Morph.makeConnector(pt(1000,100), p);
		c.openInWorld()
		connectMorphs(c, this, true)
		lively.bindings.connect(c, 'endMorph', this, 'toggleUserStoryConnect');
		this.connectionMorphs.push(c);
		return c
	},
	
	physicallyConnectTo: function(story) {
		if (this.connectionMorphs.length === 0) this.createConnection();
		story.setWithLayers([NodeMorphLayer]);
		this.connectionMorphs.forEach(function(c){
			// FIXME
			c.endMorph = story;
			story.connectLineMorph(c)
			c.updateConnection()
		}, this);
	},


	toggleUserStoryConnect: function(userStory) {
		if (this.userStory === userStory) return;

		if (this.userStory) {
			this.userStory.taskRemoved(this);
			if (this.world())
				this.world().setStatusMessage(
					this.titleString() + ' disconnected from ' + this.userStory.titleString(), Color.green, 3);
			this.userStory = null;
		}

		if (!userStory) {
			this.connectionMorphs.reject(function(ea) { return !ea }).invoke('remove')
			if (this.connectionBtn)
				this.connectionBtn.remove()
			this.addConnect()
			 return;
		}

		if (!userStory.isUserStory) {
			if (this.world())
				this.world().setStatusMessage(userStory.toString() + ' is no user story!', Color.orange, 5);
			return
		}

		userStory.taskAdded(this);
		this.userStory = userStory;
		if (this.world())
			this.world().setStatusMessage(
				this.titleString() + ' connected with ' + userStory.titleString(), Color.green, 3);	
	},

	remove: function($super) {
		try {
			this.toggleUserStoryConnect(); // also removes connectors
		} catch(e) {
			WorldMorph.current().alert(e)
		}
		
		$super()
	},

});

Object.extend(apps.UserStories.TaskMorph, {
	open: function(ownerOrNothing) { new apps.UserStories.TaskMorph().openCenteredIn(ownerOrNothing) },
});

Object.extend(Global, {
	UserStoryMorph: apps.UserStories.UserStoryMorph,
	TaskMorph: apps.UserStories.TaskMorph,
});


}) // end of module