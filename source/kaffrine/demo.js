load('util.js');
var stage;

var javafx = Packages.FXWrapFactory.javafx;

function test() {
    var Color =  javafx.scene.paint.Color;
    var shape = javafx.scene.shape;

    // FIXME: this trick to avoid a deadlock
    //stage = javafx.stage.Stage({});
    
    stage = javafx.stage.Stage({
	title: 'Declaring is easy!', 
	width: 400, 
	height: 500,
	scene: javafx.scene.Scene({
	    //fill: Color.RED,
	    content: [
		//javafx.scene.control.Button({ width: 200, height: 100, strong: true, translateX: 20, translateY: 20 }),
		javafx.scene.Group({
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
			    fill: Color.GREEN
			})
		    ]
		}),
	 	javafx.scene.shape.Rectangle({
		    x: 45, y:235, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: Color.BLUE
		})
	    ]
	})
    });
    ///print('rect is ' + rect);
    print('stage is ' + stage);
    var gr = stage.scene.content[0];
    print('sizeof group is ' + gr.content.length);
    gr.content[0].action = function() { print("yo!") } 
    print('action is ' + gr.content[0].action);
    return stage;
}
    
//Packages.javax.swing.SwingUtilities.invokeLater(test);

test();
