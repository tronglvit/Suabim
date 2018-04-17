/***
### minhpq's customize scripts
### (S) phamminh239
### Last modified : August 2017
***/

$(document).ready(function(){ 

	/*** Footer mobile ***/
	var ww = $(window).width();
	if (ww < 768 ){
		$('.foo-title').on('click', function(){
			$(this).next('.foo-content').slideToggle('fast');
		});
	} else {
		$('.foo-content').show();
	}



	/*** Fixed menu bar ***/
	var hh = $('.top-header').height() + $('.main-header').height();
	var h1 = $('header').height();
	var h2 = $('.top-header').height() + $('.main-header').height() + $('.site-nav-mobile').height();

	$(window).scroll(function(){
		if (ww >= 992){
			if($(this).scrollTop() > hh){
				$('.menu-header').addClass('sticky');
			} else {
				$('.menu-header').removeClass('sticky');
			}
		} else {
			if($(this).scrollTop() > hh){
				$('.menu-mobile .site-nav-mobile').addClass('sticky');
			} else {
				$('.menu-mobile .site-nav-mobile').removeClass('sticky');
			}
		}
	});

	/*** MENU MOBILE ***/
	if (ww < 992){
		$('.module-title').on('click', function(){
			$('.sidebar-menu-content').slideToggle('400');
		});
	}

	/*** MENU LIST MOBILE ***/
	if (ww < 1200){
		$('.sidebar_menu .module-content .fa-caret-right').on('click', function(){
			$(this).next('ul').slideToggle('400');
		});
	}

	/********** Thu gá»n **********/
	
	
	

	var menu_limit = "6";
	//	kiá»ƒm tra náº¿u ko pháº£i sá»‘ thÃ¬ assign == 5;
	if (isNaN(menu_limit)){
		menu_limit = 5;
	} else {
		// sá»‘ vá»‹ trÃ­ máº£ng = giÃ¡ trá»‹ - 1
		menu_limit = 5;
	}


	/*** menu list ***/
	var sidebar_length = $('.menu-item').length;
	//	thiáº¿t láº­p sá»‘ menu danh má»¥c hiá»ƒn thá»‹
	if (sidebar_length > (menu_limit + 1) ){
		$('.sidebar_menu .sidebar-linklists:not(.mobile-menu-linklists) > ul, .menu-list').each(function(){
			$('.menu-item',this).eq(menu_limit).nextAll().hide().addClass('toggleable');
			$(this).append('<li class="more"><a><label>Xem thÃªm ... </label></a></li>');
		});
		$('.sidebar_menu .sidebar-linklists:not(.mobile-menu-linklists) > ul, .menu-list').on('click','.more', function(){
			if($(this).hasClass('less')){
				$(this).html('<a><label>Xem thÃªm ...</label></a>').removeClass('less');
			} else {
				$(this).html('<a><label>Thu gá»n ... </label></a>').addClass('less');;
			}
			$(this).siblings('li.toggleable').slideToggle();
		});
	}
	 
});