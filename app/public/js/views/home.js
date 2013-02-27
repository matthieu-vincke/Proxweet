
$(document).ready(function(){

	var hc = new HomeController();
  $('#proxweet').keyup(function(e){
    if(e.keyCode == 13){
      hc.pushTweet($('#user').val(),$('#proxweet').val());
      $('#proxweet').val('');
    }
  });

	$('.modal-alert').modal({ show : false, keyboard : true, backdrop : true });
	$('.modal-alert .modal-header h3').text('Server error');
	$('.modal-alert .modal-body p').html('Unable to contact the server');
	$('.modal-alert #ok').html('Ok');
  hc.refreshLoop();
})