module('Tests.WebCollabAgentTest').requires('lively.TestFramework').toRun(function(thisModule) {
// load('web-collab/support/testframework.js');
// load('web-collab/chat/agent.js');

AsyncTestCase.subclass('Tests.WebCollabAgentTest.ServerComTest', {

    testLoginAndOut: function() {
      var wasLoggedIn = false;
      var agent = new lively.webcollab.WebCollabAgent({
        user: 'testLoginAndOut',
        onLogin: function(req) {
          agent.logout();
          var json = null;
          try { json = JSON.parse(req.responseText); } catch(e) {};
          this.assert(json != null, 'json in login couldn\'t be parsed');
          this.assert(json.isSuccess, 'response doesn\'t include isSuccess field');
          wasLoggedIn = true;
        }.bind(this),
        onLogout: function(req) {
          // debugger;
        }
      });
      this.assert(!agent.isLoggedIn(), 'already logged in');
      agent.login();
      this.delay(function() { this.assert(!agent.isLoggedIn(), 'still logged in'); this.done() }, 100);
    },

    testContinousConnection: function() {
      var agent = new lively.webcollab.WebCollabAgent({user: 'testContinousConnection'});
      var messageParts = ['Hallo', 'dies', 'ist', 'ein', 'Test'];
      // call special setupTestStream action
      var index = 0;
      agent.setupTestStream(
        {text: messageParts},
        function(req, newText) { this.assertEquals(messageParts[index++] + '\r\n', newText); }.bind(this)
      );
      // delay for each send is 500 ms
      var wait = 500 * messageParts.length + 100;
      this.setMaxWaitDelay(wait + 10);
      this.delay(function() { this.assertEquals(messageParts.length, index); this.done(); }, wait);
    },

    testBroadcast: function() {
      var channel = 'testBroadcast'; message = {text: 'This is text message', channel: channel}, result = null;
      var sender = new lively.webcollab.WebCollabAgent({user: 'testBroadcast_sender'});
      var receiver = new lively.webcollab.WebCollabAgent({
        user: 'testBroadcast_receiver',
        listenOnChannels: [channel],
        onLogin: function() { sender.broadcast(message) },
        onReceive: function(json) { result = json && json.message.text; receiver.logout(); }
      });
      receiver.login();
      this.setMaxWaitDelay(1000 + 10);
      this.delay(function() { this.assertEquals(message.text, result); this.done() }, 1000);
    },

    testBroadcastTwoAtOnce: function() {
      var channel = 'testBroadcastTwoAtOnce', result = [],
        message1 = {text: 'This is text message', channel: channel},
        message2 = {text: 'This is another message', channel: channel};
      var sender = new lively.webcollab.WebCollabAgent({user: 'testBroadcastTwoAtOnce_sender'});
      var receiver = new lively.webcollab.WebCollabAgent({
        user: 'testBroadcastTwoAtOnce_receiver',
        listenOnChannels: ['testBroadcastTwoAtOnce'],
        onLogin: function() { sender.broadcast(message1, true); sender.broadcast(message2, true) },
        onReceive: function(json) { result.push(json) }
      });
      receiver.login();
      this.delay(
        function() {
          this.assert(result.length == 2, 'not expected number of messages received!')
          this.assertEquals(message1.text, result[0].message.text);
          this.assertEquals(message2.text, result[1].message.text);
          receiver.logout();
          this.done();
        },
        300);
    },

    testMessageOnlyBroadcastedOnChannel: function() {
      var message = {text: 'This is text message', channel: 'channel1'}, onReceiveCalled = false;
      var sender = new lively.webcollab.WebCollabAgent({user: 'testMessageOnlyBroadcastedOnChannel'});
      var receiver = new lively.webcollab.WebCollabAgent({
        user: 'testMessageOnlyBroadcastedOnChannel_receiver',
        listenOnChannels: ['channel2'],
        onLogin: function() { sender.broadcast(message) },
        onReceive: function(json) { onReceiveCalled = true }
      });
      receiver.login();
      this.setMaxWaitDelay(800 + 10);
      this.delay(function() {
        this.assert(onReceiveCalled === false, 'receiver not on channel was called!');
        try { receiver.logout() } catch(e) {};
        this.done();
      }, 400);
    },

    // testSendWhenStreamClosed: function() {
    //   var agent = new lively.webcollab.WebCollabAgent({
    //     user: 'testSendWhenStreamClosed',
    //     onStreamClose: function()
    //   });
    // },
  });
    
})