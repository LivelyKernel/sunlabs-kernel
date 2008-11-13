module('lively.Helper').requires().toRun(function() {

// extension to Morphs
Morph.addMethods({
    openInWorld: function(loc) {
        WorldMorph.current().addMorph(this);
        loc && this.setPosition(loc);
    }
});
// this.getRichText().asMorph().openInWorld()

/*
 * Stack Viewer when Dans StackTracer is not available
 */

Global.getStack = function() {
    var result = [];
    for (var caller = arguments.callee.caller; caller; caller = caller.caller) {
        if (result.indexOf(caller) != -1) {
           result.push({name: "recursive call can't be traced"});
           break;
        }
        result.push(caller);
    };
    return result;  
};


Global.printStack = function() {  
    function guessFunctionName(func) {
        return func.qualifiedMethodName() || func.toString().match(/function (.+)\(/)[1] || func;
    };
    
    var string = "== Stack ==\n";
    var stack = getStack();
    stack.shift(); // for getStack
    stack.shift(); // for printStack (me)
    var indent = "";
    for (var i=0; i < stack.length; i++) {
        string += indent + i + ": " +guessFunctionName(stack[i]) + "\n";
        indent += " ";        
    };
    return string;
};

Global.logStack = function() {
    this.console.log(printStack())
};

Global.logStackFor = function(obj, methodName) {
    obj[methodName] = obj[methodName].wrap(function(proceed) {
        var args = $A(arguments); args.shift(); 
        MyLogDepth++;
        debugger;
        var result = proceed.apply(this, args);
        
        logStack();
        MyLogDepth--;
        return result
    })
};

Global.indentForDepth = function(depth) {
    var s=""
    for(var i=depth; i > 0; i--) s += " ";
    return s
};

Global.resetLogDepth = function() {
    MyLogDepth = 0;    
};
Global.resetLogDepth();

Global.logCall = function(args, from, shift) {
    s = ""
    s += indentForDepth(MyLogDepth);
    if(from)
        s += String(from) + " ";
    s += args.callee.qualifiedMethodName() + "("
    var myargs = $A(args);
    if(shift) myargs.shift(); // for loggin inside wrapper functions
    myargs.each(function(ea){ s += ea + ", "});
    s += ")";
    console.log(s)
};

// function logCallHelper(from, methodName, args, indent) {
//     return Strings.format('%s%s>>%s(%s)',
//         indentForDepth(indent),
//         from.toString(),
//         methodName,
//         args.collect(function(ea) { return ea.toString() }).join(', '));
// };


Global.logMethod = function(obj, methodName) {
    obj[methodName] = obj[methodName].wrap(function(proceed) {
        var args = $A(arguments); args.shift(); 
        MyLogDepth++;
        console.log(logCallHelper(this, methodName, args, MyLogDepth * 2))
        var result = proceed.apply(this, args);
        MyLogDepth--;
        return result
    })
};

Global.printObject = function(obj) {
    var s = String(obj) + ":";
    for(ea in obj) { 
        if (!Object.isFunction(obj[ea]))
            s += " " + ea + ":" + String(obj[ea]) + "\n"
    };
    return s
};

Global.printObjectFull = function(obj) {
    var s = "{";
    for(ea in obj) { 
        s += " " + ea + ":" + String(obj[ea]) + ", \n"
    };
    return s + "}"
};

Global.logObject = function(obj) {
    console.log(printObject(obj))
};


Global.stringToXML = function(string) {
    return new DOMParser().parseFromString(string, "text/xml");
};

// Generator for an array
Global.range = function(begin, end) {
    result = [];
    for (var i = begin; i <= end; i++) {
        result.push(i);
    }
    return result;
};

// -------      ----------------
// ---- very simple layouters
Object.subclass('Layout', {
    
    initialize: function(baseMorph, layoutSpec) {
        this.layoutSpec = layoutSpec || {};
        this.baseMorph = baseMorph;
    },
    
    layout: function() {
        
        // this.baseMorph.layoutChanged = Morph.prototype.layoutChanged.bind(this.baseMorph);
        
        this.baseMorph.submorphs
            .reject(function(ea) { return ea instanceof HandleMorph})
            .inject(pt(0,0), function(pos, ea) {
                ea.setPosition(pos);
                return this.newPosition(ea);
            }, this);

        if (!this.layoutSpec.noResize) {        
            var maxExtent = this.baseMorph.submorphs.inject(pt(0,0), function(maxExt, ea) {
                return maxExt.maxPt(ea.getPosition().addPt(ea.getExtent()));
            });
            this.baseMorph.setExtent(maxExtent);
        };
        
        if (this.layoutSpec.center) { this.centerMorphs() };
        
        // this.baseMorph.layoutChanged();        
        // this.baseMorph.layoutChanged = this.baseMorph.constructor.prototype.layoutChanged.bind(this.baseMorph);
    },
    
    newPosition: function(lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition();
    },
    
    centerMorphs: function() {}
});

Layout.subclass('VLayout', {
    
    newPosition: function($super, lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition().addXY(0, lastLayoutedMorph.getExtent().y);
    },
    
    centerMorphs: function() {
        var centerX = this.baseMorph.shape.bounds().center().x;
        this.baseMorph.submorphs.each(function(ea) {
            ea.setPosition(ea.getPosition().withX(centerX - ea.getExtent().x/2));
        }, this)
    }
    
});

Layout.subclass('HLayout', {
    
    newPosition: function(lastLayoutedMorph) {
        return lastLayoutedMorph.getPosition().addXY(lastLayoutedMorph.getExtent().x, 0);
    },
    
    centerMorphs: function() {
        var centerY = this.baseMorph.shape.bounds().center().y;
        this.baseMorph.submorphs.each(function(ea) {
            ea.setPosition(ea.getPosition().withY(centerY - ea.getExtent().y/2));
        }, this)
    }
    
});

// Some Mokeypatching :-)
// TODO: Merge

Morph.addMethods({
   layout: function(notResizeSelf) {
       this.layoutSpec && this.layoutSpec.layouterClass && new this.layoutSpec.layouterClass(this, this.layoutSpec).layout();
       this.owner && this.owner.layout();
   }
});
Morph.prototype.removeMorph = Morph.prototype.removeMorph.wrap(function(proceed, morph) {
    proceed(morph);
    this.layout();
    return this;
});

/*
 * HandPositionObserver, observes position changes of the hand and calls the function
 */
Object.subclass('HandPositionObserver', {

    documentation: 'Observes position changes of a HandMorph and calls a function',
    
    initialize: function(func, hand) {
        this.hand = hand || WorldMorph.current().hands.first();
        this.func = func;
        return this;
    },

    onGlobalPositionUpdate: function(value) {
        if (this.func) this.func.call(this, value)
    },

    start: function() {
        this.hand.formalModel.addObserver(this);
    },

    stop: function() {
        this.hand.formalModel.removeObserver(this);
    },
});

Morph.subclass('lively.Helper.ToolDock', {
    
    initialize: function($super, bounds) {
        $super(bounds || this.getWorld().bounds().withWidth(60));
        this.handObserver = null;
        this.applyStyle(this.style());
    },
    
    style: function() {
        return {fill: Color.blue, borderWidth: 0, fillOpacity: 0.3};
    },
    
    startUp: function() {
        this.addItems();
        this.getWorld().addMorph(this);
        this.showPosition = pt(this.getWorld().getExtent().x - this.getExtent().x, 0);
        this.hidePosition = pt(this.getWorld().getExtent().x, 0);
        this.setPosition(this.hidePosition);
        this.triggerMoveTo(this.showPosition, this.activationArea());
    },
    
    getWorld: function() {
        return WorldMorph.current();
    },
    
    activationArea: function() {
        var relative = new Rectangle(0.9,0,0.1,1);
        return this.getWorld().bounds().scaleByRect(relative);
    },
    
    deactivationArea: function() {
        var relative = new Rectangle(0,0,0.9,1);
        return this.getWorld().bounds().scaleByRect(relative);
    },
    
    triggerMoveTo: function(position, activeScreenArea) {
        this.handObserver = new HandPositionObserver(function(point) {
            if (!activeScreenArea.containsPoint(point)) return;
            this.handObserver.stop();
            this.moveGradually(
                position,
                8,
                function() {
                    if (position.eqPt(this.showPosition))
                        this.triggerMoveTo(this.hidePosition, this.deactivationArea())
                    else
                        this.triggerMoveTo(this.showPosition, this.activationArea())
                });
        }.bind(this));
        this.handObserver.start();
    },
        
    moveGradually: function(targetPos, steps, actionWhenDone) {
        var dock = this;
        var vect = targetPos.subPt(this.getPosition());
        var stepVect = vect.scaleBy(1/steps);
        var stepTime = 10;
        var makeStep = function(remainingSteps) {
            if (remainingSteps <= 0) return actionWhenDone.apply(dock);
            dock.moveBy(stepVect);
            Global.setTimeout(makeStep.curry(remainingSteps-1), stepTime);
        };
        Global.setTimeout(makeStep.curry(steps), stepTime);
    },
    
    okToBeGrabbedBy: function(evt) {
        return null; 
    },
    
    addItems: function() {
        var dock = this;
        this.items().each(function(ea) {
            var button = new TextMorph(new Rectangle(0,0, dock.getExtent().x, 30), ea.label);
            button.handlesMouseDown = function(evt) {
                return true;
            },
            button.onMouseDown = function(evt) {
                ea.action.call(dock, evt);
                return true;
            },
            dock.addMorph(button);
        });
        new VLayout(dock, {noResize: true}).layout();
    },
    
    items: function() {
        return [
            {label: 'SystemBrowser', action: function(evt) {
                var browserMorph = new lively.Tools.SystemBrowser().openIn(WorldMorph.current(), evt.point());
                evt.hand.grabMorph(browserMorph, evt) }},
            {label: 'TextMorph', action: function(evt) {
                var textMorph = new TextMorph(pt(400,50).extentAsRectangle());
                evt.hand.grabMorph(textMorph, evt) }}
        ]
    }
});

console.log('Helper.js is loaded');

});