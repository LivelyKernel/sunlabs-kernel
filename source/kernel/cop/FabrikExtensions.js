

module('lively.FabrikExtensions').requires('lively.Helper', 'cop.Layers').toRun(function() {

cop.createLayer("WorldClockLayer");
cop.createLayer("TokyoTimeLayer");
cop.createLayer("BerlinTimeLayer");


cop.layerClass(WorldClockLayer, ClockMorph, {
	setHands: function(proceed) {
		if (this.name == "Tokyo") {
			cop.withLayers([TokyoTimeLayer], function() {
				return proceed();
			});
			return;
		} else {
			return proceed();			
		}
	}
});

cop.layerClass(TokyoTimeLayer, ClockMorph, {
 	get timeZoneOffset(proceed) {
 		return 9;
 	}		
});

// cop.layerClass(BerlinTimeLayer, ClockMorph, {
//  	get timeZoneOffset(proceed) {
//  		return 2;
//  	}		
// });


// cop.layerClass(TokyoTimeLayer, Date, {
// 	getTimezoneOffset: function(proceed) {
// 		return - 9 * 60;
// 	}		
// });

cop.enableLayer(WorldClockLayer);
	



	
});