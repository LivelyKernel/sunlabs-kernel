module('ClamatoParser.js').requires('ometa/parser.js').toRun(function() {
{ClamatoParser=Object.delegated(Parser,{"space":function(){var $elf=this;return $elf._or((function(){return Parser._superApplyWithArgs($elf,"space")}),(function(){return $elf._applyWithArgs("fromTo","\"","\"")}))},"identifier":function(){var $elf=this,x,xs;return (function(){x=$elf._apply("letter");xs=$elf._many(function(){return $elf._apply("letterOrDigit")});return [x].concat(xs).join("")})()},"unaryId":function(){var $elf=this,x;return (function(){$elf._apply("spaces");x=$elf._apply("identifier");$elf._not(function(){return $elf._applyWithArgs("exactly",":")});return x})()},"binaryOp":function(){var $elf=this,c,cs;return (function(){$elf._apply("spaces");cs=$elf._many1(function(){return (function(){c=$elf._apply("char");$elf._pred(ClamatoParser.isBinaryChar(c));return c})()});return cs.join("")})()},"keywordPart":function(){var $elf=this,x;return (function(){$elf._apply("spaces");x=$elf._apply("identifier");$elf._applyWithArgs("exactly",":");return (x + ":")})()},"variable":function(){var $elf=this,x;return (function(){$elf._apply("spaces");x=$elf._apply("identifier");return ({"isVariable": true,"name": x})})()},"instanceVariable":function(){var $elf=this,x;return (function(){$elf._applyWithArgs("token","@");x=$elf._apply("identifier");return ({"isVariable": true,"isInstance": true,"name": ("@" + x)})})()},"literal":function(){var $elf=this,v;return (function(){v=$elf._or((function(){return $elf._apply("stringLiteral")}),(function(){return $elf._apply("numberLiteral")}));return ({"isLiteral": true,"value": v})})()},"numberLiteral":function(){var $elf=this,sign,ns;return (function(){sign=$elf._or((function(){return (function(){$elf._applyWithArgs("exactly","+");return (1)})()}),(function(){return (function(){$elf._applyWithArgs("exactly","-");return (-(1))})()}),(function(){return (function(){$elf._apply("empty");return (1)})()}));ns=$elf._many1(function(){return $elf._apply("digit")});return (sign * Number(ns.inject("",(function (num,ea){return (num + ea)}))))})()},"stringLiteral":function(){var $elf=this,val;return (function(){$elf._applyWithArgs("exactly","\'");val=$elf._many(function(){return $elf._or((function(){return (function(){$elf._applyWithArgs("token","\'\'");return "\'"})()}),(function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("exactly","\'")});return $elf._apply("char")})()}))});$elf._applyWithArgs("exactly","\'");return val.join("")})()},"primary":function(){var $elf=this,e;return (function(){$elf._apply("spaces");return $elf._or((function(){return $elf._apply("variable")}),(function(){return $elf._apply("instanceVariable")}),(function(){return $elf._apply("literal")}),(function(){return (function(){$elf._applyWithArgs("exactly","(");e=$elf._apply("expression");$elf._applyWithArgs("exactly",")");return e})()}),(function(){return $elf._apply("block")}))})()},"expression":function(){var $elf=this;return $elf._or((function(){return $elf._apply("assignment")}),(function(){return $elf._apply("evaluation")}))},"assignment":function(){var $elf=this,vari,val;return (function(){vari=$elf._or((function(){return $elf._apply("variable")}),(function(){return $elf._apply("instanceVariable")}));$elf._applyWithArgs("token",":=");val=$elf._apply("expression");return ({"isAssignment": true,"variable": vari,"value": val})})()},"evaluation":function(){var $elf=this;return $elf._apply("keywordMsg")},"messageSend":function(){var $elf=this,node;return (function(){node=$elf._or((function(){return $elf._apply("unaryMsg")}),(function(){return $elf._apply("binaryMsg")}),(function(){return $elf._apply("keywordMsg")}));return (function (){node["isMessage"]=true;return node})()})()},"unaryMsg":function(){var $elf=this,rec,msgName,msgs;return (function(){rec=$elf._apply("primary");msgs=$elf._many(function(){return msgName=$elf._apply("unaryId")});return msgs.inject(rec,(function (receiver,mName){return ({"isMessage": true,"messageName": mName,"isUnary": true,"receiver": receiver})}))})()},"binaryMsg":function(){var $elf=this,rec,msgName,arg,msgs;return (function(){rec=$elf._apply("unaryMsg");msgs=$elf._many(function(){return (function(){msgName=$elf._apply("binaryOp");arg=$elf._apply("unaryMsg");return [msgName,[arg]]})()});return msgs.inject(rec,(function (receiver,mNameAndArgs){return ({"isMessage": true,"messageName": mNameAndArgs[(0)],"isBinary": true,"receiver": receiver,"args": mNameAndArgs[(1)]})}))})()},"keywordMsg":function(){var $elf=this,rec,keyword,arg,partsAndArgs;return $elf._or((function(){return (function(){rec=$elf._apply("binaryMsg");partsAndArgs=$elf._many1(function(){return (function(){keyword=$elf._apply("keywordPart");arg=$elf._apply("binaryMsg");return [keyword,arg]})()});return (function (){var name="";var args=[];partsAndArgs.forEach((function (ea){name+=ea[(0)];args.push(ea[(1)])}));return ({"isMessage": true,"messageName": name,"args": args,"isKeyword": true,"receiver": rec})})()})()}),(function(){return $elf._apply("binaryMsg")}))},"block":function(){var $elf=this,args,declared,s;return (function(){$elf._applyWithArgs("token","[");args=$elf._applyWithArgs("opt","blockArgs");declared=$elf._applyWithArgs("opt","declaredVars");s=$elf._applyWithArgs("opt","sequence");$elf._applyWithArgs("token","]");return ({"isBlock": true,"sequence": s,"args": args,"declaredVars": declared})})()},"blockArgs":function(){var $elf=this,v,vars;return (function(){vars=$elf._many1(function(){return (function(){$elf._applyWithArgs("token",":");v=$elf._apply("variable");return v})()});$elf._applyWithArgs("token","|");return vars})()},"sequence":function(){var $elf=this,e,exprs;return (function(){exprs=$elf._many1(function(){return (function(){e=$elf._apply("expression");$elf._or((function(){return $elf._applyWithArgs("token",".")}),(function(){return $elf._apply("empty")}));return e})()});return ({"isSequence": true,"children": exprs})})()},"declaredVars":function(){var $elf=this,v,vars;return (function(){$elf._applyWithArgs("token","|");vars=$elf._many(function(){return v=$elf._apply("variable")});$elf._applyWithArgs("token","|");return vars})()},"clamatoMethod":function(){var $elf=this,isMeta,nameAndArgs,methodNode;return (function(){$elf._apply("spaces");isMeta=$elf._or((function(){return (function(){$elf._applyWithArgs("exactly","-");return false})()}),(function(){return (function(){$elf._applyWithArgs("exactly","+");return true})()}));nameAndArgs=$elf._apply("methodNameAndArgs");methodNode=$elf._or((function(){return $elf._apply("primitiveBody")}),(function(){return $elf._apply("stMethodBody")}));return (function (){methodNode["isMethod"]=true;methodNode["methodName"]=nameAndArgs[(0)];methodNode["args"]=nameAndArgs[(1)];methodNode["isMeta"]=isMeta;return methodNode})()})()},"stMethodBody":function(){var $elf=this,vars,seq;return (function(){vars=$elf._applyWithArgs("opt","declaredVars");seq=$elf._applyWithArgs("opt","sequence");return ({"declaredVars": vars,"sequence": seq})})()},"primitiveBody":function(){var $elf=this,c,t,body;return (function(){$elf._applyWithArgs("token","{");$elf["count"]=(0);body=$elf._many(function(){return $elf._or((function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("exactly","}")});c=$elf._apply("char");return (function (){if((c == "{")){$elf["count"]++}else{undefined};return c})()})()}),(function(){return (function(){$elf._pred(($elf["count"] > (0)));t=$elf._applyWithArgs("token","}");return (function (){$elf["count"]--;return t})()})()}))});$elf._applyWithArgs("token","}");$elf._or((function(){return $elf._applyWithArgs("token",".")}),(function(){return $elf._apply("empty")}));return ({"isPrimitive": true,"primitiveBody": (("{" + body.join("")) + "}")})})()},"methodNameAndArgs":function(){var $elf=this,keyword,arg,partsAndArgs,msgName,arg,msgName;return $elf._or((function(){return (function(){partsAndArgs=$elf._many1(function(){return (function(){keyword=$elf._apply("keywordPart");$elf._apply("spaces");arg=$elf._apply("identifier");return [keyword,arg]})()});return (function (){var name="";var args=[];partsAndArgs.forEach((function (ea){name+=ea[(0)];args.push(ea[(1)])}));return [name,args]})()})()}),(function(){return (function(){msgName=$elf._apply("binaryOp");$elf._apply("spaces");arg=$elf._apply("identifier");return [msgName,[arg]]})()}),(function(){return (function(){msgName=$elf._apply("unaryId");return [msgName,null]})()}))},"clamatoClass":function(){var $elf=this,name,ms;return (function(){$elf._applyWithArgs("token","<");name=$elf._apply("identifier");$elf._applyWithArgs("token",">");$elf._apply("spaces");ms=$elf._many(function(){return $elf._apply("clamatoMethod")});return ({"isClass": true,"className": name,"methods": ms})})()},"clamatoClasses":function(){var $elf=this,cls;return (function(){cls=$elf._many(function(){return $elf._apply("clamatoClass")});$elf._apply("spaces");$elf._apply("end");return cls})()},"opt":function(){var $elf=this,rule;return (function(){rule=$elf._apply("anything");return $elf._or((function(){return $elf._applyWithArgs("apply",rule)}),(function(){return (function(){$elf._apply("empty");return null})()}))})()},"fromTo":function(){var $elf=this,x,y;return (function(){x=$elf._apply("anything");y=$elf._apply("anything");$elf._applyWithArgs("seq",x);$elf._many(function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("seq",y)});return $elf._apply("char")})()});return $elf._applyWithArgs("seq",y)})()},"log":function(){var $elf=this,x;return (function(){x=$elf._apply("anything");return (function (){console.log(x);return true})()})()}});ClamatoParser["isBinaryChar"]=(function (c){var x=c.charCodeAt((0));return (((((((((((((((((x >= (1)) && (x <= (8))) || (x == (11))) || ((x >= (14)) && (x <= (29)))) || (x == (31))) || (x == (33))) || (x == (37))) || (x == (38))) || ((x >= (42)) && (x <= (45)))) || (x == (47))) || ((x >= (60)) && (x <= (64)))) || (x == (92))) || (x == (96))) || ((x >= (126)) && (x <= (191)))) || (x == (215))) || (x == (247))) || (x == (256)))})}
});