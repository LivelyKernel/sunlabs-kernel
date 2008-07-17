<html>
<body>
<!-- server side javascript -->

<javascript>


var command = ["svn"];

var args = request.props.getProperty("query.command");
command.push(args || "info");

var p = spawn(command);

var s = "";
if (request.props.getProperty("query.debug"))
    s += prettyPrintProplist(request.props);

"running " + command;
s += "<br>";
s += "exit value " + p.code;
s += "<br>";
if (p.code !== 0) s+= p.stderr.join("<br>"); else  s+= p.stdout.join("<br>");

s;


</javascript>
</body>
</html>
