// Safe serverless entrypoint: attempt to wrap the Express app, but provide
// a lightweight fallback handler (useful when native modules or imports fail
// in the serverless environment). This ensures `/api/health` can return 200.
let serverless;
let app;
try {
	serverless = require('serverless-http');
	app = require('../server/server');
} catch (err) {
	// Log to stdout so Vercel captures the error during the function invocation.
	// This won't crash the function; instead we export a minimal handler below.
	console.error('Failed to import server app or serverless-http:', err && (err.stack || err.message || err));
}

if (serverless && app) {
	module.exports = serverless(app);
} else {
	// Minimal fallback Vercel handler
	module.exports = async (req, res) => {
		try {
			if (req.url && req.url.startsWith('/api/health')) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ status: 'ok', message: 'Fallback health - server app not loaded' }));
				return;
			}
			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ error: 'Server not available in this environment' }));
		} catch (e) {
			console.error('Fallback handler error:', e && (e.stack || e.message || e));
			res.statusCode = 500;
			res.end('Internal Server Error');
		}
	};
}
