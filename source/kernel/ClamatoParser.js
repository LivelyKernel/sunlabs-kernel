module('ClamatoParser.js').requires('ometa/parser.js','lively.ParserSupport').toRun(function() {
{ClamatoParser=Object.delegated(Parser,{"space":function(){var $elf=this;return $elf._or((function(){return Parser._superApplyWithArgs($elf,"space")}),(function(){return $elf._applyWithArgs("fromTo","\"","\"")}))},"identifier":function(){var $elf=this,x,xs;return (function(){x=$elf._apply("letter");xs=$elf._many(function(){return $elf._apply("letterOrDigit")});return [x].concat(xs).join("")})()},"unaryId":function(){var $elf=this,x;return (function(){$elf._apply("spaces");x=$elf._apply("identifier");$elf._not(function(){return $elf._applyWithArgs("exactly",":")});return x})()},"binaryOp":function(){var $elf=this,c,cs;return (function(){$elf._apply("spaces");cs=$elf._many1(function(){return (function(){c=$elf._apply("char");$elf._pred(ClamatoParser.isBinaryChar(c));return c})()});return cs.join("")})()},"keywordPart":function(){var $elf=this,x;return (function(){$elf._apply("spaces");x=$elf._apply("identifier");$elf._applyWithArgs("exactly",":");return (x + ":")})()},"variable":function(){var $elf=this,name;return (function(){$elf._apply("spaces");name=$elf._apply("identifier");return new StVariableNode(name)})()},"instanceVariable":function(){var $elf=this,name;return (function(){$elf._applyWithArgs("token","@");name=$elf._apply("identifier");return new StInstanceVariableNode(("@" + name))})()},"literal":function(){var $elf=this,v;return (function(){v=$elf._or((function(){return $elf._apply("stringLiteral")}),(function(){return $elf._apply("numberLiteral")}));return new StLiteralNode(v)})()},"numberLiteral":function(){var $elf=this,sign,ns;return (function(){sign=$elf._or((function(){return (function(){$elf._applyWithArgs("exactly","+");return (1)})()}),(function(){return (function(){$elf._applyWithArgs("exactly","-");return (-(1))})()}),(function(){return (function(){$elf._apply("empty");return (1)})()}));ns=$elf._many1(function(){return $elf._apply("digit")});return (sign * Number(ns.inject("",(function (num,ea){return (num + ea)}))))})()},"stringLiteral":function(){var $elf=this,val;return (function(){$elf._applyWithArgs("exactly","\'");val=$elf._many(function(){return $elf._or((function(){return (function(){$elf._applyWithArgs("token","\'\'");return "\'"})()}),(function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("exactly","\'")});return $elf._apply("char")})()}))});$elf._applyWithArgs("exactly","\'");return val.join("")})()},"primary":function(){var $elf=this,e;return (function(){$elf._apply("spaces");return $elf._or((function(){return $elf._apply("variable")}),(function(){return $elf._apply("instanceVariable")}),(function(){return $elf._apply("literal")}),(function(){return (function(){$elf._applyWithArgs("exactly","(");e=$elf._apply("expression");$elf._applyWithArgs("exactly",")");return e})()}),(function(){return $elf._apply("block")}))})()},"expression":function(){var $elf=this;return $elf._or((function(){return $elf._apply("cascade")}),(function(){return $elf._apply("assignment")}),(function(){return $elf._apply("evaluation")}))},"assignment":function(){var $elf=this,variable,value;return (function(){variable=$elf._or((function(){return $elf._apply("variable")}),(function(){return $elf._apply("instanceVariable")}));$elf._applyWithArgs("token",":=");value=$elf._apply("expression");return new StAssignmentNode(variable,value)})()},"cascade":function(){var $elf=this,first,msgNodes;return (function(){first=$elf._apply("evaluation");msgNodes=$elf._many1(function(){return (function(){$elf._applyWithArgs("token",";");return $elf._apply("message")})()});return (function (){if((!first["isMessage"])){throw new Error("First part of cascade not message")}else{undefined};var receiver=first["receiver"];msgNodes=[first].concat(msgNodes);msgNodes.forEach((function (ea){ea["receiver"]=receiver}));return new StCascadeNode(msgNodes,receiver)})()})()},"evaluation":function(){var $elf=this;return $elf._apply("keywordSend")},"message":function(){var $elf=this;return $elf._or((function(){return $elf._apply("keywordMsg")}),(function(){return $elf._apply("binaryMsg")}),(function(){return $elf._apply("unaryMsg")}))},"unarySend":function(){var $elf=this,rec,msgNodes;return (function(){rec=$elf._apply("primary");msgNodes=$elf._many(function(){return $elf._apply("unaryMsg")});return msgNodes.inject(rec,(function (receiver,node){node.setReceiver(receiver);return node}))})()},"unaryMsg":function(){var $elf=this,name;return (function(){name=$elf._apply("unaryId");return new StUnaryMessageNode(name,null,null)})()},"binarySend":function(){var $elf=this,rec,nodes;return (function(){rec=$elf._apply("unarySend");nodes=$elf._many(function(){return $elf._apply("binaryMsg")});return nodes.inject(rec,(function (receiver,node){node.setReceiver(receiver);return node}))})()},"binaryMsg":function(){var $elf=this,name,arg;return (function(){name=$elf._apply("binaryOp");arg=$elf._apply("unarySend");return new StBinaryMessageNode(name,[arg],null)})()},"keywordSend":function(){var $elf=this,rec,msgNode;return $elf._or((function(){return (function(){rec=$elf._apply("binarySend");msgNode=$elf._apply("keywordMsg");return (function (){msgNode.setReceiver(rec);return msgNode})()})()}),(function(){return $elf._apply("binarySend")}))},"keywordMsg":function(){var $elf=this,keyword,arg,partsAndArgs;return (function(){partsAndArgs=$elf._many1(function(){return (function(){keyword=$elf._apply("keywordPart");arg=$elf._apply("binarySend");return [keyword,arg]})()});return (function (){{var name="";var args=[]};partsAndArgs.forEach((function (ea){name+=ea[(0)];args.push(ea[(1)])}));return new StKeywordMessageNode(name,args,null)})()})()},"block":function(){var $elf=this,args,declared,s;return (function(){$elf._applyWithArgs("token","[");args=$elf._applyWithArgs("opt","blockArgs");declared=$elf._applyWithArgs("opt","declaredVars");s=$elf._applyWithArgs("opt","sequence");$elf._applyWithArgs("token","]");return new StInvokableNode(s,args,declared)})()},"blockArgs":function(){var $elf=this,v,vars;return (function(){vars=$elf._many1(function(){return (function(){$elf._applyWithArgs("token",":");v=$elf._apply("variable");return v})()});$elf._applyWithArgs("token","|");return vars})()},"sequence":function(){var $elf=this,e,children;return (function(){children=$elf._many1(function(){return (function(){e=$elf._apply("expression");$elf._or((function(){return $elf._applyWithArgs("token",".")}),(function(){return $elf._apply("empty")}));return e})()});return new StSequenceNode(children)})()},"declaredVars":function(){var $elf=this,v,vars;return (function(){$elf._applyWithArgs("token","|");vars=$elf._many(function(){return v=$elf._apply("variable")});$elf._applyWithArgs("token","|");return vars})()},"clamatoMethod":function(){var $elf=this,isMeta,nameAndArgs,methodNode;return (function(){$elf._apply("spaces");isMeta=$elf._or((function(){return (function(){$elf._applyWithArgs("exactly","-");return false})()}),(function(){return (function(){$elf._applyWithArgs("exactly","+");return true})()}));nameAndArgs=$elf._apply("methodNameAndArgs");methodNode=$elf._or((function(){return $elf._apply("primitiveBody")}),(function(){return $elf._apply("stMethodBody")}));return (function (){methodNode.setMethodName(nameAndArgs[(0)]);methodNode.setArgs(nameAndArgs[(1)]);methodNode.setMeta(isMeta);return methodNode})()})()},"stMethodBody":function(){var $elf=this,vars,seq;return (function(){vars=$elf._applyWithArgs("opt","declaredVars");seq=$elf._applyWithArgs("opt","sequence");return new StInvokableNode(seq,null,vars)})()},"primitiveBody":function(){var $elf=this,c,t,body;return (function(){$elf._applyWithArgs("token","{");$elf["count"]=(0);body=$elf._many(function(){return $elf._or((function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("exactly","}")});c=$elf._apply("char");return (function (){if((c == "{")){$elf["count"]++}else{undefined};return c})()})()}),(function(){return (function(){$elf._pred(($elf["count"] > (0)));t=$elf._applyWithArgs("token","}");return (function (){$elf["count"]--;return t})()})()}))});$elf._applyWithArgs("token","}");$elf._or((function(){return $elf._applyWithArgs("token",".")}),(function(){return $elf._apply("empty")}));return new StPrimitveMethodNode(null,null,null,(("{" + body.join("")) + "}"))})()},"methodNameAndArgs":function(){var $elf=this,keyword,arg,partsAndArgs,msgName,arg,msgName;return $elf._or((function(){return (function(){partsAndArgs=$elf._many1(function(){return (function(){keyword=$elf._apply("keywordPart");$elf._apply("spaces");arg=$elf._apply("identifier");return [keyword,arg]})()});return (function (){var name="";var args=[];partsAndArgs.forEach((function (ea){name+=ea[(0)];args.push(ea[(1)])}));return [name,args]})()})()}),(function(){return (function(){msgName=$elf._apply("binaryOp");$elf._apply("spaces");arg=$elf._apply("identifier");return [msgName,[arg]]})()}),(function(){return (function(){msgName=$elf._apply("unaryId");return [msgName,null]})()}))},"clamatoClass":function(){var $elf=this,name,methods;return (function(){$elf._applyWithArgs("token","<");name=$elf._apply("identifier");$elf._applyWithArgs("token",">");$elf._apply("spaces");methods=$elf._many(function(){return $elf._apply("clamatoMethod")});return new StClassNode(name,methods)})()},"clamatoClasses":function(){var $elf=this,cls;return (function(){cls=$elf._many(function(){return $elf._apply("clamatoClass")});$elf._apply("spaces");$elf._apply("end");return cls})()},"opt":function(){var $elf=this,rule;return (function(){rule=$elf._apply("anything");return $elf._or((function(){return $elf._applyWithArgs("apply",rule)}),(function(){return (function(){$elf._apply("empty");return null})()}))})()},"fromTo":function(){var $elf=this,x,y;return (function(){x=$elf._apply("anything");y=$elf._apply("anything");$elf._applyWithArgs("seq",x);$elf._many(function(){return (function(){$elf._not(function(){return $elf._applyWithArgs("seq",y)});return $elf._apply("char")})()});return $elf._applyWithArgs("seq",y)})()},"log":function(){var $elf=this,x;return (function(){x=$elf._apply("anything");return (function (){console.log(x);return true})()})()}});ClamatoParser["isBinaryChar"]=(function (c){var x=c.charCodeAt((0));return (((((((((((((((((x >= (1)) && (x <= (8))) || (x == (11))) || ((x >= (14)) && (x <= (29)))) || (x == (31))) || (x == (33))) || (x == (37))) || (x == (38))) || ((x >= (42)) && (x <= (45)))) || (x == (47))) || ((x >= (60)) && (x <= (64)))) || (x == (92))) || (x == (96))) || ((x >= (126)) && (x <= (191)))) || (x == (215))) || (x == (247))) || (x == (256)))});JS2StConverter=Object.delegated(OMeta,{"trans":function(){var $elf=this,t,ans;return (function(){$elf._form(function(){return (function(){t=$elf._apply("anything");return ans=$elf._applyWithArgs("apply",t)})()});return ans})()},"begin":function(){var $elf=this,x;return (function(){x=$elf._or((function(){return $elf._apply("trans")}),(function(){return $elf._apply("empty")}));$elf._apply("end");return x})()},"string":function(){var $elf=this,s;return (function(){s=$elf._apply("anything");return s})()},"json":function(){var $elf=this,props;return (function(){props=$elf._many(function(){return $elf._apply("trans")});return props})()},"this":function(){var $elf=this;return "self"},"number":function(){var $elf=this,n;return (function(){n=$elf._apply("anything");return new StLiteralNode(n)})()},"get":function(){var $elf=this,x;return (function(){x=$elf._apply("anything");return new StVariableNode(x)})()},"getp":function(){var $elf=this;return $elf._or((function(){return $elf._apply("getInstVar")}),(function(){return $elf._apply("getVarOfOtherObject")}))},"getInstVar":function(){var $elf=this,name,obj;return (function(){name=$elf._apply("trans");obj=$elf._apply("trans");$elf._pred((obj == "self"));return new StInstanceVariableNode(("@" + name))})()},"getVarOfOtherObject":function(){var $elf=this,fieldName,obj;return (function(){fieldName=$elf._apply("trans");obj=$elf._apply("trans");$elf._pred((obj != "self"));return new StKeywordMessageNode("getVar:",[new StLiteralNode(fieldName)],obj)})()},"binop":function(){var $elf=this,op,recv,arg;return (function(){op=$elf._apply("anything");recv=$elf._apply("trans");arg=$elf._apply("trans");return new StBinaryMessageNode(op,[arg],recv)})()},"send":function(){var $elf=this;return $elf._or((function(){return $elf._apply("classDef")}),(function(){return $elf._apply("normalSend")}))},"normalSend":function(){var $elf=this,name,recv,args;return (function(){name=$elf._apply("anything");recv=$elf._apply("trans");args=$elf._many(function(){return $elf._apply("trans")});return new StKeywordMessageNode((name + ":"),args,recv)})()},"classDef":function(){var $elf=this,msg,superclass,name,body;return (function(){msg=$elf._apply("anything");$elf._pred((msg == "subclass"));superclass=$elf._apply("trans");name=$elf._apply("trans");body=$elf._or((function(){return $elf._apply("trans")}),(function(){return (function(){$elf._apply("empty");return []})()}));return new StClassNode(name,body,superclass)})()},"func":function(){var $elf=this,args,body;return (function(){args=$elf._apply("anything");body=$elf._apply("trans");return new StInvokableNode(body,args,[])})()},"binding":function(){var $elf=this;return $elf._or((function(){return $elf._apply("methodBinding")}),(function(){return $elf._apply("instVarBinding")}))},"methodBinding":function(){var $elf=this,name,invokable;return (function(){name=$elf._apply("anything");invokable=$elf._apply("trans");$elf._pred(invokable["isBlock"]);return (function (){invokable.setMethodName(name);return invokable})()})()},"instVarBinding":function(){var $elf=this;return $elf._pred(false)},"test":function(){var $elf=this;return StClassNode}})}
});