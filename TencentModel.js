// TencentModel.js
// Node.Js version tencent game platform sdk
// 
// author:Vcing
// Date:2016-11-18
// 
// This is a basic sdk for game server
// In this version composed of two parts 
// it contains 7 interfaces
// 

import config from './config.js';
import _ from 'lodash';
import crypto from 'crypto';
import request from 'request-promise';
import moment from 'moment';

const testAPIPath = 'http://119.147.19.43',
	formalAPIPath = 'http://openapi.tencentyun.com',
	testSecretAPIPath = 'http://119.147.19.43',
	formalSecretAPIPath = 'https://openapi.tencentyun.com',
	interfaces = {
		'getInfo':'/v3/user/get_info',
		'isLogin':'/v3/user/is_login',
		'getAppFriends':'/v3/relation/get_app_friends',
		'wordFilter':'/v3/csec/word_filter',
		'buyGoods':'/v3/pay/buy_goods',
		'paymentCallback':'/pay',
		'confirmDelivery':'/v3/pay/confirm_delivery'
	};

// 
// tencent OpenAPI required specially URL encode method
function encodeUrl(str) {
	// ! ~ * ' ( ) 
	return encodeURIComponent(str)
	.replace(/!/g,'%21')
	.replace(/~/g,'%7E')
	.replace(/\*/g,'%2A')
	.replace(/'/g,'%27')
	.replace(/\(/g,'%28')
	.replace(/\)/g,'%29');
}

export class TencentModel {
	// constructor need params which tencent server provided
	// or you can save user's params and then use them to instantiate this class
	constructor(params,options) {
		if(!params || !params['openid'] || !params['openkey'] || !params['pf'] || !params['pfkey']) {
			this.err = 'parameters invalid';
			this.detail = params;
			this.ret = 101;
			return;
		}
		Object.assign(this,params);
		this.appid = config.appid;
		this.dev = options.dev || false;
		this.apiPath = options.dev == true ? testAPIPath : formalAPIPath;
		this.secretApiPath = options.dev == true ? testSecretAPIPath : formalSecretAPIPath;
	}

	// tencent OpenAPI v3 needed basic params
	getBaseParameters () {
		return {
			openid:this.openid,
			openkey:this.openkey,
			appid:this.appid,
			pf:this.pf,
			format:'json',
		}
	}

	// sort params by alphabet and transform params to string,use & to connect them
	sortAndFormatParams(params){
		let sorted = {};
		for (let key of Object.keys(params).sort()) {
			sorted[key] = params[key];
		}

		return this.objectToUrl(sorted,true);
	}

	// transform params to string,use & to connect them
	objectToUrl(object,forSign = false) {
		var query = '';
		var i = 0;
		_.map(object,function(value,key){
			if(i>0)query+='&';
			if((key == 'content' || key == 'goodsmeta' || key == 'goodsurl' || key == 'payitem') && forSign){
				query += (key+'='+value);
			}else {
				query += (key+'='+encodeUrl(value));	
			}
			
			i++;
		});
		return query;
	}

	// sig generator base on tencent OpenAPI standard
	getSig(interfaceName,params,requestMethod) {
		let firstPart = encodeUrl(interfaces[interfaceName]);
		let secondPart = encodeUrl(this.sortAndFormatParams(params));
		let final = requestMethod + '&' + firstPart + '&' + secondPart;
		let secret = config.appkey + '&';

		let sig = crypto.createHmac('sha1', secret).update(final).digest().toString('base64');
		return sig;
	}

	getFullParams(manner,method,additionParams={}) {
		let _params = Object.assign(this.getBaseParameters(),additionParams);
		let sig = this.getSig(manner,_params,method);
		_params['sig'] = sig;
		return _params;
	}

	// get user information interface
	// when game server got user information.
	// Game server need to save most information from this interface
	// And OpenID is a unique id to identify every user in game
	// and some information like is_yellow_vip is_yellow_year_vip 
	// yellow_vip_level is_yellow_high_vip will influence game content.
	async getInfo() {
		const method = 'GET',
		manner = 'getInfo';
		let data = this.getFullParams(manner,method);
		let body = '';
		try {
			let options = {
				uri:this.apiPath + interfaces[manner] + '?' + this.objectToUrl(data),
				method,
			};
			body = await request(options);	
			body = JSON.parse(body);
		}catch(e) {
			return {
				ret: 102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

	// valid user is login or not
	// use this interface to renewal user openid expiration time
	async isLogin() {
		const method = 'GET',
		manner = 'isLogin';
		let data = this.getFullParams(manner,method);
		let body = '';
		try {
			let options = {
				uri:this.apiPath + interfaces[manner] + '?' + this.objectToUrl(data),
				method,
			};
			body = await request(options);	
			body = JSON.parse(body);
		}catch(e) {
			return {
				ret: 102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

	// get user's friends' openid
	async getAppFriends() {
		const method = 'GET',
		manner = 'getAppFriends';
		let data = this.getFullParams(manner,method);
		let body = '';
		try {
			let options = {
				uri:this.apiPath + interfaces[manner] + '?' + this.objectToUrl(data),
				method,
			};
			body = await request(options);	
			body = JSON.parse(body);
		}catch(e) {
			return {
				ret: 102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

	// every text or word send in game should use this interface to filter
	// content is text itself
	// msgid should be a unique identification to every content
	async wordFilter(content,msgid) {
		if(!content || content.length == 0) return {ret:  103,err:'need content'};
		if(!msgid || msgid.length == 0) return {ret:  103,err:'need msgid'};

		const method = 'GET',
		manner = 'wordFilter';
		let data = this.getFullParams(manner,method,{content,msgid});
		let body = '';
		try {
			let options = {
				uri:this.apiPath + interfaces[manner] + '?' + this.objectToUrl(data),
				method,
			};
			body = await request(options);	
			body = JSON.parse(body);
		}catch(e) {
			return {
				ret: 102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

	// buy goods 
	async buyGoods(id,unitPrice,quantity,name,description,imageUrl) {

		if(!id) return {ret:  103,err:'need item id'};
		if(!unitPrice) return {ret:  103,err:'need item unitPrice'};
		if(!quantity) return {ret:  103,err:'need item quantity'};
		if(!name) return {ret:  103,err:'need item name'};
		if(!description) return {ret:  103,err:'need item description'};
		if(!imageUrl) return {ret:  103,err:'need item imageUrl'};


		const method = 'GET',
		manner = 'buyGoods';

		let additionParams = {
			pfkey: this.pfkey,
			ts:moment().unix(),
			payitem:id+'*'+unitPrice+'*'+quantity,
			goodsmeta:name+'*'+description,
			goodsurl: imageUrl,
			zoneid: 0,
			appmode:1,
			amt:unitPrice*quantity
		}

		let data = this.getFullParams(manner,method,additionParams);
		let body = '';
		try {
			let options = {
				uri:this.secretApiPath + interfaces[manner] + '?' + this.objectToUrl(data),
				method,
			};
			body = await request(options);
			body = JSON.parse(body);
		}catch(e) {
			return {
				ret: 102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

	// confirm delivery
	// this is the last step in payment flow
	// game server must use this interface to confirm with tencent payment system
	// order parameter including every field which acquired from tencent payment callback
	// result: 0 -- success      other -- fail
	// errmsg: if failed write some msg for log.
	async confirmDelivery(order,result = 0,errmsg) {
		const method = 'GET',
		manner = 'confirmDelivery';

		let additionParams = {
			ts:moment().unix(),
			payitem:order.payitem,
			token_id:order.token,
			billno:order.billno,
			zoneid:order.zoneid,
			provide_errno:result,
			provide_errno:errmsg,
			amt:order.amt,
			payamt_coins:order.payamt_coins,
		}
		let data = this.getFullParams(manner,method,additionParams);
		let body = '';
		try {
			let options = {
				uri:this.secretApiPath + interfaces[manner] + '?' + this.objectToUrl(data),
				method
			};
			body = await request(options);
			body = JSON.parse(body);
		}catch(e) {
			return {
				ret: 102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}
}

function paybackEncode(str) {
	// 0~9 48~57
	// a~z 97~122
	// A~Z 65~90
	// ! 33 
	// ( ) * 40 41 42
	let result = '';
	let arr = str.split('');
	for(let key in arr) {
		let _c = arr[key].charCodeAt();
		if((_c >= 48 && _c <= 57) || 
			(_c >= 97 && _c <= 122) ||
			(_c >= 65 && _c <= 90) ||
			(_c >= 40 && _c <= 42) ||
			(_c == 33)) {
			result += arr[key];
		}else {
			result += ('%' + _c.toString(16).toUpperCase());
		}
	}
	return result;
}

function payCallbackGetSig(interfaceName,params,requestMethod) {

	let sorted = {};
	var query = '';
	var i = 0;

	for (let key of Object.keys(params).sort()) {
		sorted[key] = params[key];
	}
	_.map(sorted,function(value,key){
		if(i>0)query+='&';
		query += (key+'='+paybackEncode(value));
		i++;
	});

	let firstPart = encodeURIComponent(interfaces[interfaceName]);
	let secondPart = encodeUrl(query);
	let final = requestMethod + '&' + firstPart + '&' + secondPart;
	let secret = config.appkey + '&';
	let sig = crypto.createHmac('sha1', secret).update(final).digest().toString('base64');
	return sig;
}


// this is a pure function
// for check tencent payment callback sig
export async function validPaymentCallback(params,requestMethod) {
	let _paramsWithoutSig = Object.assign({},params);
	delete _paramsWithoutSig['sig'];
	let sig = await payCallbackGetSig('paymentCallback',_paramsWithoutSig,requestMethod);
	return sig == decodeURIComponent(params['sig']);
}