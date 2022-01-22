const mongoose = require("mongoose");
const Schema = mongoose.Schema;

class SimpleMongoCache {
	constructor({ ttl = 10, checkPeriod = 5, flushOnCreate = false, cacheCollectionName = "cache", ignoreMongoError = false, returnDbResults = false } = {}) {
		this._validateOptions(ttl, checkPeriod, flushOnCreate, cacheCollectionName, ignoreMongoError, returnDbResults);
		this.ttl = parseFloat(ttl);
		this.checkPeriod = parseFloat(checkPeriod) * 1000; //parse n convert to miliseconds
		this.ignoreMongoError = ignoreMongoError;
		this.cacheCollectionName = cacheCollectionName;
		this.returnDbResults = returnDbResults;
		this._lastExpireTime = null;
		this._intervalCheck = null;
		this._schema = new Schema({}, { strict: false }); //create an "everything goes" schema
		this.DB = mongoose.model(this.cacheCollectionName, this._schema); //create model from schema
		if (flushOnCreate) this.flush(); //if true clear the database collection when instance object
	}

	async set(key, item) {
		if (typeof key !== "string") throw new Error("need to provide key as string");
		//if (item === null || typeof item == "undefined") throw new Error("item can not be null or undefined");
		const time = new Date(); //get current time
		time.setSeconds(time.getSeconds() + this.ttl); //add the ttl seconds to get the time it should expire
		this._lastExpireTime = time.valueOf(); //save last expire value for later comparison use
		const obj = {};
		obj.key = key;
		obj.expire = time.toISOString(); //convert to string so can store in db.
		obj.data = item;
		//store data. If entry with same key exists it will be overwritten
		let result = await this.DB.findOneAndUpdate({ key: key }, obj, { upsert: true, new: true }).catch((err) => {
			if (this.ignoreMongoError) console.error("error storing in db: ", err);
			else throw err;
		});
		if (this._intervalCheck == null) this._intervalCheck = setInterval(this._deleteExpired, this.checkPeriod); //if interval checking is not running then start it
		if (!result) return null;
		return this.returnDbResults ? result.toObject() : true;
	}

	async get(key) {
		if (typeof key !== "string") throw new Error("need to provide key as string");
		let result = await this.DB.findOne({ key: key }).catch((err) => {
			if (this.ignoreMongoError) console.error("error when getting from db: ", err);
			else throw err;
		});

		if (!result) return null; //if no data found return null
		//if cache key have expired then delete it and return null
		if (new Date() > new Date(result.expire)) {
			this.del(key); //there shld be no need to wait for the promise here
			return null;
		}
		let { data } = result.toObject(); //get the data from mongo document
		return data;
	}

	async del(key) {
		let result = await this.DB.deleteOne({ key: key }).catch((err) => {
			if (this.ignoreMongoError) console.error(`error when delete key: ${key} from db: `, err);
			else throw err;
		});
		if (!result) return null;
		return this.returnDbResults ? result : true;
	}

	flush = async () => {
		if (this._intervalCheck !== null) {
			clearInterval(this._intervalCheck);
		}
		this._intervalCheck = null;
		let result = await this.DB.deleteMany().catch((err) => {
			if (this.ignoreMongoError) console.error("error when flushing db: ", err);
			else throw err;
		});
		if (!result) return null;
		return this.returnDbResults ? result : true;
	};

	_deleteExpired = async () => {
		console.log("running check");
		const time = new Date();
		const timeString = time.toISOString();
		await this.DB.deleteMany({ expire: { $lte: timeString } }).catch((err) => {
			if (this.ignoreMongoError) console.error("error when delete from db: ", err);
			else throw err;
		});

		//if there is no future expires then clear the interval
		if (time.valueOf() > this._lastExpireTime) {
			clearInterval(this._intervalCheck);
			this._intervalCheck = null;
		}
	};

	_validateOptions(ttl, checkPeriod, flushOnCreate, cacheCollectionName, ignoreMongoError, returnDbResults) {
		if (isNaN(parseFloat(ttl))) throw new Error("ttl needs to be a number");
		if (isNaN(parseFloat(checkPeriod))) throw new Error("checkPeriod needs to be a number");
		if (typeof flushOnCreate !== "boolean") throw new Error("flushOnCreate needs to be a boolean ie, true or false");
		if (typeof cacheCollectionName !== "string") throw new Error("cacheCollectionName needs to be a string, ie the name of the collection to use");
		if (typeof ignoreMongoError !== "boolean") throw new Error("ignoreMongoError needs to be a boolean ie, true or false");
		if (typeof returnDbResults !== "boolean") throw new Error("returnDbResults needs to be a boolean ie, true or false");
	}
}

module.exports = SimpleMongoCache;
