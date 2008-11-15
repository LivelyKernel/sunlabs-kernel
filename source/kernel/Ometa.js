
module('Ometa.js').requires('ometa/ometa-base.js', 'ometa/parser.js', 'ometa/bs-ometa-compiler.js',
                            'ometa/bs-ometa-js-compiler.js', 'ometa/bs-js-compiler.js', 'ometa/bs-ometa-optimizer.js'
                            ).toRun(function() {
                                           
/*
    An Ometa Workspace like http://www.cs.ucla.edu/~awarth/ometa/.
    Uses Alessandro Warth OMeta-js 2 to evalute text. 
*/

OMetaSupport = {
    
    loadOmetaGrammarFromFile: function(fileName) {
        var src = OMetaSupport.fileContent(fileName);
        var grammar = OMetaSupport.ometaEval(src);
        return grammar;
    },
    
    translateToJs: function(src) {
        var ometaSrc = OMetaSupport.matchAllWithGrammar(BSOMetaJSParser, "topLevel", src);
        var jsSrc = OMetaSupport.matchWithGrammar(BSOMetaJSTranslator, "trans", ometaSrc);
        return jsSrc;
    },
    
    ometaEval: function(src) {
        var jsSrc = OMetaSupport.translateToJs(src);
        return eval(jsSrc);
    },
    
    matchAllWithGrammar: function(grammar, rule, src) {
        return grammar.matchAll(src, rule, null, OMetaSupport.handleError.curry(src));
    },
    
    matchWithGrammar: function(grammar, rule, src) {
        return grammar.match(src, rule, null, OMetaSupport.handleError.curry(src));
    },
    
    handleError: function(src, grammarInstance, errorIndex) {
        var charsBefore = 500;
        var charsAfter = 250;
        console.log('OMeta Error');
        var startIndex = Math.max(0, errorIndex - charsBefore);
        var stopIndex = Math.min(src.length, errorIndex + charsAfter);
        
        console.log(src.substring(startIndex, errorIndex) + '<--Error-->' + src.substring(errorIndex, stopIndex));
        console.log('Rules: ' + grammarInstance._ruleStack);
        Global.x = grammarInstance;
    },
    
    fileContent: function(fileName) {
        var url = URL.source.withFilename(fileName);
        var resource = new Resource(Record.newPlainInstance({URL: url, ContentText: null}));
        resource.fetch(true);
        return resource.getContentText();
    }
    
};

Widget.subclass('OmetaWorkspace', {
    
    defaultViewExtent: pt(400,250),
    
    buildView: function() {
        var panel =  PanelMorph.makePanedPanel(this.defaultViewExtent, [
                ['textPane', function (initialBounds){return new TextMorph(initialBounds)}, new Rectangle(0, 0, 1, 0.0)]]);
        panel.textPane.setExtent(this.defaultViewExtent);
        // override the standart eval function in this instance to evaluate Ometa Source instead of JavaScript
        panel.textPane.tryBoundEval = function (str) {
        	var result;
        	try { result = OMetaSupport.ometaEval(str); }
        	catch (e) { // this.world().alert("exception " + e);
        	    console.log('error evaling ometa: ' + e) };
        	return result;
         };
        return panel;
    }
    
});

/*
 * A sample OMeta Workspace with the simple interpreter from the OMeta-js Tutorial
 */
OmetaWorkspace.openOmetaWorkspace = function() {
    var w = new OmetaWorkspace(); 
	w.openIn(WorldMorph.current(), pt(540, 20));
	w.panel.textPane.setTextString("ometa Calc {  \n\
      digit    = super(#digit):d          -> digitValue(d),\n\
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
    Calc.matchAll('6*(4+3)', 'expr')");	
	return w
};

// Interface for using the parser. It would be better to extend the parser directly...

lively.Text.createText = function(str, style) {
    return new lively.Text.Text(str, style);
};

Object.subclass('SyntaxHighlighter', {

    parserSrcFileName: 'lk-js-parser.txt',
    
    _parserSrc: "ometa My <: Parser { \
        isLKParser  = ''                                                        -> true, \
\
    	nameFirst       = letter | '$' | '_', \
      	nameRest        = nameFirst | digit, \
      	iName           = firstAndRest(#nameFirst, #nameRest):r		            -> r.join(''), \
      	isKeyword :x    = ?BSJSParser._isKeyword(x), \
      	name            = iName:n ~isKeyword(n)								    -> n, \
 \
        spacesNoNl      = (~'\n' space)*										-> ' ', \
        sc              = spacesNoNl ('\n' | &'}' | end)						-> '<real  end>' \
                        | \";\"													-> '<end because of ; >', \
        srcElem         = \"function\" /*\"name\":n*/ funcRest:f                    -> { 'this is a fuction:' + f } \
                        | stmt:s												-> s, \
        funcRest        = '(' listOf(#formal, ','):fs ')' '{' srcElems:body '}' -> { fs + '<--->' + body}, \
        formal          = spaces:sps name:n								            -> { sps.join('') + n}, \
        srcElems        = srcElem*:ss                                           -> ss, \
        stmt            = something:sth                                         ->  { sth + '<END OF STMT>' }, \
       something        = (~sc anything)+:cs sc:end			                    ->  { cs.join('') + end } \
    };",
    
    initialize: function() {
        this.parser = Global.LKJSParser ? Global.LKJSParser : OMetaSupport.ometaEval(this.parserSrc());
    },
    
    parse: function(string, rule) {
        if (!rule) rule = 'srcElem';
        return this.parser.matchAll(string, rule);
    },
    
    highlightFunction: function(sourceString) {
        var attributedSrc = this.parse(sourceString);
        // var style = {style: 'bold', fontSize: 4, color: Color.red};
        // var t = new text.Text(attributedSrc, style);
        var t = attributedSrc;
        return t;
    },
    
    parserSrc: function() {
        var url = URL.source.withFilename(this.parserSrcFileName);
        var resource = new Resource(Record.newPlainInstance({URL: url, ContentText: null}));
        resource.fetch(true);
        return resource.getContentText();
    }
});

});