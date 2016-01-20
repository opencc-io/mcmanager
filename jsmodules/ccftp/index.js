var fs = require("fs");
var pathlib = require("path");
var childProcess = require("child_process");

module.exports = function(options) {
	options.root = process.cwd()+"/"+options.root;
	options.data = __dirname+"/data";
	options.db = __dirname+"/db.json";

	try {
		fs.mkdirSync(options.data);
	} catch (err) { if (err.code !== "EEXIST") throw err; }

	var db = JSON.parse(fs.readFileSync(options.db));
	db.write = function() {
		fs.writeFileSync(JSON.stringify(db, null, 4));
	}

	createlinks(options, db).then(function() {
		init(options, db);
	}).catch(console.trace.bind(console));
}

process.on("unhandledRejection", console.trace.bind(console));

function createlinks(options, db) {
	function linkComputer(computer, user) {
		return new Promise(function(resolve, reject) {
			var target = options.root+"/"+computer;
			var path = options.data+"/"+user.name+"/"+computer;
			fs.symlink(target, path, function(err) {
				if (err && err.code !== "EEXIST")
					reject(err);
				else
					resolve();
			});
		});
	}

	function linkUser(user) {
		return new Promise(function(resolve, reject) {
			fs.mkdir(options.data+"/"+user.name, function(err) {
				if (err && err.code !== "EEXIST")
					return reject(err);

				var promises = user.computers.map(function(computer) {
					return linkComputer(computer, user);
				});

				Promise.all(promises).then(resolve, reject);
			});
		});
	}

	return new Promise(function(resolve, reject) {
		var promises = db.users.map(function(user) {
			return linkUser(user);
		});
		Promise.all(promises).then(resolve, reject);
	});
}

function init(options, db) {
	var ftpd = childProcess.spawn("python", [__dirname+"/ftpd"], {
		env: {
			DB: options.db,
			PORT: options.ftpport,
			DATA: options.data,
			CC_ROOT: options.root,
			PASV_START: options.pasvports[0],
			PASV_END: options.pasvports[1]
		},
		stdio: "inherit"
	});

	function deinit() {
		ftpd.kill()
	}

	process.on("exit", deinit);
	process.on("SIGINT", deinit);
	process.on("SIGTERM", deinit);
}
