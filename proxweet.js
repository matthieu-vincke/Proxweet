var http = require('http');
var nodeStatic = require('node-static');
var builder = require('xmlbuilder');
var url = require("url");
var querystring = require("querystring");

var databaseUrl = "mydb"; // "username:password@example.com/mydb"
var collections = ["proxweet"];
var db = require("mongojs").connect(databaseUrl, collections);
db.proxweet.ensureIndex( { pos: "2d" } )
var file = new(nodeStatic.Server)();
var distance = 0.1;

//CRUD
var route = {};

function error(res,msg){
  console.log('Error:'+msg);
  res.writeHead(200, {'Content-Type': 'application/xml'});
  res.end("<root><error>"+msg+"</error></root>");
}
function success(res,msg){
  console.log('Success:'+msg);
  res.writeHead(200, {'Content-Type': 'application/xml'});
  res.end("<root><success>"+msg+"</success></root>");
}

// pweet: post(pos,user,text) => void
route.post = function(req, res){
  req.content = '';
  req.addListener("data", function(chunk) {
		req.content += chunk;
	});
	req.addListener("end", function() {
		var post = querystring.parse(req.content);
    console.log('Post:'+JSON.stringify(post));
    var obj = {
      arrival: new Date(),
      pos:{
        lng:parseFloat(post.lng),
        lat:parseFloat(post.lat)},
      user:post.user,
      text:post.text};
    console.log('Insert:'+JSON.stringify(obj));
    db.proxweet.save(obj,function(err){
      if(err) return error(res,"database error");
      success(res,"tweet added");
    });
	});
}

// pweet: get(pos) => [proxweet]
route.get = function(req, res){
  req.content = '';
  req.addListener("data", function(chunk) {
		req.content += chunk;
	});
	req.addListener("end", function() {
    var post = querystring.parse(req.content);
    console.log('Post:'+JSON.stringify(post));
    var query = { pos: { $within: { $centerSphere: [[parseFloat(post.lng), parseFloat(post.lat)], distance/6378.137] } } };
    console.log(query);
    db.proxweet.find(query).sort({arrival:-1}).limit(10).toArray(function(err, users) {
      if(err){
        console.log(JSON.stringify(err));
        return error(res,"database error");
      }
      var doc = builder.create();
      var rec = doc.begin('root', {'version': '1.0'}).ele('proxweets');
      users.forEach(function(r){ rec = rec.ele('proxweet').att('user',r.user).text(r.text).up(); });
      res.writeHead(200, {'Content-Type': 'application/xml'});
      res.end(doc.toString());
    });
	});
}

http.createServer(function (req, res) {
  var pathname = url.parse(req.url).pathname;
  var fct = route[pathname.slice(1)];
  if(fct) fct(req, res);
  else file.serve(req, res);
}).listen(80);

//db.proxweet.remove({});

console.log('Server running at http://127.0.0.1:80/');
