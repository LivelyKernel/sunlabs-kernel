load('util.js');
var stage;

 var javafx = Packages.FXWrapFactory.javafx;

 function test() {
     var Color =  Packages.javafx.scene.paint.Color;
     var red = Color.$RED;
     var green = Color.$GREEN;
     var white = Color.$WHITE;
     var blue = Color.$BLUE;

     stage = javafx.stage.Stage({
	 title: 'Declaring is easy!', 
	 width: 400, 
	 height: 500,
	 scene: javafx.scene.Scene({
	     //fill: red,
	     content: [
		 javafx.scene.Group({
		     content: [
			 javafx.scene.shape.Rectangle({
			     x: 45, y:35, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: green
			 }),
			 javafx.scene.shape.Circle({
			     centerX: 118, centerY:110, radius:83, fill: white, stroke: red
			 }),
			 javafx.scene.shape.Rectangle({
			     x: 100, y: 35,
			     width: 150, height: 150,
			     arcWidth: 15, arcHeight: 15,
			     fill: green
			 })
		     ]
		 }),
	 	 javafx.scene.shape.Rectangle({
		     x: 45, y:235, width:150, height:150, arcWidth: 15, arcHeight: 15, fill: blue
		 })
	     ]
	 })
     });
     ///print('rect is ' + rect);
     print('stage is ' + stage);
     var gr = stage.scene.content[0];
     print('sizeof group is ' + gr.content.length);
     return stage;
}


test();
