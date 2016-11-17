const path = './cache';

export class Cache {
	constructor(props) {
		super(props);
	}

	//获取缓存
	getCache(key) {
		if(this.cache[key])return this.cache[key];
		let data = this.fetchCache(key);
		this.cache[key] = data;
		return data;
	}

	//获取
	fetchCache(key) {
		if(!fs.existsSync(path+'/'+key+'.json')){
			return "";
		}
		try{
			let data = JSON.parse(fs.readFileSync(path+'/'+key+'.json'));
			return data;
		}catch(e){
			return {
				err:e,
				msg:"文件读取错误"
			}
		}
	}

	//刷新缓存
	setCache(key,data) {
		this.cache[key] = data;
		if(!fs.existsSync(path)){
			fs.mkdirSync(path);
		}
		fs.writeFileSync(path+'/'+key+'.json',JSON.stringify(data));
	}

}