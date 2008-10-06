module('ometa/bs-js-compiler.js').requires('ometa/parser.js').toRun(function() {

{BSJSParser=Parser.delegated({"fromTo":function(){var $elf=this,x,y;return
(function(){x=$elf._apply("anything");y=$elf._apply("anything");$elf._applyWithArgs("seq",x);$elf._many(function(){return
(function(){$elf._not(function(){return $elf._applyWithArgs("seq",y)});return $elf._apply("char")})()});return
$elf._applyWithArgs("seq",y)})()},"space":function(){var $elf=this;return $elf._or((function(){return
Parser._superApplyWithArgs($elf,"space")}),(function(){return $elf._applyWithArgs("fromTo","//","\n")}),(function(){return
$elf._applyWithArgs("fromTo","/*","*/")}))},"nameFirst":function(){var $elf=this;return $elf._or((function(){return
$elf._apply("letter")}),(function(){return $elf._applyWithArgs("exactly","$")}),(function(){return
$elf._applyWithArgs("exactly","_")}))},"nameRest":function(){var $elf=this;return $elf._or((function(){return
$elf._apply("nameFirst")}),(function(){return $elf._apply("digit")}))},"iName":function(){var $elf=this,r;return
(function(){r=$elf._applyWithArgs("firstAndRest","nameFirst","nameRest");return r.join("")})()},"isKeyword":function(){var
$elf=this,x;return (function(){x=$elf._apply("anything");return $elf._pred(BSJSParser._isKeyword(x))})()},"name":function(){var
$elf=this,n;return (function(){n=$elf._apply("iName");$elf._not(function(){return $elf._applyWithArgs("isKeyword",n)});return ["name",((n
== "self")?"$elf":n)]})()},"keyword":function(){var $elf=this,k;return
(function(){k=$elf._apply("iName");$elf._applyWithArgs("isKeyword",k);return [k,k]})()},"number":function(){var $elf=this,ws,fs;return
(function(){ws=$elf._many1(function(){return $elf._apply("digit")});fs=$elf._or((function(){return
(function(){$elf._applyWithArgs("exactly",".");return $elf._many1(function(){return $elf._apply("digit")})})()}),(function(){return
(function(){$elf._apply("empty");return []})()}));return ["number",parseFloat(((ws.join("") + ".") +
fs.join("")))]})()},"escapeChar":function(){var $elf=this,c;return
(function(){$elf._applyWithArgs("exactly","\\");c=$elf._apply("char");return ometaUnescape(("\\" + c))})()},"str":function(){var
$elf=this,cs,cs,cs,n;return $elf._or((function(){return (function(){$elf._applyWithArgs("seq","\"\"\"");cs=$elf._many(function(){return
$elf._or((function(){return $elf._apply("escapeChar")}),(function(){return (function(){$elf._not(function(){return
$elf._applyWithArgs("seq","\"\"\"")});return $elf._apply("char")})()}))});$elf._applyWithArgs("seq","\"\"\"");return
["string",cs.join("")]})()}),(function(){return (function(){$elf._applyWithArgs("exactly","\'");cs=$elf._many(function(){return
$elf._or((function(){return $elf._apply("escapeChar")}),(function(){return (function(){$elf._not(function(){return
$elf._applyWithArgs("exactly","\'")});return $elf._apply("char")})()}))});$elf._applyWithArgs("exactly","\'");return
["string",cs.join("")]})()}),(function(){return (function(){$elf._applyWithArgs("exactly","\"");cs=$elf._many(function(){return
$elf._or((function(){return $elf._apply("escapeChar")}),(function(){return (function(){$elf._not(function(){return
$elf._applyWithArgs("exactly","\"")});return $elf._apply("char")})()}))});$elf._applyWithArgs("exactly","\"");return
["string",cs.join("")]})()}),(function(){return (function(){$elf._or((function(){return
$elf._applyWithArgs("exactly","#")}),(function(){return $elf._applyWithArgs("exactly","`")}));n=$elf._apply("iName");return
["string",n]})()}))},"special":function(){var $elf=this,s;return (function(){s=$elf._or((function(){return
$elf._applyWithArgs("exactly","(")}),(function(){return $elf._applyWithArgs("exactly",")")}),(function(){return
$elf._applyWithArgs("exactly","{")}),(function(){return $elf._applyWithArgs("exactly","}")}),(function(){return
$elf._applyWithArgs("exactly","[")}),(function(){return $elf._applyWithArgs("exactly","]")}),(function(){return
$elf._applyWithArgs("exactly",",")}),(function(){return $elf._applyWithArgs("exactly",";")}),(function(){return
$elf._applyWithArgs("exactly","?")}),(function(){return $elf._applyWithArgs("exactly",":")}),(function(){return
$elf._applyWithArgs("seq","!==")}),(function(){return $elf._applyWithArgs("seq","!=")}),(function(){return
$elf._applyWithArgs("seq","===")}),(function(){return $elf._applyWithArgs("seq","==")}),(function(){return
$elf._applyWithArgs("seq","=")}),(function(){return $elf._applyWithArgs("seq",">=")}),(function(){return
$elf._applyWithArgs("exactly",">")}),(function(){return $elf._applyWithArgs("seq","<=")}),(function(){return
$elf._applyWithArgs("exactly","<")}),(function(){return $elf._applyWithArgs("seq","++")}),(function(){return
$elf._applyWithArgs("seq","+=")}),(function(){return $elf._applyWithArgs("exactly","+")}),(function(){return
$elf._applyWithArgs("seq","--")}),(function(){return $elf._applyWithArgs("seq","-=")}),(function(){return
$elf._applyWithArgs("exactly","-")}),(function(){return $elf._applyWithArgs("seq","*=")}),(function(){return
$elf._applyWithArgs("exactly","*")}),(function(){return $elf._applyWithArgs("seq","/=")}),(function(){return
$elf._applyWithArgs("exactly","/")}),(function(){return $elf._applyWithArgs("seq","%=")}),(function(){return
$elf._applyWithArgs("exactly","%")}),(function(){return $elf._applyWithArgs("seq","&&=")}),(function(){return
$elf._applyWithArgs("seq","&&")}),(function(){return $elf._applyWithArgs("seq","||=")}),(function(){return
$elf._applyWithArgs("seq","||")}),(function(){return $elf._applyWithArgs("exactly",".")}),(function(){return
$elf._applyWithArgs("exactly","!")}));return [s,s]})()},"tok":function(){var $elf=this;return (function(){$elf._apply("spaces");return
$elf._or((function(){return $elf._apply("name")}),(function(){return $elf._apply("keyword")}),(function(){return
$elf._apply("number")}),(function(){return $elf._apply("str")}),(function(){return $elf._apply("special")}))})()},"toks":function(){var
$elf=this,ts;return (function(){ts=$elf._many(function(){return $elf._apply("token")});$elf._apply("spaces");$elf._apply("end");return
ts})()},"token":function(){var $elf=this,tt,t;return (function(){tt=$elf._apply("anything");t=$elf._apply("tok");$elf._pred((t[(0)] ==
tt));return t[(1)]})()},"spacesNoNl":function(){var $elf=this;return $elf._many(function(){return (function(){$elf._not(function(){return
$elf._applyWithArgs("exactly","\n")});return $elf._apply("space")})()})},"expr":function(){var
$elf=this,e,t,f,rhs,rhs,rhs,rhs,rhs,rhs,rhs,rhs;return (function(){e=$elf._apply("orExpr");return $elf._or((function(){return
(function(){$elf._applyWithArgs("token","?");t=$elf._apply("expr");$elf._applyWithArgs("token",":");f=$elf._apply("expr");return
["condExpr",e,t,f]})()}),(function(){return (function(){$elf._applyWithArgs("token","=");rhs=$elf._apply("expr");return
["set",e,rhs]})()}),(function(){return (function(){$elf._applyWithArgs("token","+=");rhs=$elf._apply("expr");return
["mset",e,"+",rhs]})()}),(function(){return (function(){$elf._applyWithArgs("token","-=");rhs=$elf._apply("expr");return
["mset",e,"-",rhs]})()}),(function(){return (function(){$elf._applyWithArgs("token","*=");rhs=$elf._apply("expr");return
["mset",e,"*",rhs]})()}),(function(){return (function(){$elf._applyWithArgs("token","/=");rhs=$elf._apply("expr");return
["mset",e,"/",rhs]})()}),(function(){return (function(){$elf._applyWithArgs("token","%=");rhs=$elf._apply("expr");return
["mset",e,"%",rhs]})()}),(function(){return (function(){$elf._applyWithArgs("token","&&=");rhs=$elf._apply("expr");return
["mset",e,"&&",rhs]})()}),(function(){return (function(){$elf._applyWithArgs("token","||=");rhs=$elf._apply("expr");return
["mset",e,"||",rhs]})()}),(function(){return (function(){$elf._apply("empty");return e})()}))})()},"orExpr":function(){var
$elf=this,x,y;return $elf._or((function(){return
(function(){x=$elf._apply("orExpr");$elf._applyWithArgs("token","||");y=$elf._apply("andExpr");return
["binop","||",x,y]})()}),(function(){return $elf._apply("andExpr")}))},"andExpr":function(){var $elf=this,x,y;return
$elf._or((function(){return (function(){x=$elf._apply("andExpr");$elf._applyWithArgs("token","&&");y=$elf._apply("eqExpr");return
["binop","&&",x,y]})()}),(function(){return $elf._apply("eqExpr")}))},"eqExpr":function(){var $elf=this,x,y,y,y,y;return
$elf._or((function(){return (function(){x=$elf._apply("eqExpr");return $elf._or((function(){return
(function(){$elf._applyWithArgs("token","==");y=$elf._apply("relExpr");return ["binop","==",x,y]})()}),(function(){return
(function(){$elf._applyWithArgs("token","!=");y=$elf._apply("relExpr");return ["binop","!=",x,y]})()}),(function(){return
(function(){$elf._applyWithArgs("token","===");y=$elf._apply("relExpr");return ["binop","===",x,y]})()}),(function(){return
(function(){$elf._applyWithArgs("token","!==");y=$elf._apply("relExpr");return ["binop","!==",x,y]})()}))})()}),(function(){return
$elf._apply("relExpr")}))},"relExpr":function(){var $elf=this,x,y,y,y,y,y;return $elf._or((function(){return
(function(){x=$elf._apply("relExpr");return $elf._or((function(){return
(function(){$elf._applyWithArgs("token",">");y=$elf._apply("addExpr");return ["binop",">",x,y]})()}),(function(){return
(function(){$elf._applyWithArgs("token",">=");y=$elf._apply("addExpr");return ["binop",">=",x,y]})()}),(function(){return
(function(){$elf._applyWithArgs("token","<");y=$elf._apply("addExpr");return ["binop","<",x,y]})()}),(function(){return
(function(){$elf._applyWithArgs("token","<=");y=$elf._apply("addExpr");return ["binop","<=",x,y]})()}),(function(){return
(function(){$elf._applyWithArgs("token","instanceof");y=$elf._apply("addExpr");return
["binop","instanceof",x,y]})()}))})()}),(function(){return $elf._apply("addExpr")}))},"addExpr":function(){var $elf=this,x,y,x,y;return
$elf._or((function(){return (function(){x=$elf._apply("addExpr");$elf._applyWithArgs("token","+");y=$elf._apply("mulExpr");return
["binop","+",x,y]})()}),(function(){return
(function(){x=$elf._apply("addExpr");$elf._applyWithArgs("token","-");y=$elf._apply("mulExpr");return
["binop","-",x,y]})()}),(function(){return $elf._apply("mulExpr")}))},"mulExpr":function(){var $elf=this,x,y,x,y,x,y;return
$elf._or((function(){return (function(){x=$elf._apply("mulExpr");$elf._applyWithArgs("token","*");y=$elf._apply("unary");return
["binop","*",x,y]})()}),(function(){return
(function(){x=$elf._apply("mulExpr");$elf._applyWithArgs("token","/");y=$elf._apply("unary");return
["binop","/",x,y]})()}),(function(){return
(function(){x=$elf._apply("mulExpr");$elf._applyWithArgs("token","%");y=$elf._apply("unary");return
["binop","%",x,y]})()}),(function(){return $elf._apply("unary")}))},"unary":function(){var $elf=this,p,p,p,p,p;return
$elf._or((function(){return (function(){$elf._applyWithArgs("token","-");p=$elf._apply("postfix");return
["unop","-",p]})()}),(function(){return (function(){$elf._applyWithArgs("token","+");p=$elf._apply("postfix");return
p})()}),(function(){return (function(){$elf._applyWithArgs("token","++");p=$elf._apply("postfix");return
["preop","++",p]})()}),(function(){return (function(){$elf._applyWithArgs("token","--");p=$elf._apply("postfix");return
["preop","--",p]})()}),(function(){return (function(){$elf._applyWithArgs("token","!");p=$elf._apply("unary");return
["unop","!",p]})()}),(function(){return $elf._apply("postfix")}))},"postfix":function(){var $elf=this,p;return
(function(){p=$elf._apply("primExpr");return $elf._or((function(){return
(function(){$elf._apply("spacesNoNl");$elf._applyWithArgs("token","++");return ["postop","++",p]})()}),(function(){return
(function(){$elf._apply("spacesNoNl");$elf._applyWithArgs("token","--");return ["postop","--",p]})()}),(function(){return
(function(){$elf._apply("empty");return p})()}))})()},"primExpr":function(){var $elf=this,p,i,m,as,f,as;return $elf._or((function(){return
(function(){p=$elf._apply("primExpr");return $elf._or((function(){return
(function(){$elf._applyWithArgs("token","[");i=$elf._apply("expr");$elf._applyWithArgs("token","]");return
["getp",i,p]})()}),(function(){return
(function(){$elf._applyWithArgs("token",".");m=$elf._applyWithArgs("token","name");$elf._applyWithArgs("token","(");as=$elf._applyWithArgs("listOf","expr",",");$elf._applyWithArgs("token",")");return
["send",m,p].concat(as)})()}),(function(){return (function(){$elf._applyWithArgs("token",".");f=$elf._applyWithArgs("token","name");return
["getp",["string",f],p]})()}),(function(){return
(function(){$elf._applyWithArgs("token","(");as=$elf._applyWithArgs("listOf","expr",",");$elf._applyWithArgs("token",")");return
["call",p].concat(as)})()}))})()}),(function(){return $elf._apply("primExprHd")}))},"primExprHd":function(){var
$elf=this,e,n,n,s,n,as,es;return $elf._or((function(){return
(function(){$elf._applyWithArgs("token","(");e=$elf._apply("expr");$elf._applyWithArgs("token",")");return e})()}),(function(){return
(function(){$elf._applyWithArgs("token","this");return ["this"]})()}),(function(){return
(function(){n=$elf._applyWithArgs("token","name");return ["get",n]})()}),(function(){return
(function(){n=$elf._applyWithArgs("token","number");return ["number",n]})()}),(function(){return
(function(){s=$elf._applyWithArgs("token","string");return ["string",s]})()}),(function(){return
(function(){$elf._applyWithArgs("token","function");return $elf._apply("funcRest")})()}),(function(){return
(function(){$elf._applyWithArgs("token","new");n=$elf._applyWithArgs("token","name");$elf._applyWithArgs("token","(");as=$elf._applyWithArgs("listOf","expr",",");$elf._applyWithArgs("token",")");return
["new",n].concat(as)})()}),(function(){return
(function(){$elf._applyWithArgs("token","[");es=$elf._applyWithArgs("listOf","expr",",");$elf._applyWithArgs("token","]");return
["arr"].concat(es)})()}),(function(){return $elf._apply("json")}))},"json":function(){var $elf=this,bs;return
(function(){$elf._applyWithArgs("token","{");bs=$elf._applyWithArgs("listOf","jsonBinding",",");$elf._applyWithArgs("token","}");return
["json"].concat(bs)})()},"jsonBinding":function(){var $elf=this,n,v;return
(function(){n=$elf._apply("jsonPropName");$elf._applyWithArgs("token",":");v=$elf._apply("expr");return
["binding",n,v]})()},"jsonPropName":function(){var $elf=this;return $elf._or((function(){return
$elf._applyWithArgs("token","name")}),(function(){return $elf._applyWithArgs("token","number")}),(function(){return
$elf._applyWithArgs("token","string")}))},"formal":function(){var $elf=this;return (function(){$elf._apply("spaces");return
$elf._applyWithArgs("token","name")})()},"funcRest":function(){var $elf=this,fs,body;return
(function(){$elf._applyWithArgs("token","(");fs=$elf._applyWithArgs("listOf","formal",",");$elf._applyWithArgs("token",")");$elf._applyWithArgs("token","{");body=$elf._apply("srcElems");$elf._applyWithArgs("token","}");return
["func",fs,body]})()},"sc":function(){var $elf=this;return $elf._or((function(){return (function(){$elf._apply("spacesNoNl");return
$elf._or((function(){return $elf._applyWithArgs("exactly","\n")}),(function(){return $elf._lookahead(function(){return
$elf._applyWithArgs("exactly","}")})}),(function(){return $elf._apply("end")}))})()}),(function(){return
$elf._applyWithArgs("token",";")}))},"binding":function(){var $elf=this,n,v;return
(function(){n=$elf._applyWithArgs("token","name");v=$elf._or((function(){return (function(){$elf._applyWithArgs("token","=");return
$elf._apply("expr")})()}),(function(){return (function(){$elf._apply("empty");return ["get","undefined"]})()}));return
["var",n,v]})()},"block":function(){var $elf=this,ss;return
(function(){$elf._applyWithArgs("token","{");ss=$elf._apply("srcElems");$elf._applyWithArgs("token","}");return
ss})()},"stmt":function(){var $elf=this,bs,c,t,f,c,s,s,c,i,c,u,s,n,v,e,s,e,c,cs,cs,cs,e,t,e,c,f,e,x,s,e;return $elf._or((function(){return
$elf._apply("block")}),(function(){return
(function(){$elf._applyWithArgs("token","var");bs=$elf._applyWithArgs("listOf","binding",",");$elf._apply("sc");return
["begin"].concat(bs)})()}),(function(){return
(function(){$elf._applyWithArgs("token","if");$elf._applyWithArgs("token","(");c=$elf._apply("expr");$elf._applyWithArgs("token",")");t=$elf._apply("stmt");f=$elf._or((function(){return
(function(){$elf._applyWithArgs("token","else");return $elf._apply("stmt")})()}),(function(){return
(function(){$elf._apply("empty");return ["get","undefined"]})()}));return ["if",c,t,f]})()}),(function(){return
(function(){$elf._applyWithArgs("token","while");$elf._applyWithArgs("token","(");c=$elf._apply("expr");$elf._applyWithArgs("token",")");s=$elf._apply("stmt");return
["while",c,s]})()}),(function(){return
(function(){$elf._applyWithArgs("token","do");s=$elf._apply("stmt");$elf._applyWithArgs("token","while");$elf._applyWithArgs("token","(");c=$elf._apply("expr");$elf._applyWithArgs("token",")");$elf._apply("sc");return
["doWhile",s,c]})()}),(function(){return
(function(){$elf._applyWithArgs("token","for");$elf._applyWithArgs("token","(");i=$elf._or((function(){return
(function(){$elf._applyWithArgs("token","var");return $elf._apply("binding")})()}),(function(){return
$elf._apply("expr")}),(function(){return (function(){$elf._apply("empty");return
["get","undefined"]})()}));$elf._applyWithArgs("token",";");c=$elf._or((function(){return $elf._apply("expr")}),(function(){return
(function(){$elf._apply("empty");return ["get","true"]})()}));$elf._applyWithArgs("token",";");u=$elf._or((function(){return
$elf._apply("expr")}),(function(){return (function(){$elf._apply("empty");return
["get","undefined"]})()}));$elf._applyWithArgs("token",")");s=$elf._apply("stmt");return ["for",i,c,u,s]})()}),(function(){return
(function(){$elf._applyWithArgs("token","for");$elf._applyWithArgs("token","(");v=$elf._or((function(){return
(function(){$elf._applyWithArgs("token","var");n=$elf._applyWithArgs("token","name");return
["var",n,["get","undefined"]]})()}),(function(){return
$elf._apply("expr")}));$elf._applyWithArgs("token","in");e=$elf._apply("expr");$elf._applyWithArgs("token",")");s=$elf._apply("stmt");return
["forIn",v,e,s]})()}),(function(){return
(function(){$elf._applyWithArgs("token","switch");$elf._applyWithArgs("token","(");e=$elf._apply("expr");$elf._applyWithArgs("token",")");$elf._applyWithArgs("token","{");cs=$elf._many(function(){return
$elf._or((function(){return
(function(){$elf._applyWithArgs("token","case");c=$elf._apply("expr");$elf._applyWithArgs("token",":");cs=$elf._apply("srcElems");return
["case",c,cs]})()}),(function(){return
(function(){$elf._applyWithArgs("token","default");$elf._applyWithArgs("token",":");cs=$elf._apply("srcElems");return
["default",cs]})()}))});$elf._applyWithArgs("token","}");return ["switch",e].concat(cs)})()}),(function(){return
(function(){$elf._applyWithArgs("token","break");$elf._apply("sc");return ["break"]})()}),(function(){return
(function(){$elf._applyWithArgs("token","continue");$elf._apply("sc");return ["continue"]})()}),(function(){return
(function(){$elf._applyWithArgs("token","throw");$elf._apply("spacesNoNl");e=$elf._apply("expr");$elf._apply("sc");return
["throw",e]})()}),(function(){return
(function(){$elf._applyWithArgs("token","try");t=$elf._apply("block");$elf._applyWithArgs("token","catch");$elf._applyWithArgs("token","(");e=$elf._applyWithArgs("token","name");$elf._applyWithArgs("token",")");c=$elf._apply("block");f=$elf._or((function(){return
(function(){$elf._applyWithArgs("token","finally");return $elf._apply("block")})()}),(function(){return
(function(){$elf._apply("empty");return ["get","undefined"]})()}));return ["try",t,e,c,f]})()}),(function(){return
(function(){$elf._applyWithArgs("token","return");e=$elf._or((function(){return $elf._apply("expr")}),(function(){return
(function(){$elf._apply("empty");return ["get","undefined"]})()}));$elf._apply("sc");return ["return",e]})()}),(function(){return
(function(){$elf._applyWithArgs("token","with");$elf._applyWithArgs("token","(");x=$elf._apply("expr");$elf._applyWithArgs("token",")");s=$elf._apply("stmt");return
["with",x,s]})()}),(function(){return (function(){e=$elf._apply("expr");$elf._apply("sc");return e})()}),(function(){return
(function(){$elf._applyWithArgs("token",";");return ["get","undefined"]})()}))},"srcElem":function(){var $elf=this,n,f;return
$elf._or((function(){return
(function(){$elf._applyWithArgs("token","function");n=$elf._applyWithArgs("token","name");f=$elf._apply("funcRest");return
["var",n,f]})()}),(function(){return $elf._apply("stmt")}))},"srcElems":function(){var $elf=this,ss;return
(function(){ss=$elf._many(function(){return $elf._apply("srcElem")});return ["begin"].concat(ss)})()},"topLevel":function(){var
$elf=this,r;return (function(){r=$elf._apply("srcElems");$elf._apply("spaces");$elf._apply("end");return
r})()},"curlySemAction":function(){var $elf=this,s,ss,r,r;return $elf._or((function(){return
(function(){$elf._applyWithArgs("token","{");ss=$elf._many1(function(){return
(function(){s=$elf._apply("srcElem");$elf._lookahead(function(){return $elf._apply("srcElem")});return
s})()});r=$elf._apply("expr");$elf._apply("sc");$elf._applyWithArgs("token","}");$elf._apply("spaces");return (function
(){ss.push(["return",r]);return ["call",["func",[],["begin"].concat(ss)]]})()})()}),(function(){return
(function(){$elf._applyWithArgs("token","{");r=$elf._apply("expr");$elf._applyWithArgs("token","}");$elf._apply("spaces");return
r})()}))},"semAction":function(){var $elf=this,r;return $elf._or((function(){return $elf._apply("curlySemAction")}),(function(){return
(function(){r=$elf._apply("primExpr");$elf._apply("spaces");return
r})()}))}});BSJSParser["keywords"]=({});keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","ometa"];for(var
idx=(0);(idx < keywords["length"]);idx++){BSJSParser["keywords"][keywords[idx]]=true}BSJSParser["_isKeyword"]=(function (k){return
(this["keywords"].hasProperty(k) && (!Object["prototype"].hasProperty(k)))});BSJSTranslator=OMeta.delegated({"trans":function(){var
$elf=this,t,ans;return (function(){$elf._form(function(){return (function(){t=$elf._apply("anything");return
ans=$elf._applyWithArgs("apply",t)})()});return ans})()},"curlyTrans":function(){var $elf=this,r,rs,r;return $elf._or((function(){return
(function(){$elf._form(function(){return (function(){$elf._applyWithArgs("exactly","begin");return
r=$elf._apply("curlyTrans")})()});return r})()}),(function(){return (function(){$elf._form(function(){return
(function(){$elf._applyWithArgs("exactly","begin");return rs=$elf._many(function(){return $elf._apply("trans")})})()});return (("{" +
rs.join(";")) + "}")})()}),(function(){return (function(){r=$elf._apply("trans");return (("{" + r) + "}")})()}))},"this":function(){var
$elf=this;return "this"},"break":function(){var $elf=this;return "break"},"continue":function(){var $elf=this;return
"continue"},"number":function(){var $elf=this,n;return (function(){n=$elf._apply("anything");return (("(" + n) +
")")})()},"string":function(){var $elf=this,s;return (function(){s=$elf._apply("anything");return
s.toProgramString()})()},"arr":function(){var $elf=this,xs;return (function(){xs=$elf._many(function(){return
$elf._apply("trans")});return (("[" + xs.join(",")) + "]")})()},"unop":function(){var $elf=this,op,x;return
(function(){op=$elf._apply("anything");x=$elf._apply("trans");return ((("(" + op) + x) + ")")})()},"getp":function(){var
$elf=this,fd,x;return (function(){fd=$elf._apply("trans");x=$elf._apply("trans");return (((x + "[") + fd) + "]")})()},"get":function(){var
$elf=this,x;return (function(){x=$elf._apply("anything");return x})()},"set":function(){var $elf=this,lhs,rhs;return
(function(){lhs=$elf._apply("trans");rhs=$elf._apply("trans");return ((lhs + "=") + rhs)})()},"mset":function(){var
$elf=this,lhs,op,rhs;return (function(){lhs=$elf._apply("trans");op=$elf._apply("anything");rhs=$elf._apply("trans");return (((lhs + op) +
"=") + rhs)})()},"binop":function(){var $elf=this,op,x,y;return
(function(){op=$elf._apply("anything");x=$elf._apply("trans");y=$elf._apply("trans");return (((((("(" + x) + " ") + op) + " ") + y) +
")")})()},"preop":function(){var $elf=this,op,x;return (function(){op=$elf._apply("anything");x=$elf._apply("trans");return (op +
x)})()},"postop":function(){var $elf=this,op,x;return (function(){op=$elf._apply("anything");x=$elf._apply("trans");return (x +
op)})()},"return":function(){var $elf=this,x;return (function(){x=$elf._apply("trans");return ("return " + x)})()},"with":function(){var
$elf=this,x,s;return (function(){x=$elf._apply("trans");s=$elf._apply("curlyTrans");return ((("with(" + x) + ")") +
s)})()},"if":function(){var $elf=this,cond,t,e;return
(function(){cond=$elf._apply("trans");t=$elf._apply("curlyTrans");e=$elf._apply("curlyTrans");return ((((("if(" + cond) + ")") + t) +
"else") + e)})()},"condExpr":function(){var $elf=this,cond,t,e;return
(function(){cond=$elf._apply("trans");t=$elf._apply("trans");e=$elf._apply("trans");return (((((("(" + cond) + "?") + t) + ":") + e) +
")")})()},"while":function(){var $elf=this,cond,body;return (function(){cond=$elf._apply("trans");body=$elf._apply("curlyTrans");return
((("while(" + cond) + ")") + body)})()},"doWhile":function(){var $elf=this,body,cond;return
(function(){body=$elf._apply("curlyTrans");cond=$elf._apply("trans");return (((("do" + body) + "while(") + cond) +
")")})()},"for":function(){var $elf=this,init,cond,upd,body;return
(function(){init=$elf._apply("trans");cond=$elf._apply("trans");upd=$elf._apply("trans");body=$elf._apply("curlyTrans");return
((((((("for(" + init) + ";") + cond) + ";") + upd) + ")") + body)})()},"forIn":function(){var $elf=this,x,arr,body;return
(function(){x=$elf._apply("trans");arr=$elf._apply("trans");body=$elf._apply("curlyTrans");return ((((("for(" + x) + " in ") + arr) + ")")
+ body)})()},"begin":function(){var $elf=this,x,x,xs;return $elf._or((function(){return
(function(){x=$elf._apply("trans");$elf._apply("end");return x})()}),(function(){return (function(){xs=$elf._many(function(){return
(function(){x=$elf._apply("trans");return $elf._or((function(){return (function(){$elf._or((function(){return $elf._pred((x[(x["length"] -
(1))] == "}"))}),(function(){return $elf._apply("end")}));return x})()}),(function(){return (function(){$elf._apply("empty");return (x +
";")})()}))})()});return (("{" + xs.join("")) + "}")})()}))},"func":function(){var $elf=this,args,body;return
(function(){args=$elf._apply("anything");body=$elf._apply("curlyTrans");return (((("(function (" + args.join(",")) + ")") + body) +
")")})()},"call":function(){var $elf=this,fn,args;return (function(){fn=$elf._apply("trans");args=$elf._many(function(){return
$elf._apply("trans")});return (((fn + "(") + args.join(",")) + ")")})()},"send":function(){var $elf=this,msg,recv,args;return
(function(){msg=$elf._apply("anything");recv=$elf._apply("trans");args=$elf._many(function(){return $elf._apply("trans")});return
(((((recv + ".") + msg) + "(") + args.join(",")) + ")")})()},"new":function(){var $elf=this,cls,args;return
(function(){cls=$elf._apply("anything");args=$elf._many(function(){return $elf._apply("trans")});return (((("new " + cls) + "(") +
args.join(",")) + ")")})()},"var":function(){var $elf=this,name,val;return
(function(){name=$elf._apply("anything");val=$elf._apply("trans");return ((("var " + name) + "=") + val)})()},"throw":function(){var
$elf=this,x;return (function(){x=$elf._apply("trans");return ("throw " + x)})()},"try":function(){var $elf=this,x,name,c,f;return
(function(){x=$elf._apply("curlyTrans");name=$elf._apply("anything");c=$elf._apply("curlyTrans");f=$elf._apply("curlyTrans");return
((((((("try " + x) + "catch(") + name) + ")") + c) + "finally") + f)})()},"json":function(){var $elf=this,props;return
(function(){props=$elf._many(function(){return $elf._apply("trans")});return (("({" + props.join(",")) +
"})")})()},"binding":function(){var $elf=this,name,val;return (function(){name=$elf._apply("anything");val=$elf._apply("trans");return
((name.toProgramString() + ": ") + val)})()},"switch":function(){var $elf=this,x,cases;return
(function(){x=$elf._apply("trans");cases=$elf._many(function(){return $elf._apply("trans")});return (((("switch(" + x) + "){") +
cases.join(";")) + "}")})()},"case":function(){var $elf=this,x,y;return (function(){x=$elf._apply("trans");y=$elf._apply("trans");return
((("case " + x) + ": ") + y)})()},"default":function(){var $elf=this,y;return (function(){y=$elf._apply("trans");return ("default: " +
y)})()}})}

});