var AM = require('./modules/account-manager');
var PM = require('./modules/pweet-manager');
var PAP = require('./modules/proxy-alcopote');
var EM = require('./modules/email-dispatcher');
var moment 		= require('moment');
var async 		= require('async');

module.exports = function(app) {
// main login page //
  app.post('/login',function(req,res){
    AM.getToken(req.param('user'), req.param('pass'), function(e, token){
      if(!e) res.send({token:token});
      else res.send(400, e);
    });
  });

  app.post('/logout',function(req,res){
    if(!req.user){
      res.send(401, 'invalid token');
      return;
    }
    AM.destroyToken(req.param('token'), function(e){
      if(!e) res.send('ok');
      else res.send(500, 'error');
    });
  });

  app.post('/get', function(req, res) {
    if(!req.user){
      res.send(401, 'invalid token');
      return;
    }
    PM.get({lng:parseFloat(req.param('lng')),lat:parseFloat(req.param('lat'))},1,function(err,data){
      if(!err) res.send(data);
      else res.send(500,'error');
    });
  });

  app.post('/post', function(req, res) {
    if(!req.user){
      res.send(401, 'invalid token');
      return;
    }
    PM.post({lng:parseFloat(req.param('lng')),lat:parseFloat(req.param('lat'))},req.user.name,req.param('text'),function(err,data){
      if(!err) res.send('ok');
      else res.send(500, 'error');
    });
  });

// creating/deleting/modifying new accounts //
  app.post('/signup', function(req, res){
    AM.addNewAccount({
      name : req.param('name'),
      email : req.param('email'),
      user : req.param('user'),
      pass : req.param('pass'),
    }, function(e){
      if (e) res.send(406, e);
      else res.send('ok');
    });
  });

  app.post('/parameter', function(req, res){
    if(!req.user){
      res.send(401, 'invalid token');
      return;
    }
    AM.updateAccount({
      user : req.user.user,
      name : req.param('name'),
      email : req.param('email'),
      pass : req.param('pass')
    }, function(e, o){
        if (e) res.send(500, 'error-updating-account');
        else res.send('ok');
    });
  });
  app.post('/delete', function(req, res){
    if(!req.user){
      res.send(401, 'invalid token');
      return;
    }
    AM.deleteAccount(req.user._id, function(e, obj){
      if (!e) res.send('ok');
      else res.send(400, 'unable to found the account');
    });
  });

// password reset //

  app.post('/lost-password', function(req, res){
    AM.getAccountByEmail(req.param('email'), function(o){
      if (o){
        res.send('ok');
        EM.dispatchResetPasswordLink(o, function(e, m){
          if (!e) {
            //res.send('ok', 200);
          } else{
            res.send(400, 'email-server-error');
            for (k in e) console.log('error : ', k, e[k]);
          }
        });
      }else res.send(400, 'email-not-found');
    });
  });
  
  app.post('/reset-password', function(req, res) {
    var email = req.param('email');
    var code = req.param('code');
    var nPass = req.param('npass');
    AM.updatePassword(email, code, nPass, function(o){
      if(o) res.send('ok');
      else res.send(400, 'unable to update password');
    });
  });
  
// proxy party //

  function partyIntern2Extern(p){
    return {when:moment(p.when).format("YYYYMMDD-hhmmss"),pos:p.pos,desc:p.desc,id:p._id};
  }
  
  
  app.post('/party/new', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    var pos = {lng:parseFloat(req.param('lng')),lat:parseFloat(req.param('lat'))};
    var when = moment(req.param('when'),"YYYYMMDD-hhmmss");
    var desc = req.param('desc');
    PAP.newParty(req.user._id,pos,when,desc,function(err,party){
      if(party) return res.send(partyIntern2Extern(party));
      else return res.send(500, 'error');
    });
  });

  app.post('/party/join', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    var partyId = req.param('partyId');
    if(!partyId) return res.send(400, 'invalid party id number');
    PAP.joinParty(req.user._id,partyId,function(err){
      if(!err) return res.send("ok");
      else return res.send(500, 'error');
    });
  });
  
  app.post('/party/leave', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    var partyId = req.param('partyId');
    if(!partyId) return res.send(400, 'invalid party id number');
    PAP.leaveParty(req.user._id,partyId,function(err){
      if(!err) return res.send("ok");
      else return res.send(500, 'error');
    });
  });
  
  app.post('/party/del', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    var partyId = req.param('partyId');
    if(!partyId) return res.send(400, 'invalid party id number');
    PAP.getPartyOwner(partyId,function(e,o){
      if(e) return res.send(500, 'error');
      if(!o) return res.send(400, 'invalid party id number');
      if(o._id.equals(req.user._id)){
        PAP.delParty(partyId,function(err){
          if(!err) return res.send("ok");
          else return res.send(500, 'error');
        });
      }else return res.send(400, 'user is not the owner of the party');
    });
  });
  
  app.post('/party/members', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    var partyId = req.param('partyId');
    if(!partyId) return res.send(400, 'invalid party id number');
    PAP.getPartyOwner(partyId,function(e,o){
      if(e) return res.send(500, 'error');
      if(!o) return res.send(400, 'invalid party id number');
      var partyOwnerId = o._id;
      PAP.getPartyMembers(partyId,function(e,members){
        if(!e){
          var ret = members.map(function(m){ return m.user; });
          return res.send(ret);
        }
        return res.send(500, 'error');
      });
    });
  });
  
  app.post('/party/owner', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    var partyId = req.param('partyId');
    if(!partyId) return res.send(400, 'invalid party id number');
    PAP.getPartyOwner(partyId,function(e,o){
      if(e) return res.send(500, 'error');
      if(!o) return res.send(400, 'invalid party id number');
      if(!e) return res.send(o.user);
      return res.send(500, 'error');      
    });
  });
  
  
  app.post('/party/get', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    var pos = {lng:parseFloat(req.param('lng')),lat:parseFloat(req.param('lat'))};
    PAP.nearlyParties(pos,function(e,parties){
      if(e) return res.send(500, 'error');
      if(!parties) return res.send(400, 'invalid party id number');
      if(!e){
        var ret = parties.map(partyIntern2Extern);
        return res.send(ret);
      }
      return res.send(500, 'error');      
    });
  });
  
  app.post('/party/getOwned', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    PAP.getPartyOwned(req.user._id,function(e,parties){
      if(e) return res.send(500, 'error');
      var ret = parties.map(partyIntern2Extern);
      return res.send(ret);     
    });
  }); 
  
  app.post('/party/getJoined', function(req, res) {
    if(!req.user) return res.send(401, 'invalid token');
    PAP.getPartyJoined(req.user._id,function(e,parties){
      if(e) return res.send(500, 'error');
      if(!parties) return res.send([]);
      var ret = parties.map(partyIntern2Extern);
      return res.send(ret);     
    });
  });
    
// test //

  app.get('/reset', function(req, res) {
    async.parallel([
      PM.delAllRecords,
      AM.delAllRecords,
      PAP.delAllRecords
    ],function(){res.send('ok');});
  });

  app.post('/reset', function(req, res) {
    async.parallel([
      PM.delAllRecords,
      AM.delAllRecords,
      PAP.delAllRecords
    ],function(){res.send('ok');});
  });

  app.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });

};