#!/usr/bin/env node

var http = require('http');
var dispatcher = require('httpdispatcher');
var simpleGit = require('simple-git');
var shell = require('shelljs');
var Rsync = require('rsync');

const PORT = 1280;

function onFileSyncCompleted(error, code, cmd) {
	if (code === 0) {
		console.log('Web directory successfully updated');
	} else {
		console.log('ERROR! Failed to update web directory!');
		console.log(error);
	}
}

function onDeployScriptCompletion(code) {
	if (code === 0) {
		console.log('Rebuild completed successfully');
		console.log('Syncing build files to web directory...');
		var rsync = new Rsync()
			.flags('az')
			.set('delete')
			.output(console.log, console.log)
			.source('../pdusen.com/dist/')
			.destination('/var/www/pdusen.com');
		rsync.execute(onFileSyncCompleted);
		
	} else {
		console.log('ERROR! Rebuild failed!');
	}
}

function onGithubPull(err, update, c) {
	console.log(update);
	console.log('Updated code pulled');
	if (update.files.length < 0) {
		console.log('No changes detected.');
		return;
	}
	shell.chmod('u+x', '../pdusen.com/deploy.sh');
	console.log('Rebuilding...');
	var child = shell.exec('./deploy.sh',
	{
		async: true,
		cwd: '../pdusen.com'
	}, 
	onDeployScriptCompletion);
}

function onGet(req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Received GET pdusen.com\n');
}

function onPost(req, res) {
	var payload = JSON.parse(req.body);
	console.log(payload);
	if (payload.ref !== 'refs/heads/master') {
		console.log('Push event not on master branch; ignoring.');
	} else {
		var repo = simpleGit('../pdusen.com');
		console.log('Pulling updated code for pdusen.com');
		repo.pull(onGithubPull);
	}

	res.writeHead(200, {'content-type': 'text/plain'});
	res.end('received post pdusen.com\n');
}


dispatcher.onGet('/pdusen.com', onGet);

dispatcher.onPost('/pdusen.com', onPost);

function handleRequest(request, response) {
	try {
		console.log(request.url);
		dispatcher.dispatch(request, response);
	} catch (err) {
		console.log(err);
	}
}

var server = http.createServer(handleRequest);

server.listen(PORT, function() {
	console.log('Server listening on: http://localhost:%s', PORT);
});
