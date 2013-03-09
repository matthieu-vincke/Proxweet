
var crypto 		= require('crypto')
var MongoDB 	= require('mongodb').Db;
var Server 		= require('mongodb').Server;
var moment 		= require('moment');
var builder   = require('xmlbuilder');
var async     = require('async');

var AM = require('./account-manager');

var dbPort 		= 27017;
var dbHost 		= 'localhost';
var dbName 		= 'mydb';

var distance = 1;

/* establish the database connection */

var db = new MongoDB(dbName, new Server(dbHost, dbPort, {auto_reconnect: true}), {w: 1});
var proxyParty = db.collection('proxyParty');
var joinParty = db.collection('joinParty');
db.open(function(e, d){
  if(e){
    console.log(e);
    return;
  }
	console.log('connected to database :: ' + dbName);
  proxyParty.ensureIndex( { pos: "2d" }, function(){console.log("proxyParty ensure index 2d, ok");});
  //test();
});



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
  proxyParty.find(query).sort({when:1}).toArray(function(err, parties) {
    if(err){
      console.log(JSON.stringify(err));
      return callback(err,null);
    }
    callback(null,parties);
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

exports.getPartyOwned = function(id, callback){
  var id = getObjectId(id);
  proxyParty.find({ownerId:id}).toArray(function(err,parties){
    if(err) return callback(err);
    return callback(null,parties);
  });
}

exports.getPartyJoined = function(id, callback){
  var id = getObjectId(id);
  joinParty.find({userId:id}).toArray(function(err,joins){
    if(err) return callback(err);
    if(!joins || !joins.length) return callback(null);
    var ids = joins.map(function(j){ return getObjectId(j.partyId); });
    proxyParty.find({_id:{$in:ids}}).toArray(function(err,parties){
      if(err) return callback(err);
      if(!parties || !parties.length) return callback(null);
      return callback(null,parties);
    });
  });
}

exports.getPartyOwner = function(id, callback){
  findById(id,function(e,p){
    if(!p) return callback(e,p);
    AM.getUserById(p.ownerId,callback);
  });
}

exports.delAllRecords = function(callback){
  async.parallel([
    function(cb){ proxyParty.remove({}, cb); },
    function(cb){ joinParty.remove({}, cb); },
  ],callback);
}




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
            exports.joinParty(users[2]._id, partyId, function(e,o){
              console.log("joinParty");
              console.log({e:e,o:o});
              exports.getPartyOwner(partyId, function(e,o){
                console.log("getPartyOwner");
                console.log({e:e,o:o});
                exports.getPartyMembers(partyId, function(e,o){
                  console.log("getPartyMembers");
                  console.log({e:e,o:o});                
                  exports.leaveParty(users[1]._id, partyId, function(e,o){
                    console.log("leaveParty");
                    console.log({e:e,o:o});  
                    exports.nearlyParties({lng:0,lat:0}, function(e,o){
                      console.log("nearlyParties");
                      console.log({e:e,o:o});  
                      exports.delParty(partyId, function(e,o){
                        console.log("delParty");
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
          });
        });
      });
    });
  });
}