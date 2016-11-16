import http from 'http';
import express from 'express';

let app = express();

app.get('/test',(req,res,next) => {
	res.send('opk');
});

app.get('/',(req,res,next) => {
	res.send('ok');
});

let server = http.createServer(app,() => debug("server start at"));
server.listen(80);