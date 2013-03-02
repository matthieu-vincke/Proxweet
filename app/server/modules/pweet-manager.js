
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
  if(e){
    console.log(e);
    return;
  }
	console.log('connected to database :: ' + dbName);
  //test();
});
var proxweet = db.collection('proxweet');
proxweet.ensureIndex( { pos: "2d" } , function(){});

exports.getXML = function(pos, distance, callback){
  exports.get(pos, distance, function(err,users){
    if(err) return callback(err,null);
    var doc = builder.create('root', {'version': '1.0'});
    var rec = doc.ele('proxweets');
    users.forEach(function(r){ 
      rec = rec.ele('proxweet').att('user',r.user).att('date',moment(r.date).format("YYYYMMDD-hhmmss")).text(r.text).up(); 
    });
    callback(null,doc);
  });
}

exports.get = function(pos, distance, callback){
  var query = { pos: { $within: { $centerSphere: [[pos.lng, pos.lat], distance/6378.137] } } };
  proxweet.find(query).sort({arrival:-1}).limit(10).toArray(function(err, users) {
    if(err){
      console.log(JSON.stringify(err));
      return callback(err,null);
    }
    var data = users.map(function(r){ return {date:moment(r.arrival).format("YYYYMMDD-hhmmss"),user:r.user,text:r.text}; });
    callback(null,data);
  });
}

exports.post = function(pos, user, text, callback){
  var obj = {
    arrival: new Date(),
    pos:[pos.lng, pos.lat],
    user:user,
    text:text
  };
  proxweet.save(obj, function(err, o){
    if(err){
      console.log(JSON.stringify(err));
      return callback(err,null);
    }
    callback(null,o);
  });
}

exports.delAllRecords = function(callback){
  proxweet.remove({}, callback);
}

function test(){
  exports.delAllRecords(function(){
    console.log('initial state');
    proxweet.find({}).each(function(e,o){console.log({e:e,o:o});});
    exports.post({lng:0,lat:0},"Croq","Pos00",function(e,p){
      console.log('post');
      console.log({e:e,p:p});
      exports.post({lng:5,lat:5},"Croq","Pos55",function(e,p){
        console.log('post');
        console.log({e:e,p:p});
        exports.get({lng:5.000001,lat:5},1,function(e,p){
          console.log('get55');
          console.log({e:e,p:p});
          exports.get({lng:2.5,lat:2.5},1000,function(e,p){
            console.log('getLarge');
            console.log({e:e,p:p});
            console.log('final state');
            proxweet.find({}).each(function(e,o){console.log({e:e,o:o});});
          });
        });
      });
    });
  });
}