import http from 'http';
import express from 'express';
import session from 'express-session';
import moment from 'moment';
import config from './config.js';
import {TencentModel,validPaymentCallback} from './TencentModel.js';

let app = express();

// set view engine
app.set('views', './public');
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

app.use(session({ secret: 'Pretending as a database', cookie: { maxAge: 60000 }}));

global.orders = {};
global.users = {};

app.get('/test',(req,res,next) => {
	confirmDelivery();
	req.session.test = isNaN(req.session.test) ? 0 : req.session.test+1;
	let allData = {test:req.session.test,orders:global.orders,users:global.users};
	res.json(allData);
});

app.get('/',(req,res,next) => {
	let tm = new TencentModel(req.query,{dev:true});
	if(tm.err) {
		res.send('enter from Qzone or QQGame please.');
		return;
	}
	req.session.params = req.query;
	global.users[req.query.openid] = req.query;
	res.render('index',tm);
});

app.get('/getInfo',(req,res,next) => {
	if(!req.session.params){
		res.json({err:'no data'});
		return;
	}
	let tm = new TencentModel(req.session.params,{dev:true});
	if(tm.err){
		res.json(tm);
		return;
	}
	tm.getInfo().then(result => {
		res.json(result);
	});
});

app.get('/isLogin',(req,res,next) => {
	if(!req.session.params){
		res.json({err:'no data'});
		return;
	}
	let tm = new TencentModel(req.session.params,{dev:true});
	if(tm.err){
		res.json(tm);
		return;
	}
	tm.isLogin().then(result => {
		res.json(result);
	});
});

app.get('/getAppFriends',(req,res,next) => {
	if(!req.session.params){
		res.json({err:'no data'});
		return;
	}
	let tm = new TencentModel(req.session.params,{dev:true});
	if(tm.err){
		res.json(tm);
		return;
	}
	tm.getAppFriends().then(result => {
		res.json(result);
	});

});

app.get('/wordFilter',(req,res,next) => {
	if(!req.session.params){
		res.json({err:'no data'});
		return;
	}
	
	let tm = new TencentModel(req.session.params,{dev:true});
	if(tm.err){
		res.json(tm);
		return;
	}
	tm.wordFilter(req.query.content,req.query.msgid).then(result => {
		res.json(result);
	});
});

app.get('/buyGoods',(req,res) => {
	if(!req.session.params) {
		res.json({err:'no data'});
		return;
	}

	let tm = new TencentModel(req.session.params,{dev:true});
	if(tm.err){
		res.json(tm);
		return;
	}
	tm.buyGoods(req.query.id,
				req.query.unitPrice,
				req.query.quantity,
				req.query.name,
				req.query.description,
				req.query.imageUrl).then(result => {
					if(result.ret == 0) {
						global.orders[result.token] = {
							time:moment().unix(),
							status:0
						};
						res.json(result);
					}else {
						res.json(result);
					}
				});
});

app.get('/confirmDelivery',(req,res) => {
	let queue = [];
	for(let token in global.orders) {
		let order = global.orders[token];
		if(order.status == 1) {
			let user = global.users[order.openid];
			let tm = new TencentModel(user,{dev:true});
			let _p = tm.confirmDelivery(order,0).then(result => {
				if(result.ret == 0) {
					order.status = 2;
				}
				return true;
			});
			queue.push(_p);
		}
	}
	Promise.all(queue).then(results => {
		res.json(global.orders);
	});
});

app.get('/pay',(req,res) => {
	validPaymentCallback(req.query,'GET').then(result => {
		if(result) {
			global.orders[req.query['token']].status = 1;
			Object.assign(global.orders[req.query['token']],req.query);
			res.json({
				ret:0,
				msg:'OK'
			});
		}else {
			console.log('err');
			res.json({"ret":4,"msg":"请求参数错误:(sig)"})
		}
	});
});

app.use('/', express.static(__dirname + '/public'));

let server = http.createServer(app);
server.listen(80);
server.listen(9001);
console.log('----------------------server start---------------------');