load('util.js');
load('bootstrap.js');
var stage;

var javafx = Packages.FXWrapFactory.javafx;

function test() {
    var Color =  javafx.scene.paint.Color;
    var shape = javafx.scene.shape;

    stage = javafx.stage.Stage({
	title: 'Declaring is easy!', 
	width: 400, 
	height: 500,
	scene: javafx.scene.Scene({
	    //fill: Color.RED,
	    content: [
		javafx.scene.Group({
		    translateY: 130,
		    content: [
			javafx.scene.shape.Rectangle({
			    x: 45, y:35, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.GREEN
			}),
			javafx.scene.shape.Circle({
			    centerX: 118, centerY:110, radius:83, fill: Color.WHITE, stroke: Color.RED
			}),
			javafx.scene.shape.Rectangle({
			    x: 100, y: 35,
			    width: 150, height: 150,
			    arcWidth: 15, arcHeight: 15,
			    fill: javafx.scene.paint.LinearGradient({
				startX: 0.0, 
				startY: 0.0, 
				endX: 1.0, 
				endY: 0.0,
				stops: [
				    javafx.scene.paint.Stop({offset: 0.0, color: Color.BLACK}),
				    javafx.scene.paint.Stop({offset: 1.0, color: Color.RED})
				]
			    })
			})
		    ]
		}),
	 	javafx.scene.shape.Rectangle({
		    x: 45, y:235, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.BLUE
		}),
		javafx.scene.control.Button({ width: 200, height: 100, strong: true, translateX: 20, translateY: 20 }),
		javafx.scene.control.Slider({ width: 200, height: 30, translateX: 20, translateY: 120 })
	    ]
	})
    });

    ///print('rect is ' + rect);
    print('stage is ' + stage);
    var gr = stage.scene.content[0];
    //print('sizeof group is ' + gr.content.length);
    

    print('action is ' + stage.scene.content[2].action);
    button = stage.scene.content[2];
    slider = stage.scene.content[3];

    sliderModel = { position: 0, max: 0 }
    fxBind(slider, 'value', sliderModel, 'position', true); 
    //slider.fxBind('value', sliderModel, 'position', true); 
    fxBind(slider, 'max', sliderModel, 'max'); 
    //slider.fxBind('max', sliderModel, 'max'); 
    
    
    button.action = function() { 
	print("button says hi!"); 
	if (sliderModel.position + 10 < sliderModel.max)
	    sliderModel.position += 10;
    } 

    return stage;
}
    

test();
