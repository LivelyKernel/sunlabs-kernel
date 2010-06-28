

module('lively.FabrikExtensions').requires('lively.Helper', 'cop.Layers').toRun(function() {

createLayer("WorldClockLayer");
createLayer("TokyoTimeLayer");
createLayer("BerlinTimeLayer");


cop.layerClass(WorldClockLayer, ClockMorph, {
	setHands: function(proceed) {
		if (this.name == "Tokyo") {
			withLayers([TokyoTimeLayer], function() {
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

enableLayer(WorldClockLayer);
	



	
});