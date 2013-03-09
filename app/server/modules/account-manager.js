
var crypto = require('crypto')
var MongoDB = require('mongodb').Db;
var Server = require('mongodb').Server;
var moment = require('moment');

var dbPort = 27017;
var dbHost = 'localhost';
var dbName = 'mydb';

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
var accounts = db.collection('accounts');
var tokens = db.collection('tokens');


exports.tokenUser = function(req,res,next){
  var token = req.param('token');
  if(token){
    exports.getUserFromToken(token,function(e,user){
      if(user){
        req.user = user;
        next();
      }else{
        res.send(401,'invalid-token');
      }
    });
  }else next();
};
  
  
/* login validation methods */

exports.getToken = function(user, pass, callback){
  accounts.findOne({user:user}, function(e, o) {
    if (o == null){
      callback('user-not-found');
    }else{
      validatePassword(pass, o.pass, function(err, res) {
        if (res){
          tokens.insert({user:o._id}, {safe: true}, function(err,res){
            if(err) callback('cannot-create-token');
            else callback(null,res[0]._id);
          });
        }else callback('invalid-password');
      });
    }
  });
}

exports.destroyToken = function(id, callback){
  tokens.remove({_id: getObjectId(id)}, callback);
}

exports.getUserFromToken = function(id, callback){
  tokens.findOne({_id: getObjectId(id)}, function(e, token) {
    if(e) return callback(e);
    if(!token) return callback('token-not-found');
    accounts.findOne({_id: token.user}, function(e, user) {
      if(e) return callback(e);
      callback(null,user);
    });
  });  
}

exports.autoLogin = function(user, pass, callback){
  accounts.findOne({user:user}, function(e, o) {
    if (o) o.pass == pass ? callback(o) : callback(null);
    else callback(null);
  });
}

exports.manualLogin = function(user, pass, callback){
  accounts.findOne({user:user}, function(e, o) {
    if (o == null){
      callback('user-not-found');
    } else{
      validatePassword(pass, o.pass, function(err, res) {
        if (res) callback(null, o);
        else callback('invalid-password');
      });
    }
  });
}

/* record insertion, update & deletion methods */

exports.addNewAccount = function(newData, callback){
  accounts.findOne({user:newData.user}, function(e, o) {
    if (o){
      callback('username-taken');
    } else{
      accounts.findOne({email:newData.email}, function(e, o) {
        if (o){
          callback('email-taken');
        } else{
          saltAndHash(newData.pass, function(hash){
          newData.pass = hash;
          newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
          accounts.insert(newData, {safe: true}, callback);
        });
        }
      });
    }
  });
}

exports.updateAccount = function(newData, callback){
  accounts.findOne({user:newData.user}, function(e, o){
    o.name = newData.name;
    o.email = newData.email;
    o.country = newData.country;
    if (newData.pass == ''){
      accounts.save(o, {safe: true}, callback);
    } else{
      saltAndHash(newData.pass, function(hash){
        o.pass = hash;
        accounts.save(o, {safe: true}, callback);
      });
    }
  });
}

exports.updatePassword = function(email, newPass, callback){
  accounts.findOne({email:email}, function(e, o){
    saltAndHash(newPass, function(hash){
      o.pass = hash;
      accounts.save(o, {safe: true}, callback);
    });
  });
}

/* account lookup methods */

exports.deleteAccount = function(id, callback){
  accounts.remove({_id: getObjectId(id)}, callback);
}

exports.getAccountByEmail = function(email, callback){
  accounts.findOne({email:email}, function(e, o){ callback(o); });
}

exports.validateResetLink = function(email, passHash, callback){
  accounts.find({ $and: [{email:email, pass:passHash}] }, function(e, o){
    callback(o ? 'ok' : null);
  });
}

exports.getAllRecords = function(callback){
  accounts.find().toArray(
    function(e, res) {
    if (e) callback(e)
    else callback(null, res)
    });
};

exports.getUserById = function(id,callback){
  findById(id,callback);
}

exports.getUsersById = function(ids,callback){
  accounts.find({_id: {$in: ids}}).toArray(callback);
}

exports.delAllRecords = function(callback){
  accounts.remove({}, function(){
    tokens.remove({}, callback);
  });  
}

/* private encryption & validation methods */

var generateSalt = function(){
  var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
  var salt = '';
  for (var i = 0; i < 10; i++) {
  var p = Math.floor(Math.random() * set.length);
  salt += set[p];
  }
  return salt;
}

var md5 = function(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

var saltAndHash = function(pass, callback){
  var salt = generateSalt();
  callback(salt + md5(pass + salt));
}

var validatePassword = function(plainPass, hashedPass, callback){
  var salt = hashedPass.substr(0, 10);
  var validHash = salt + md5(plainPass + salt);
  callback(null, hashedPass === validHash);
}

/* auxiliary methods */

var getObjectId = function(id){
  if(!id.substr) return id;
  return db.bson_serializer.ObjectID.createFromHexString(id)
}

var findById = function(id, callback){
  accounts.findOne({_id: getObjectId(id)},
  function(e, res) {
    if (e) callback(e)
    else callback(null, res)
  });
};


var findByMultipleFields = function(a, callback){
  // this takes an array of name/val pairs to search against {fieldName: 'value'} //
  accounts.find( { $or : a } ).toArray(
    function(e, results) {
      if (e) callback(e)
      else callback(null, results)
    });
}

exports.testGetUsers = function(names,callback){
  var n = names.length;
  var tokens = [];
  var users = [];
  function userReady(token,user){
    tokens.push(token);
    users.push(user);
    if(!--n) callback(null,tokens,users);
  }
  names.forEach(function(name){
    exports.addNewAccount({user:name,email:name,pass:'userpass'},function(e,user){
      if(!user || e) return callback('error');
      exports.getToken(name,'userpass',function(e,token){
        if(!token || e) return callback('error');
        userReady(token,user[0]);
      });
    });
  });
}

exports.testDelUsers = function(tokens,callback){
  var n = tokens.length;
  function userDeleted(){
    if(!--n) callback(null,null);
  }
  tokens.forEach(function(token){
    exports.deleteAccount(token,function(e,o){
      if(e) return callback('error');
      userDeleted();
    });
  });
}

function test(){
  exports.delAllRecords(function(){
    console.log('initial state');
    accounts.find({}).each(function(e,o){console.log({e:e,o:o});});
    tokens.find({}).each(function(e,o){console.log({e:e,o:o});});
    exports.addNewAccount({user:'usertest',email:'test',pass:'userpass'},function(e,user){
      console.log('addNewAccount');
      console.log({e:e,user:user});
      exports.getToken('usertest','userpass',function(e,token){
        console.log('getToken');
        token = ""+token; 
        console.log({e:e,token:token});
        exports.getUserFromToken(token,function(e,user){
          console.log('getUserFromToken');
          console.log({e:e,user:user});
          exports.destroyToken(token,function(e,o){
            console.log('destroyToken');
            console.log({e:e,o:o});
            exports.getUserFromToken(token,function(e,userEmpty){
              console.log('getUserFromToken');
              console.log({e:e,user:userEmpty});
              exports.deleteAccount(user._id,function(e,o){
                console.log('deleteAccount');
                console.log({e:e,o:o});
                console.log('final state');
                accounts.find({}).each(function(e,o){console.log({e:e,o:o});});
                tokens.find({}).each(function(e,o){console.log({e:e,o:o});});
              });
            });
          });
        });
      });
    });
  });
}