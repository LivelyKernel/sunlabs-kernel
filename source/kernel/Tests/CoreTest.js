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
  

});

console.log('loaded CoreTest.js');

}) // end of module