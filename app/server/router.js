var AM = require('./modules/account-manager');
var PM = require('./modules/pweet-manager');
var EM = require('./modules/email-dispatcher');

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
  
// test //

  app.get('/reset', function(req, res) {
    PM.delAllRecords(function(){
      AM.delAllRecords(function(){
        res.send('ok');
      });
    });
  });

  app.post('/reset', function(req, res) {
    PM.delAllRecords(function(){
      AM.delAllRecords(function(){
        res.send('ok');
      });
    });
  });

  app.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });

};