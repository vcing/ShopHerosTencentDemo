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
		'paymentCallbackPath':'/pay',
		'confirmDelivery':'/v3/pay/confirm_delivery'
	};

function encodeUrl(str) {
	return encodeURIComponent(str).replace(/\*/g,'%2A').replace(/-/g,'%2D');
}

export class TencentModel {
	constructor(params,options) {
		if(options.payCallback) {
			if(!params['sig']) {
				this.err = 'sig needed';
				this.detail = params;
				this.code = 104;
			}
			return;
		}
		if(!params || !params['openid'] || !params['openkey'] || !params['pf'] || !params['pfkey']) {
			this.err = 'parameters invalid';
			this.detail = params;
			this.code = 101;
			return;
		}
		Object.assign(this,params);
		this.appid = config.appid;
		this.dev = options.dev || false;
		this.apiPath = options.dev == true ? testAPIPath : formalAPIPath;
		this.secretApiPath = options.dev == true ? testSecretAPIPath : formalSecretAPIPath;
	}

	getBaseParameters () {
		return {
			openid:this.openid,
			openkey:this.openkey,
			appid:this.appid,
			pf:this.pf,
			format:'json',
		}
	}

	sortAndFormatParams(params){
		let sorted = {};
		for (let key of Object.keys(params).sort()) {
			sorted[key] = params[key];
		}

		return this.objectToUrl(sorted,true);
	}

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
		}catch(e) {
			return {
				code:102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

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
		}catch(e) {
			return {
				code:102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

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
		}catch(e) {
			return {
				code:102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

	async wordFilter(content,msgid) {

		if(!content || content.length == 0) return {code: 103,err:'need content'};
		if(!msgid || msgid.length == 0) return {code: 103,err:'need msgid'};

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
		}catch(e) {
			return {
				code:102,
				err:'http request error',
				detail:e
			}
		}
		return body;
	}

	async buyGoods(id,unitPrice,quantity,name,description,imageUrl) {

		if(!id) return {code: 103,err:'need item id'};
		if(!unitPrice) return {code: 103,err:'need item unitPrice'};
		if(!quantity) return {code: 103,err:'need item quantity'};
		if(!name) return {code: 103,err:'need item name'};
		if(!description) return {code: 103,err:'need item description'};
		if(!imageUrl) return {code: 103,err:'need item imageUrl'};


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
				code:102,
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

export async function validPaymentCallback(params,requestMethod) {
	let _paramsWithoutSig = Object.assign({},params);
	delete _paramsWithoutSig['sig'];
	let sig = await payCallbackGetSig('paymentCallbackPath',_paramsWithoutSig,requestMethod);
	return sig == decodeURIComponent(params['sig']);
}