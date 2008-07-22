// small library of serverside code, currently dependent on rhino


this.window = this;

load('trunk/source/kernel/miniprototype.js');
load('trunk/source/kernel/JSON.js');

var nl = '\n';
// var nl = "<br />\n";
this.Server = {};
Object.extend(Server, {
    spawn: function(command) {
	var proc = java.lang.Runtime.getRuntime().exec(command);
	var stdout = readAllLines(proc.getInputStream());
	proc.getInputStream().close();
	var stderr = readAllLines(proc.getErrorStream());
	proc.getErrorStream().close();
	
	proc.waitFor();
	return {stdout: stdout, stderr: stderr, code: proc.exitValue()};
    },


    proplistToObject: function(props) {
	var result = {};
	for (var e = props.keys(); e.hasMoreElements(); ) {
	    var key = e.nextElement();
	    result[key] = props.getProperty(key);
	}
	return result;
    },

    prettyPrintProplist: function(props) {
	var obj = this.proplistToObject(props);
	return Object.keys(obj).map(function(key) { return key + ":" + obj[key]; }).join(nl);
    },

    parseProps: function(props, line) {
	var parts = line.match("([^:]*):(.*)");
	if (!parts) {
	    //print('empty line'); 
	    return null;
	}
	// print('processing prop ' + parts[1]);
	props[parts[1]] = parts[2];
    },

    getQuery: function(key) {
	return request.props.getProperty("query." + key);
    }
});

