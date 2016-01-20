#!/usr/bin/env node

var childProcess = require("child_process");
var fs = require("fs");

var startMcServer = (process.argv.indexOf("--no-server") === -1)
var conf = JSON.parse(fs.readFileSync("conf.json"));

function startMCServer() {
	var self = {};

	var child = childProcess.spawn(__dirname+"/mc/init.sh", {
		cwd: __dirname+"/mc"
	});
	child.on("error", function(err) {
		throw err;
	});
	child.stdout.pipe(process.stdout);
	child.stderr.pipe(process.stderr);

	child.on("exit", function(code) {
		if (mcServer.autoRestart) {
			console.log("MC server exited with code "+code+". Restarting...");
			mcServer.process = startMCServer();
		} else {
			process.exit(code);
		}
	});

	return child;
}

var mcServer;
if (startMcServer) {
	mcServer = {
		process: startMCServer(),
		autoRestart: true
	}
}

if (startMcServer) {
	process.stdin.on("data", function(data) {
		var str = data.toString("utf8");
		console.log(str);

		var match = str.match(/^\s*([a-zA-Z0-9_\-]+)(\s+.+)?/);
		if (match === null)
			return;

		var cmd = match[1];
		var args = (match[2] || "").trim().split(/\s+/);

		switch (cmd) {
		case "stop":
			mcServer.autoRestart = false;
			mcServer.process.stdin.write("stop\n");
			break;

		case "restart":
			mcServer.process.stdin.write("stop\n");
			break;

		default:
			mcServer.process.stdin.write(str);
		}
	});
}

var modules = {};

fs.readdirSync("jsmodules").forEach(function(module) {
	var path = "./jsmodules/"+module;
	modules[module] = require(path)(conf[module] || {});
});
