(function () {
  'use strict'

  // menu js 
//   $('a[data-bs-toggle="dropdown"]').on('show.bs.dropdown', function () {
//     $(this).parents().find("nav").addClass("overflow_none");
//     $(this).parents().find(".nav-scroller").addClass('move-down');
// })

// $('a[data-bs-toggle="dropdown"]').on('hide.bs.dropdown', function () {
//     $(this).parents().find("nav").removeClass("overflow_none");
//     $(this).parents().find(".nav-scroller").removeClass('move-down');
// })
  $('a[data-bs-toggle="dropdown"]').click(function() {
    if ($(this).hasClass('show')){
      $(this).parents().find("nav").addClass("overflow_none");
      $(this).parents().find(".nav-scroller").addClass('move-down');
    } else {
      $(this).parents().find("nav").removeClass("overflow_none");
      $(this).parents().find(".nav-scroller").removeClass('move-down');
    }
  });


  document.querySelector('#navbarSideCollapse').addEventListener('click', function () {
    document.querySelector('.offcanvas-collapse').classList.toggle('open')
  })

})()
