<javascript>
// note this is brazil-specific
nl = "\n";

var command = ["svn"];

var args = Server.getQuery("command");
decodeURIComponent(args).split(' ').forEach(function(a) { command.push(a) });
command.length == 1 && command.push("info");

var p = Server.spawn(command);

var s = "";
if (Server.getQuery("debug") || true) { 
    s += Server.prettyPrintProplist(request.props);
    s += "running " + command +  nl + "exit value " + p.code + nl;
}
if (p.code !== 0) s+= p.stderr.join(nl); else  s+= p.stdout.join(nl);

s;

</javascript>
