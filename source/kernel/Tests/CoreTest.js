module('lively.Tests.CoreTest').requires('lively.TestFramework').toRun(function() {


/**
 * @class ConnectModelTest
 * Tests for understanding Record, Relay and View Behavior
 */
TestCase.subclass('Alively.Tests.CoreTest.ConnectModelTest', {

    testAddObserver: function() {
        var formalModel = Record.newPlainInstance({MyValue: "Hello World"});
        var view = new View();
        var countUpdate = 0;
        
        view.onViewValueUpdate = function() {
           countUpdate = countUpdate + 1;
        };
        
        formalModel.addObserver(view, {MyValue: '!ViewValue'});
        
        this.assertEqual(countUpdate, 0, "onMyTextUpdate was called prematurely");        
        formalModel.setMyValue("once");        
        this.assertEqual(countUpdate, 1, "onMyTextUpdate was not called");        
        
        var observers = formalModel["MyValue$observers"]
        this.assertEqual(observers.length, 1, "wrong number of registered observers");
        
    },
    
    testNotifyObserversOf: function() {
		var formalModel1 = Record.newPlainInstance({MyValue1: "Hello World 1"});
		var formalModel2 = Record.newPlainInstance({MyValue2: "Hello World 2"});

        formalModel1.addObserver(formalModel2, {MyValue1: '=setMyValue2'}); 

		// no kickstart here...
		//this.assertEqual(formalModel1.getMyValue1(), formalModel2.getMyValue2(), "value was not updated initialy");

		var value = "Hallo Welt";
		formalModel1.setMyValue1(value);
		this.assertEqual(formalModel2.getMyValue2(), value, "value2 was not update after setting value1");
	},

    testCyclicNotifyObserversOf: function() {
		var formalModel1 = Record.newPlainInstance({MyValue1: "Hello World 1"});
		var formalModel2 = Record.newPlainInstance({MyValue2: "Hello World 2"});

        formalModel1.addObserver(formalModel2, {MyValue1: '=setMyValue2'}); 
		formalModel2.addObserver(formalModel1, {MyValue2: '=setMyValue1'});

		// no kickstart here...
		//this.assertEqual(formalModel1.getMyValue1(), formalModel2.getMyValue2(), "value was not updated initialy");

		var value = "Hallo Welt";
		formalModel1.setMyValue1(value);
		this.assertEqual(formalModel2.getMyValue2(), value, "value2 was not update after setting value1");
	},

});

console.log('loaded CoreTest.js');

}) // end of module