//(function() {

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
        var tree = BSOMetaJSParser.matchAll(s, "topLevel", undefined, undefined );
        this.assert(tree, " is defined");
        this.assertEqual(String(tree), "[begin, [binop, +, [number, 3], [number, 4]]]");
    },

    testBSOMetaJSTranslator: function() {
        var s = "3+ 4";    
        var tree = BSOMetaJSParser.matchAll(s, "topLevel", undefined, undefined);
        var result= BSOMetaJSTranslator.match(tree, "trans", undefined, undefined);
        this.assertEqual(String(result), "((3) + (4))");
    },
    testOmetaSampleInterpreter: function() {
        var s = ometaSampleInterpeter;
        tree = BSOMetaJSParser.matchAll(s, "topLevel", undefined, undefined);
        result= BSOMetaJSTranslator.match(tree, "trans", undefined, undefined);
        this.assertEqual(eval(String(result)), 42);
    }    
});


TestCase.subclass('OmetaWorkspaceTest', {
    setUp: function() {
        this.ws = new OmetaWorkspace();  
    },
    testEvalOmeta: function() {
        this.assertEqual(this.ws.evalOmeta(ometaSampleInterpeter), 42)
    }
    
});

//})();

