module('ometa/bs-ometa-js-compiler.js').requires('ometa/bs-ometa-compiler.js', 'ometa/bs-js-compiler.js').toRun( function() {
    
{BSOMetaJSParser=BSJSParser.delegated();BSOMetaJSParser['srcElem']=function() {var $elf=this,r;return $elf._or((function(){return (function(){$elf._apply("spaces");r=$elf._applyWithArgs("foreign", BSOMetaParser, "grammar");$elf._apply("sc");return r})()}),(function(){return BSJSParser._superApplyWithArgs($elf,"srcElem")}))};BSOMetaJSParser.prototype=BSOMetaJSParser;;BSOMetaJSTranslator=BSJSTranslator.delegated();BSOMetaJSTranslator['Grammar']=function() {var $elf=this;return $elf._applyWithArgs("foreign", BSOMetaTranslator, "Grammar")};BSOMetaJSTranslator.prototype=BSOMetaJSTranslator;}

});