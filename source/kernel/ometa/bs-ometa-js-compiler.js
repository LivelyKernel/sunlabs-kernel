module('ometa/bs-ometa-js-compiler.js').requires('ometa/bs-ometa-compiler.js', 'ometa/bs-js-compiler.js').toRun( function() {
{BSOMetaJSParser=Object.delegated(BSJSParser,{
"srcElem":function(){var $elf=this,r;return $elf._or((function(){return (function(){$elf._apply("spaces");r=$elf._applyWithArgs("foreign",BSOMetaParser,'grammar');$elf._apply("sc");return r})()}),(function(){return BSJSParser._superApplyWithArgs($elf,'srcElem')}))}});BSOMetaJSTranslator=Object.delegated(BSJSTranslator,{
"Grammar":function(){var $elf=this;return $elf._applyWithArgs("foreign",BSOMetaTranslator,'Grammar')}})}
});