
var crypto 		= require('crypto')
var MongoDB 	= require('mongodb').Db;
var Server 		= require('mongodb').Server;
var moment 		= require('moment');
var builder   = require('xmlbuilder');

var AM = require('./account-manager');

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
  test();
});
var proxyParty = db.collection('proxyParty');
var joinParty = db.collection('joinParty');
proxyParty.ensureIndex( { pos: "2d" } , function(){});


var getObjectId = function(id){
  if(!id.substr) return id;
  return db.bson_serializer.ObjectID.createFromHexString(id)
}

var findById = function(id, callback){
  proxyParty.findOne({_id: getObjectId(id)},
  function(e, res) {
    if (e) callback(e)
    else callback(null, res)
  });
}
  
exports.newParty = function(ownerId, pos, when, desc, callback){
  var obj = {
    arrival: new Date(),
    pos:[pos.lng, pos.lat],
    when:when.toDate(),
    ownerId:ownerId,
    desc:desc
  };
  proxyParty.save(obj, function(err, o){
    if(err){
      console.log(JSON.stringify(err));
      return callback(err,null);
    }
    callback(null,o);
  });
}

exports.joinParty = function(userId, partyId, callback){
  var obj = {
    userId: getObjectId(userId),
    partyId: getObjectId(partyId)
  };
  joinParty.save(obj, callback);
}

exports.leaveParty = function(userId, partyId, callback){
  var obj = {
    userId: getObjectId(userId),
    partyId: getObjectId(partyId)
  };
  joinParty.remove(obj, callback);
}

exports.delParty = function(id, callback){
  var id = getObjectId(id);
  joinParty.remove({partyId:id}, function(){/*osef*/});
  proxyParty.remove({_id:id}, callback);
}

exports.nearlyParties = function(pos, callback){
  var query = { pos: { $within: { $centerSphere: [[pos.lng, pos.lat], distance/6378.137] } }, when: {$gt: moment().toDate()} };
  proxyParty.find(query).sort({when:1}).toArray(function(err, users) {
    if(err){
      console.log(JSON.stringify(err));
      return callback(err,null);
    }
    var data = users.map(function(r){ return {when:moment(r.when).format("YYYYMMDD-hhmmss"),user:r.user,desc:r.desc,lng:r.pos[0],lat:r.pos[1],partyId:r._id}; });
    callback(null,data);
  });
}

exports.getPartyMembers = function(id, callback){
  var id = getObjectId(id);
  joinParty.find({partyId:id}).toArray(function(err,users){
    if(err) return callback(err);
    var ids = users.map(function(u){ return getObjectId(u.userId); });
    AM.getUsersById(ids,callback);
  });
}

exports.getPartyOwner = function(id, callback){
  findById(id,function(e,p){
    if(!p) return callback(e,p);
    AM.getUserById(p.ownerId,callback);
  });
}

exports.delAllRecords = function(callback){
  proxyParty.remove({}, callback);
}


  /*
exports.newParty = function(ownerId, pos, when, desc, callback);
exports.joinParty = function(userId, partyId, callback);
exports.leaveParty = function(userId, partyId, callback);
exports.delParty = function(id, callback);
exports.nearlyParties = function(pos, callback);
exports.getPartyMembers = function(id, callback);
exports.getPartyOwner = function(id, callback);

exports.testGetUsers(names,callback){
exports.testDelUsers(tokens,callback){
*/

function test(){
  AM.delAllRecords(function(){
    exports.delAllRecords(function(){
      console.log('initial state');
      proxyParty.find({}).each(function(e,o){console.log({e:e,o:o});});
      AM.testGetUsers(['Joe','Bill','Jack'],function(e,tokens,users){
        console.log("testGetUsers");
        console.log({e:e,tokens:tokens,users:users});
        console.log(users);
        console.log(users[0]._id);
        exports.newParty(users[0]._id, {lng:0,lat:0}, moment().add('m',1), "Croq's party", function(e,party){
          console.log("newParty");
          console.log({e:e,party:party});
          var partyId = party._id;
          exports.joinParty(users[1]._id, partyId, function(e,o){
            console.log("joinParty");
            console.log({e:e,o:o});
            exports.getPartyOwner(partyId, function(e,o){
              console.log("getPartyOwner");
              console.log({e:e,o:o});
              AM.testDelUsers(tokens,function(e,o){
                console.log("AM.testDelUsers");
                console.log({e:e,o:o});
                console.log('final state');
                proxyParty.find({}).each(function(e,o){console.log({e:e,o:o});});
              });
            });
          });
        });
      });
    });
  });
}