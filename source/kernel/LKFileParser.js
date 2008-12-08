module('LKFileParser.js').requires('ometa/parser.js').toRun(function() {
{LKFileParser=Object.delegated(Parser,{"isLKParser":function(){var $elf=this;return true},"log":function(){var $elf=this,msg;return (function(){msg=$elf._apply("anything");return (function (){console.log(msg);return true})()})()},"logPos":function(){var $elf=this;return (function (){console.log($elf.pos());return true})()},"whereAreYou":function(){var $elf=this;return (function (){var charsBefore=(120);var charsAfter=(120);var src=$elf["_originalInput"];var startIndex=Math.max((0),($elf.pos() - charsBefore));var stopIndex=Math.min(src["length"],($elf.pos() + charsAfter));console.log(((src.substring(startIndex,$elf.pos()) + "<--I am here-->") + src.substring($elf.pos(),stopIndex)));console.log(("Rules: " + $elf["_ruleStack"]));console.log(("Stack: " + $elf["stack"]));return true})()},"fromTo":function(){var $elf=this,x,y,cs;return (function(){x=$elf._apply("anything");y=$elf._apply("anything");$elf._applyWithArgs("seq",x);cs=$elf._many(function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("seq",y)});return $elf._apply("char")})()});$elf._applyWithArgs("seq",y);return cs})()},"stackSize":function(){var $elf=this;return $elf["stack"]["length"]},"num":function(){var $elf=this,x;return (function(){x=$elf._apply("anything");return $elf["stack"].select((function (ea){return (ea === x)}))["length"]})()},"getStack":function(){var $elf=this;return $elf["stack"].clone()},"assignStack":function(){var $elf=this,s;return (function(){s=$elf._apply("anything");return $elf["stack"]=s})()},"startTime":function(){var $elf=this;return ({})},"stopTime":function(){var $elf=this,t;return (function(){t=$elf._apply("anything");return true})()},"open":function(){var $elf=this,x;return (function(){x=$elf._apply("anything");$elf._applyWithArgs("add",x);return x})()},"close":function(){var $elf=this,x,y;return (function(){x=$elf._apply("anything");y=$elf._apply("anything");$elf._applyWithArgs("add",y);$elf._applyWithArgs("remove",y);$elf._applyWithArgs("remove",x);return y})()},"add":function(){var $elf=this,x;return (function(){x=$elf._apply("anything");$elf._applyWithArgs("exactly",x);return $elf["stack"].push(x)})()},"remove":function(){var $elf=this,x;return (function(){x=$elf._apply("anything");return (function (){if(($elf["stack"]["length"] == (0))){$elf.whereAreYou();throw new Error(("Stack is empty, cannot remove " + x))}else{undefined};undefined;var rem=$elf["stack"].pop();if((rem !== x)){$elf.whereAreYou();throw new Error(((((((("Unmatched " + x) + "at: ") + $elf.pos()) + " instead found ") + rem) + "; stack: ") + $elf["stack"]))}else{undefined};undefined;return true})()})()},"everythingBut":function(){var $elf=this,x,y,a;return (function(){x=$elf._apply("anything");y=$elf._apply("anything");$elf._not(function(){return $elf._applyWithArgs("exactly",x)});$elf._not(function(){return $elf._applyWithArgs("exactly",y)});a=$elf._apply("anything");return a})()},"nonRecursive":function(){var $elf=this,x,y,s,a;return (function(){x=$elf._apply("anything");y=$elf._apply("anything");return $elf._or((function(){return (function(){s=$elf._apply("getStack");$elf._applyWithArgs("open",x);a=$elf._many(function(){return $elf._applyWithArgs("everythingBut",x,y)});$elf._applyWithArgs("close",x,y);return ((x + a.join("")) + y)})()}),(function(){return (function(){$elf._applyWithArgs("assignStack",s);return $elf._manualFail()})()}))})()},"recursive":function(){var $elf=this,x,y,s,a;return (function(){x=$elf._apply("anything");y=$elf._apply("anything");return $elf._or((function(){return (function(){s=$elf._apply("getStack");$elf._applyWithArgs("open",x);a=$elf._many(function(){return $elf._or((function(){return $elf._applyWithArgs("everythingBut",x,y)}),(function(){return $elf._applyWithArgs("recursive",x,y)}))});$elf._applyWithArgs("close",x,y);return ((x + a.join("")) + y)})()}),(function(){return (function(){$elf._applyWithArgs("assignStack",s);return $elf._manualFail()})()}))})()},"chunk":function(){var $elf=this,x,y,a;return (function(){x=$elf._apply("anything");y=$elf._apply("anything");a=$elf._applyWithArgs("basicChunk",x,y);return a})()},"somethingRelated":function(){var $elf=this;return (function(){$elf._not(function(){return $elf._apply("end")});return $elf._many(function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("exactly","\n")});$elf._not(function(){return $elf._applyWithArgs("exactly","\r")});$elf._not(function(){return $elf._applyWithArgs("exactly",";")});return $elf._apply("anything")})()})})()},"somethingBigRelated":function(){var $elf=this;return (function(){$elf._not(function(){return $elf._apply("end")});return $elf._many(function(){return $elf._or((function(){return $elf._applyWithArgs("chunk","(",")")}),(function(){return $elf._applyWithArgs("chunk","{","}")}),(function(){return $elf._applyWithArgs("chunk","[","]")}),(function(){return $elf._applyWithArgs("chunk","\'","\'")}),(function(){return $elf._applyWithArgs("chunk","\"","\"")}),(function(){return (function(){$elf._apply("spacesNoNl");$elf._applyWithArgs("exactly","+");return $elf._apply("spaces")})()}),(function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("exactly",",")});$elf._not(function(){return $elf._applyWithArgs("exactly",";")});$elf._not(function(){return $elf._applyWithArgs("exactly","(")});$elf._not(function(){return $elf._applyWithArgs("exactly","{")});$elf._not(function(){return $elf._applyWithArgs("exactly","[")});$elf._not(function(){return $elf._applyWithArgs("exactly","\'")});$elf._not(function(){return $elf._applyWithArgs("exactly","\"")});$elf._not(function(){return $elf._apply("nl")});return $elf._apply("anything")})()}))})})()},"defEnd":function(){var $elf=this;return $elf._or((function(){return (function(){$elf._applyWithArgs("exactly",";");return $elf._applyWithArgs("exactly","\n")})()}),(function(){return (function(){$elf._applyWithArgs("exactly",";");return $elf._apply("spacesNoNl")})()}),(function(){return $elf._applyWithArgs("token","")}))},"classElemDefEnd":function(){var $elf=this;return $elf._or((function(){return $elf._applyWithArgs("token",",")}),(function(){return $elf._applyWithArgs("token","")}))},"space":function(){var $elf=this;return $elf._or((function(){return Parser._superApplyWithArgs($elf,"space")}),(function(){return $elf._applyWithArgs("fromTo","//","\n")}),(function(){return $elf._applyWithArgs("fromTo","/*","*/")}))},"nl":function(){var $elf=this;return $elf._or((function(){return $elf._applyWithArgs("exactly","\n")}),(function(){return (function(){$elf._applyWithArgs("exactly","\r");return "\n"})()}))},"spacesNoNl":function(){var $elf=this,spcs;return (function(){spcs=$elf._many(function(){return (function(){$elf._not(function(){return $elf._apply("nl")});return $elf._apply("space")})()});return spcs})()},"nameFirst":function(){var $elf=this;return $elf._or((function(){return $elf._apply("letter")}),(function(){return $elf._applyWithArgs("exactly","$")}),(function(){return $elf._applyWithArgs("exactly","_")}))},"nameRest":function(){var $elf=this;return $elf._or((function(){return $elf._apply("nameFirst")}),(function(){return $elf._apply("digit")}))},"iName":function(){var $elf=this,r;return (function(){r=$elf._applyWithArgs("firstAndRest","nameFirst","nameRest");return r.join("")})()},"isKeyword":function(){var $elf=this,x;return (function(){x=$elf._apply("anything");return $elf._pred(BSJSParser._isKeyword(x))})()},"name":function(){var $elf=this,n;return (function(){n=$elf._apply("iName");return n})()},"keyword":function(){var $elf=this,k;return (function(){k=$elf._apply("iName");$elf._applyWithArgs("isKeyword",k);return k})()},"namespaceIdSplitted":function(){var $elf=this,n,r,n;return $elf._or((function(){return (function(){n=$elf._apply("name");$elf._applyWithArgs("exactly",".");r=$elf._apply("namespaceIdSplitted");return [n].concat(r)})()}),(function(){return (function(){n=$elf._apply("name");return [n]})()}))},"namespaceId":function(){var $elf=this,nArr;return (function(){nArr=$elf._apply("namespaceIdSplitted");return nArr.join(".")})()},"nsFollowedBy":function(){var $elf=this,x,nArr;return (function(){x=$elf._apply("anything");nArr=$elf._apply("namespaceIdSplitted");$elf._pred((nArr.last() === x));return nArr.slice((0),(nArr["length"] - (1))).join(".")})()},"nsWith":function(){var $elf=this,x,nArr;return (function(){x=$elf._apply("anything");nArr=$elf._apply("namespaceIdSplitted");$elf._pred(nArr.include(x));return (function (){var i=nArr.indexOf(x);return ({"before": nArr.slice((0),i).join("."),"after": nArr.slice((i + (1)),nArr["length"]).join(".")})})()})()},"basicFunction":function(){var $elf=this,n;return (function(){$elf._applyWithArgs("token","function");$elf._apply("spaces");$elf._or((function(){return n=$elf._apply("name")}),(function(){return $elf._applyWithArgs("token","")}));$elf._applyWithArgs("chunk","(",")");$elf._apply("spaces");$elf._applyWithArgs("chunk","{","}");return n})()},"func":function(){var $elf=this,fn,fn;return $elf._or((function(){return fn=$elf._apply("basicFunction")}),(function(){return (function(){$elf._applyWithArgs("token","var");$elf._many1(function(){return $elf._apply("space")});fn=$elf._apply("name");$elf._apply("spaces");$elf._applyWithArgs("exactly","=");$elf._apply("spaces");$elf._apply("basicFunction");return fn})()}))},"functionDef":function(){var $elf=this,p,fn;return (function(){p=$elf._apply("pos");fn=$elf._apply("func");$elf._apply("defEnd");return $elf._fragment(fn,"functionDef",p,($elf.pos() - (1)))})()},"executedFuncDef":function(){var $elf=this,s,p,fn;return (function(){s=$elf._apply("stackSize");p=$elf._apply("pos");$elf._applyWithArgs("exactly","(");fn=$elf._apply("basicFunction");$elf._applyWithArgs("exactly",")");$elf._apply("somethingRelated");$elf._apply("defEnd");$elf._pred((s == $elf["stack"]["length"]));return $elf._fragment(fn,"executedFuncDef",p,($elf.pos() - (1)))})()},"staticFuncDef":function(){var $elf=this,p,nsArr;return (function(){p=$elf._apply("pos");nsArr=$elf._apply("namespaceIdSplitted");$elf._pred((nsArr["length"] > (1)));$elf._apply("spaces");$elf._applyWithArgs("exactly","=");$elf._apply("spaces");$elf._apply("basicFunction");$elf._apply("defEnd");return $elf._fragment(nsArr.last(),"staticFuncDef",p,($elf.pos() - (1)),null,({"klassName": nsArr.slice((0),(nsArr["length"] - (1))).join(".")}))})()},"wrapEnd":function(){var $elf=this;return (function(){$elf._applyWithArgs("token",".wrap");return $elf._applyWithArgs("chunk","(",")")})()},"methodDefWithSpcs":function(){var $elf=this,mD;return (function(){$elf._apply("spaces");mD=$elf._apply("methodDef");$elf._apply("classElemDefEnd");return mD})()},"methodDef":function(){var $elf=this,p,mName;return (function(){p=$elf._apply("pos");mName=$elf._apply("name");$elf._applyWithArgs("exactly",":");$elf._apply("spaces");$elf._apply("basicFunction");$elf._or((function(){return $elf._apply("somethingBigRelated")}),(function(){return $elf._applyWithArgs("token","")}));$elf._apply("classElemDefEnd");return $elf._fragment(mName,"methodDef",p,($elf.pos() - (1)))})()},"methodModificationDef":function(){var $elf=this,p,spec;return (function(){p=$elf._apply("pos");spec=$elf._applyWithArgs("nsWith","prototype");$elf._apply("spaces");$elf._applyWithArgs("exactly","=");$elf._apply("spaces");$elf._apply("somethingBigRelated");$elf._apply("defEnd");return $elf._fragment(spec["after"],"methodModificationDef",p,($elf.pos() - (1)),null,({"klassName": spec["before"]}))})()},"propertyDefWithSpcs":function(){var $elf=this,pD;return (function(){$elf._apply("spaces");pD=$elf._apply("propertyDef");$elf._apply("spaces");return pD})()},"propertyDef":function(){var $elf=this,s,p,pName;return (function(){s=$elf._apply("stackSize");p=$elf._apply("pos");pName=$elf._apply("name");$elf._applyWithArgs("exactly",":");$elf._apply("spaces");$elf._not(function(){return $elf._applyWithArgs("token","function")});$elf._apply("somethingBigRelated");$elf._apply("classElemDefEnd");return (function (){if(($elf["stack"]["length"] !== s)){throw new Error(((((("sth wrong with the stack: " + $elf["stack"]) + " expected length: ") + s) + " actual length: ") + $elf["stack"]["length"]))}else{undefined};undefined;return $elf._fragment(pName,"propertyDef",p,($elf.pos() - (1)))})()})()},"classElems":function(){var $elf=this,a;return (function(){$elf._applyWithArgs("exactly","{");$elf._apply("spaces");a=$elf._many(function(){return $elf._or((function(){return $elf._apply("methodDefWithSpcs")}),(function(){return $elf._apply("propertyDefWithSpcs")}))});$elf._apply("spaces");$elf._applyWithArgs("exactly","}");return a})()},"restKlassDef":function(){var $elf=this,descriptors,trait,descriptors,trait;return $elf._or((function(){return (function(){$elf._applyWithArgs("exactly",",");$elf._apply("spaces");descriptors=$elf._apply("classElems");return ({"classElems": descriptors})})()}),(function(){return (function(){$elf._applyWithArgs("exactly",",");$elf._apply("spaces");trait=$elf._apply("klass");$elf._applyWithArgs("exactly",",");$elf._apply("spaces");descriptors=$elf._apply("classElems");return ({"trait": trait,"classElems": descriptors})})()}),(function(){return (function(){$elf._applyWithArgs("exactly",",");trait=$elf._apply("klassName");return ({"trait": trait,"classElems": []})})()}),(function(){return (function(){$elf._apply("spacesNoNl");return ({"classElems": []})})()}))},"klass":function(){var $elf=this;return $elf._apply("namespaceId")},"klassName":function(){var $elf=this,n;return (function(){$elf._apply("spaces");$elf._or((function(){return $elf._applyWithArgs("exactly","\'")}),(function(){return $elf._applyWithArgs("exactly","\"")}));n=$elf._apply("klass");$elf._or((function(){return $elf._applyWithArgs("exactly","\'")}),(function(){return $elf._applyWithArgs("exactly","\"")}));$elf._apply("spaces");return n})()},"klassDef":function(){var $elf=this,p,sName,kName,spec;return (function(){p=$elf._apply("pos");sName=$elf._applyWithArgs("nsFollowedBy","subclass");$elf._applyWithArgs("exactly","(");kName=$elf._apply("klassName");spec=$elf._apply("restKlassDef");$elf._applyWithArgs("exactly",")");$elf._apply("defEnd");return (function (){spec["classElems"].forEach((function (ea){ea["className"]=kName}));return $elf._fragment(kName,"klassDef",p,($elf.pos() - (1)),spec["classElems"],({"trait": spec["trait"],"superclassName": sName}))})()})()},"basicKlassExt":function(){var $elf=this,n,spec,n,n,clElems;return $elf._or((function(){return (function(){$elf._applyWithArgs("token","Object.extend");$elf._applyWithArgs("exactly","(");n=$elf._apply("klass");spec=$elf._apply("restKlassDef");$elf._applyWithArgs("exactly",")");return (function (){spec["classElems"].forEach((function (ea){ea["className"]=n}));return ({"name": n,"trait": spec["trait"],"subElements": spec["classElems"]})})()})()}),(function(){return (function(){$elf._or((function(){return n=$elf._applyWithArgs("nsFollowedBy","addMethods")}),(function(){return n=$elf._applyWithArgs("nsFollowedBy","addProperties")}));$elf._applyWithArgs("exactly","(");clElems=$elf._apply("classElems");$elf._applyWithArgs("exactly",")");return (function (){clElems.forEach((function (ea){ea["className"]=n}));return ({"name": n,"subElements": clElems})})()})()}))},"klassExtensionDef":function(){var $elf=this,p,spec;return (function(){p=$elf._apply("pos");spec=$elf._apply("basicKlassExt");$elf._apply("defEnd");return $elf._fragment((spec["name"] + " (extension)"),"klassExtensionDef",p,($elf.pos() - (1)),spec["subElements"],({"trait": spec["trait"]}))})()},"restObjDef":function(){var $elf=this,propsAndMethodDescrs;return (function(){propsAndMethodDescrs=$elf._apply("classElems");$elf._apply("spaces");return propsAndMethodDescrs})()},"objectDef":function(){var $elf=this,p,o,o,propsAndMethodDescrs;return (function(){p=$elf._apply("pos");$elf._or((function(){return (function(){$elf._applyWithArgs("token","var");$elf._apply("spaces");return o=$elf._apply("namespaceId")})()}),(function(){return o=$elf._apply("namespaceId")}));$elf._apply("spaces");$elf._applyWithArgs("exactly","=");$elf._apply("spaces");propsAndMethodDescrs=$elf._apply("restObjDef");$elf._apply("defEnd");return $elf._fragment(o,"objectDef",p,($elf.pos() - (1)),propsAndMethodDescrs)})()},"ometaParameter":function(){var $elf=this,n;return (function(){$elf._applyWithArgs("exactly",":");n=$elf._apply("name");$elf._apply("spaces");return n})()},"ometaParameters":function(){var $elf=this;return $elf._many(function(){return $elf._apply("ometaParameter")})},"ometaRuleDef":function(){var $elf=this,p,n,a,body;return (function(){p=$elf._apply("pos");n=$elf._apply("name");$elf._apply("spaces");a=$elf._apply("ometaParameters");$elf._or((function(){return $elf._applyWithArgs("exactly","=")}),(function(){return $elf._applyWithArgs("token","->")}));body=$elf._many(function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("exactly",",")});return $elf._apply("anything")})()});$elf._or((function(){return $elf._applyWithArgs("exactly",",")}),(function(){return $elf._applyWithArgs("token","")}));return (function (){var m=({"parameters": a});return $elf._fragment(n,"ometaDef",p,($elf.pos() - (1)),[],m)})()})()},"ometaInherit":function(){var $elf=this,sn;return $elf._or((function(){return (function(){$elf._applyWithArgs("token","<:");$elf._apply("spaces");sn=$elf._apply("name");return sn})()}),(function(){return (function(){$elf._applyWithArgs("token","");return null})()}))},"ometaDef":function(){var $elf=this,p,n,sn,d;return (function(){p=$elf._apply("pos");$elf._applyWithArgs("token","ometa");$elf._apply("spaces");n=$elf._apply("name");$elf._apply("space");sn=$elf._apply("ometaInherit");$elf._apply("spaces");$elf._applyWithArgs("exactly","{");d=$elf._many(function(){return $elf._apply("ometaRuleDef")});$elf._applyWithArgs("exactly","}");return (function (){var m=({"superclassName": sn});return $elf._fragment(n,"ometaDef",p,($elf.pos() - (1)),d,m)})()})()},"comment":function(){var $elf=this,p;return (function(){p=$elf._apply("pos");$elf._many1(function(){return $elf._apply("space")});return $elf._fragment(null,"comment",p,($elf.pos() - (1)))})()},"newline":function(){var $elf=this,p;return (function(){p=$elf._apply("pos");$elf._or((function(){return $elf._applyWithArgs("exactly","\n")}),(function(){return $elf._applyWithArgs("exactly","\r")}));return $elf._fragment(null,"newline",p,($elf.pos() - (1)))})()},"blankLine":function(){var $elf=this,p,c;return (function(){p=$elf._apply("pos");$elf._or((function(){return $elf._apply("nl")}),(function(){return (function(){$elf._many(function(){return (function(){c=$elf._apply("char");return $elf._pred((c.charCodeAt((0)) === (32)))})()});return $elf._apply("nl")})()}));return $elf._fragment(null,"blankLine",p,($elf.pos() - (1)))})()},"unknown":function(){var $elf=this,p;return (function(){p=$elf._apply("pos");$elf._apply("somethingBigRelated");$elf._apply("defEnd");return $elf._fragment(null,"unknown",p,($elf.pos() - (1)))})()}});LKFileParser["stack"]=[];LKFileParser["_manualFail"]=(function (){throw Global["fail"]});LKFileParser["_fragment"]=(function (name,type,startIndex,stopIndex,subElems,custom){var klass=lively["ide"]["FileFragment"];var f=new klass(name,type,startIndex,stopIndex,null,null,subElems);if((!custom)){return f}else{undefined};Object.extend(f,custom);return f});LKFileParser}
});