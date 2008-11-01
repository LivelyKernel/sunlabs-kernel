
module('Tests/OmetaTest.js').requires('Helper.js', 'Ometa.js').toRun(function() {

TestCase.subclass('TextTest', {

    styleOfIncludes: function(spec, style) {
        var names = Object.keys(spec).select(function(ea) { return spec.hasOwnProperty(ea) });
        return names.all(function(ea) { return style[ea] == spec[ea]});
    },
    
    assertTextStyle: function(text, spec, beginPos, length, msg) {
        var endPos = length ? beginPos + length - 1: beginPos;
        range(beginPos, endPos).each(function(i) {
            if (this.styleOfIncludes(spec, text.emphasisAt(i))) return;
            this.assert(false, 'TextStyle of ' + text.string + ' has not '
                                + JSON.serialize(spec) + ' at position ' + i
                                + ' character: ' + text.string[i] + ' -- ' + msg);
        }, this);
    },
    
    // to test assertion
    testThisTest: function() {
        var style = {style: 'bold', fontSize: 4, color: Color.red};
        var text = new lively.Text.Text('Hello', style);
        this.assert(text instanceof lively.Text.Text, 'not text');
        // result.asMorph().openInWorld();
        this.assertTextStyle(text, {color: Color.red}, 0, text.string.length);
    }
});

TextTest.subclass('SyntaxHighlighterTest', {

    setUp: function() {
        this.sut = new SyntaxHighlighter();
    },
    
    testGetGrammarString: function() {
        var result = this.sut.parserSrc();
        this.assert(Object.isString(result), 'cannot read');
        this.assert(/.*ometa LKJSParser.*/.test(result), 'wrong string');
    },
    
    testCompileGrammar: function() {
        var src = this.sut.parserSrc();
        this.assert(Object.isString(src));
        var result = OMetaSupport.ometaEval(src);    
        this.assert(result.isLKParser, 'cannot create own js parser');
    },
    
    // does not belong here
    testEvalOmetaJs: function() {
        var src = "ometa Test {\n   test = '' -> true \n }";
        var result = OMetaSupport.ometaEval(src);
        this.assert(Object.isFunction(result.test), 'cannot eval ometa/js');
    },
    /* ------------- */
    
    testOptNl: function() {
        var string = '   \n';
        var result = this.sut.parse(string, 'optNl');
        this.assertEqual(result, '\n', 'no newline');
    },
    
    testKeywords: function() {
        var string = 'function() {\nthis.hallo()\n}';
        var result = this.sut.parse(string);
        this.assertTextStyle(result, {color: Color.red}, string.search('this')+1, 'this'.length);
    },
    
    testMultipleHighlightsInOneLine: function() {
        var string = 'function() {\nthis.hallo(x in this)\n}';
        var result = this.sut.parse(string);
        this.assertTextStyle(result, {color: Color.red}, string.search('this')+1, 'this'.length);
        this.assertTextStyle(result, {color: Color.red}, string.search('in')+1, 'in'.length);
        
        string = 'function() {\nthis.hallo("123")\n}';
        result = this.sut.parse(string);
        this.assertTextStyle(result, {color: Color.red}, string.search('this')+1, 'this'.length);
        this.assertTextStyle(result, {color: Color.green}, string.search('"123"')+1, '"123"'.length);
    },
    
    testRecognizeStrings: function() {
        var string = '\'aaa\'';
        var result = this.sut.parse(string, 'str');
        this.assertEqual(result, string, 'cannot recognize strings');
    },
    
    testRecognizeComments: function() {
        var string = '// this is a comment\n';
        var result = this.sut.parse(string, 'comment');
        this.assertEqual(result, '// this is a comment', 'cannot recognize comments');
    }
    
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
        var calcSrc = BSOMetaJSParser.matchAll(OmetaTest.ometaSampleInterpeter, "topLevel");
        var result = eval(BSOMetaJSTranslator.match(calcSrc, "trans"));
        this.assertEqual(result, 42);
    },
    
    testEvalOmeta: function() {
        this.assertEqual(OMetaSupport.ometaEval(OmetaTest.ometaSampleInterpeter), 42)
    }
});

OmetaTest.ometaSampleInterpeter = "        ometa Calc {  \n\
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

});