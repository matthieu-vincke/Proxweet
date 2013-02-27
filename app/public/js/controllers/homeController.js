
function HomeController()
{

// bind event listeners to button clicks //
	var that = this;

// handle user logout //
	$('#btn-logout').click(function(){ that.attemptLogout(); });
  $('#btn-parameter').click(function(){ window.location.href='/parameter'; });
  
  var position;
  var refreshOngoing = false;
  var refreshTime = 10000; // refresh every 10 seconds
  var serverOk = true;

	function error(msg){
		$('.modal-alert').modal({ show : false, keyboard : false, backdrop : 'static' });
		$('.modal-alert .modal-header h3').text('Error !');
		$('.modal-alert .modal-body p').html(msg);
		$('.modal-alert').modal('show');
		$('.modal-alert button').click(function(){$('.modal-alert').modal({show:false});});
	}
  
  function serverError(){
    if(serverOk){
      error("unable to contact the server");
      serverOk = false;
    }
  }
  function cleanTweet(){ 
    $("#events").empty(); 
  }
  
  function addTweet(date, user, text){ 
/*
    var head = $('<tr/>');
    head.append($('<td width="50%"/>').addClass('pweet-user').text(user));
    head.append($('<td width="50%"/>').addClass('pweet-date text-right').text(date));
    var body = $('<tr/>');
    body.append($('<td colspan=2/>').addClass('span12 text-center').text(text));
    var row = $('<tr/>').append($('<td/>').append($('<table width="100%"/>').append(head).append(body)));
  */
    var m = moment(date,"YYYYMMDD-hhmmss");
    var head = $('<div/>').append($('<h5/>').text(m.format("DD/MM/YYYY hh:mm:ss") + " > " + user));
    var body = $('<div/>').append($('<h4/>').text(text));
    var row = $('<tr/>').append($('<td/>').append(head).append(body));
    $("#events").append(row);
  }
  
  function redrawTweet(){ 
  }
  
  function getTweet(){
    if(!position){
      refreshOngoing = false;
      return error("position not defined");
    }
    $.ajax({
        type: "POST",
        url: "get",
        data: { lng:position.longitude, lat:position.latitude }
      }).done(function( xml ) { 
        cleanTweet();
        $(xml).find('proxweet').each(
          function(elem){addTweet($(this).attr('date'),$(this).attr('user'),$(this).text());}
        );
        redrawTweet();
        refreshOngoing = false;
      }).fail(function(){
        refreshOngoing = false;
        serverError();
      });
  }
  
  function myPosition(p) {
    var infopos = "Position:\n";
    infopos += "Latitude : "+p.coords.latitude +"\n";
    infopos += "Longitude: "+p.coords.longitude+"\n";
    position = {latitude:p.coords.latitude,longitude:p.coords.longitude};
    getTweet();
  }
  
  function errPosition(error) {
    var info = "Error during the géolocalisation : ";
    switch(error.code) {
    case error.TIMEOUT:
      info += "Timeout !";
    break;
    case error.PERMISSION_DENIED:
    info += "Permission denied";
    break;
    case error.POSITION_UNAVAILABLE:
      info += "Position unavailable";
    break;
    case error.UNKNOWN_ERROR:
      info += "Unknown error";
    break;
    }
    error(info);
  }
  
  function refresh(){
    if(refreshOngoing) return;
    refreshOngoing = true;
    navigator.geolocation.getCurrentPosition(myPosition, errPosition,{timeout:20000});
  }
  
  this.refreshLoop = function(){
    refresh();
    setTimeout(that.refreshLoop,refreshTime);
  }
    
    
  this.pushTweet = function(user, text){
    if(!position) return error("position not defined");
    $.ajax({
      type: "POST",
      url: "post",
      data: { lng:position.longitude, lat:position.latitude, user: user, text: text }
    }).done(function( xml ) { 
      refresh();
    }).fail(serverError);
  }

	this.attemptLogout = function(){
		$.ajax({
			url: "/home",
			type: "POST",
			data: {logout : true},
			success: function(data){
	 			that.showLockedAlert('You are now logged out.<br>Redirecting you back to the homepage.');
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}

  
	this.showLockedAlert = function(msg){
		$('.modal-alert').modal({ show : false, keyboard : false, backdrop : 'static' });
		$('.modal-alert .modal-header h3').text('Success!');
		$('.modal-alert .modal-body p').html(msg);
		$('.modal-alert').modal('show');
		$('.modal-alert button').click(function(){window.location.href = '/';})
		setTimeout(function(){window.location.href = '/';}, 3000);
	}
  
}
