module('Tests.UserStoryTest').requires('lively.TestFramework', 'apps.UserStories').toRun(function() {

TestCase.subclass('Tests.UserStoryTest.UserStoryTest', {

	setUp: function($super) {
		$super();
		this.testWorld = new BoxMorph(pt(1000,1000).extentAsRectangle())
		Object.extend(this.testWorld, {
			world: function() { return this.testWorld }.bind(this),
			setStatusMessage: function(msg) {
				if (!this.messages) this.messages = [];
				this.messages.push(msg)
			}.bind(this),
		})
	},

	addToTestWorld: function() {
		var morphs = $A(arguments);
		morphs.forEach(function(ea) { this.testWorld.addMorph(ea)}, this);
	},

	test01AddTasksToUserStory: function() {
		var story = new UserStoryMorph();
		var task1 = new TaskMorph();
		var task2 = new TaskMorph();
		this.addToTestWorld(story, task1, task2);
		task1.expectedTime = 10;
		task1.actualTime = 12;
		task1.toggleUserStoryConnect(story);
		task2.toggleUserStoryConnect(story);
		this.assertEquals(10, story.expectedTime);
		this.assertEquals(12, story.actualTime);
		task2.expectedTime = 4;
		task2.actualTime = 2;
		this.assertEquals(14, story.expectedTime);
		this.assertEquals(14, story.actualTime);
		task1.toggleUserStoryConnect()
		this.assertEquals(4, story.expectedTime);
		this.assertEquals(2, story.actualTime);
	},
	
	test02ConnectedAfterCopy: function() {
		try {
			var s = new UserStoryMorph();
			var t1 = new TaskMorph();
			var t2 = new TaskMorph();
			[s,t1,t2].invoke('openInWorld');
			[s,t1,t2].invoke('setPosition', WorldMorph.current().visibleBounds().center())
			t1.physicallyConnectTo(s);
			t2.physicallyConnectTo(s);
			t1.expectedTime = 3;
			this.assert(3 == s.expectedTime);

			// =====================
			var s2 = new UserStoryMorph();
			s2.openInWorld()
			s2.initializeFrom(s);
			this.assert(3 == s2.expectedTime);
			this.assert(2 == s2.tasks.length);
		} finally {
			[s,t1,t2].invoke('remove');
			s2.tasks.invoke('remove');
			s2.remove();
		}	

	},

});

}) // end of module