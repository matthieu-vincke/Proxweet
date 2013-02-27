
var crypto 		= require('crypto')
var MongoDB 	= require('mongodb').Db;
var Server 		= require('mongodb').Server;
var moment 		= require('moment');
var builder   = require('xmlbuilder');

var dbPort 		= 27017;
var dbHost 		= 'localhost';
var dbName 		= 'mydb';

var distance = 1;

/* establish the database connection */

var db = new MongoDB(dbName, new Server(dbHost, dbPort, {auto_reconnect: true}), {w: 1});
	db.open(function(e, d){
	if (e) {
		console.log(e);
	}	else{
		console.log('connected to database :: ' + dbName);
	}
});
var proxweet = db.collection('proxweet');
proxweet.ensureIndex( { pos: "2d" } , function(){});

/* login validation methods */

exports.getXML = function(pos, callback){
  var query = { pos: { $within: { $centerSphere: [[pos.lng, pos.lat], distance/6378.137] } } };
  console.log(JSON.stringify(query));
  proxweet.find(query).sort({arrival:-1}).limit(10).toArray(function(err, users) {
    if(err){
      console.log(JSON.stringify(err));
      callback(null);
      return;
    }
    var doc = builder.create('root', {'version': '1.0'});
    var rec = doc.ele('proxweets');
    users.forEach(function(r){ 
      rec = rec.ele('proxweet').att('user',r.user).att('date',moment(r.arrival).format("YYYYMMDD-hhmmss")).text(r.text).up(); 
    });
    callback(doc);
  });
}

exports.post = function(pos, user, text, callback){
  var obj = {
    arrival: new Date(),
    pos:[pos.lng, pos.lat],
    user:user,
    text:text
  };
  console.log(JSON.stringify(obj));
  proxweet.save(obj,function(err){
    if(err) callback(null);
    else callback(true);
  });
}
