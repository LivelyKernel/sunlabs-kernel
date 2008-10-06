
module('Tests/OmetaTest.js').requires('Helper.js', 'Ometa.js').toRun(function() {

using(lk.text).run(function(text) { 
TestCase.subclass('TextTest', {

    styleOfIncludes: function(spec, style) {
        var names = Object.keys(spec).select(function(ea) { return spec.hasOwnProperty(ea) });
        return names.all(function(ea) { return style[ea] == spec[ea]});
    },
    
    assertTextStyle: function(text, spec, begin, end, msg) {
        if (!end) end = begin;
        this.assert(begin >= 0 && begin <= end && end <= text.string.length, 'strange range in assertTextStyle');
        range(begin, end).each(function(i) {
            if (this.styleOfIncludes(spec, text.emphasisAt(i))) return;
            this.assert(false, 'TextStyle of ' + text.string + ' has not '
                                + JSON.serialize(spec) + ' at position ' + i + ' -- ' + msg);
        }, this);
    },
    
    // to test assertion
    testThisTest: function() {
        var style = {style: 'bold', fontSize: 4, color: Color.red};
        var t = new text.Text('Hello', style);
        this.assert(t instanceof text.Text, 'not text');
        // result.asMorph().openInWorld();
        this.assertTextStyle(t, {color: Color.red}, 0, t.string.length);
    }
});

TextTest.subclass('SyntaxHighlighterTest', {

    setUp: function() {
        this.sut = new SyntaxHighlighter();
    },
    
    testGetGrammarString: function() {
        var result = this.sut.parserSrc();
        this.assert(Object.isString(result), 'cannot read');
        this.assert(result.startsWith('ometa LKJSParser'), 'wrong string');
    },
    
    testCompileGrammar: function() {
        var result = this.sut.compileParserSrc();
        this.assert(result.isLKParser);
    },
    
    testStringToAttributedText: function() {
        var result = this.sut.makeBold('Hello world!!!');
        this.assert(result instanceof text.Text, 'not text');
        // result.asMorph().openInWorld();
        this.assertTextStyle(result, {color: Color.red}, 0, result.string.length);
    }
});

});



TestCase.subclass('OmetaLoadingTest', {

    shouldRun: false,
    
    testLoadAllFiles: function() {
        require('ometa/lib.js').toRun(function() {
        module('ometa/lib.js').requires('ometa/ometa-base.js').toRun(function() {
        module('ometa/ometa-base.js').requires('ometa/parser.js').toRun(function() {
        module('ometa/parser.js').requires('ometa/bs-js-compiler.js').toRun(function() {
        module('ometa/bs-js-compiler.js').requires('ometa/bs-ometa-compiler.js').toRun(function() {
        module('ometa/bs-ometa-compiler.js').requires('ometa/bs-ometa-optimizer.js').toRun(function() {
        module('ometa/bs-ometa-optimizer.js').requires('ometa/bs-ometa-js-compiler.js').toRun(function() {
        // module('ometa/bs-ometa-js-compiler.js').requires('ometa/bs-project-list-parser.js').toRun(function() {
        // module('ometa/bs-project-list-parser.js').requires('ometa/workspace.js').toRun(function() {
        // module('ometa/ometa/workspace.js').requires('ometa/wiki.js').toRun(function() {
        // })})})
        })})})})})})});
        
    }
});

var ometaSampleInterpeter = "        ometa Calc {  \n\
  digit    = super(#digit):d          -> d.digitValue(),\n\
  number   = number:n digit:d         -> (n * 10 + d) \n\
           | digit,\n\
  addExpr  = addExpr:x '+' mulExpr:y  -> (x + y) \n\
           | addExpr:x '-' mulExpr:y  -> (x - y) \n\
           | mulExpr,\n\
  mulExpr  = mulExpr:x '*' primExpr:y -> (x * y)\n\
           | mulExpr:x '/' primExpr:y -> (x / y)\n\
           | primExpr,\n\
  primExpr = '(' expr:x ')'           -> x\n\
           | number,\n\
  expr     = addExpr\n\
}\n\
\n\
Calc.matchAll('6*(4+3)', 'expr')";

TestCase.subclass('OmetaTest', {
                        
    testBSOMetaJSParser: function() {
        var s = "3+ 4";
        var tree = BSOMetaJSParser.matchAll(s, "topLevel");
        this.assert(tree, " is defined");
        this.assertEqual(tree.toOmetaString(), "[begin, [binop, +, [number, 3], [number, 4]]]");
    },

    testBSOMetaJSTranslator: function() {
        var s = "3+ 4";    
        var tree = BSOMetaJSParser.matchAll(s, "topLevel");
        var result= BSOMetaJSTranslator.match(tree, "trans");
        this.assertEqual(String(result), "((3) + (4))");
    },
    testOmetaSampleInterpreter: function() {
        var calcSrc = BSOMetaJSParser.matchAll(ometaSampleInterpeter, "topLevel");
        var result = eval(BSOMetaJSTranslator.match(calcSrc, "trans"));
        this.assertEqual(result, 42);
    }
});


TestCase.subclass('OmetaWorkspaceTest', {
    
    shouldRun: true,
    
    setUp: function() {
        this.ws = new OmetaWorkspace();  
    },
    testEvalOmeta: function() {
        this.assertEqual(this.ws.evalOmeta(ometaSampleInterpeter), 42)
    }  
});

//})();
});