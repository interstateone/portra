$(function () {
    var camera = $('input[type="file"]'),
        shutter = $('.shutter'),
        canvas = $('canvas'),
        arrows = $('.arrows'),
        shareBox = $('.share-box'),
        share = $('.share'),
        locateButton = $('.locate'),
        caption = $('textarea'),
        captionBox = $('.caption'),
        counter = $('.counter'),
        appPrompt = $('.prompt'),
        spinner,
        tweetLength = 0,
        spinnerOptions = {
          lines: 9, // The number of lines to draw
          length: 11, // The length of each line
          width: 4, // The line thickness
          radius: 12, // The radius of the inner circle
          corners: 1, // Corner roundness (0..1)
          rotate: 0, // The rotation offset
          color: '#FFF', // #rgb or #rrggbb
          speed: 1.2, // Rounds per second
          trail: 10, // Afterglow percentage
          hwaccel: true, // Whether to use hardware acceleration
          className: 'spinner', // The CSS class to assign to the spinner
          zIndex: 2e9, // The z-index (defaults to 2000000000)
        },
        target = $('.spinnerContainer');

    if (("standalone" in window.navigator) && !window.navigator.standalone) {
      shutter.hide();
      appPrompt.show();
    }

    shutter.on('touchend', function (event) {
      camera.trigger('click');
      $.get('/twitter_config', function (data) {
        tweetLength = 140 - parseInt($.parseJSON(data).characters_reserved_per_media, 10);
        caption.attr('maxLength', tweetLength);
        var status = caption.val() == "" ? caption.attr('placeholder') : caption.val();
        counter.text(status.length + '/' + tweetLength);
      });
      _gaq.push(['_trackEvent', 'Photos', 'Camera']);
    });

    caption.on('keyup', function () {
      var status = caption.val() == "" ? caption.attr('placeholder') : caption.val();
      counter.text(status.length + '/' + tweetLength);
    });

    camera.on('change', function (event) {
      var photo = this.files[0];
      var reader = new FileReader();
      reader.onload = showSpinner;
      reader.readAsDataURL(photo);
    });

    $('body').hammer().bind('swipe', function (event) {
      if (event.direction == 'up') {
        console.log('swiped up');
        if (canvas.is(':visible')) {
          canvas.animate({marginTop: "-2000px"}, 'fast', function () {
            $(this).hide();
            captionBox.hide();
            spinner = new Spinner(spinnerOptions).spin(target[0]);
            shutter.fadeOut('fast');
            arrows.hide();
            postPhoto();
          });
        }
        _gaq.push(['_trackEvent', 'Photos', 'Tweet']);
      }
    });

    var showSpinner = function (event) {
      spinner = new Spinner(spinnerOptions).spin(target[0]);
      shutter.animate({marginTop: window.innerHeight}, 'swing', function () {
        populateCanvas(event);
      });
    };

    var populateCanvas = function (event) {
      shutter.prop('disabled', true);
      canvas.show();
      var cvs = canvas[0];
      var ctx = cvs.getContext('2d');
      var img = new Image();
      img.src = event.target.result;
      img.onload = function () {
        var ratio = 1,
          maxWidth = 1000
          maxHeight = 1000;

        if (img.width > img.height) {
          if (img.width > maxWidth) {
            cvs.height = maxWidth / img.width * img.height;
            cvs.width = maxWidth;
          }
        } else {
          if (img.height > maxHeight) {
            cvs.width = maxHeight / img.height * img.width;
            cvs.height = maxHeight;
          }
        }

        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.drawImage(img, 0, 0, cvs.width, cvs.height);

        Caman('#photo-canvas', function () {
          this.curves(['rgb'], [0, 0], [100, 80], [210, 245], [255, 255])
              .exposure(10)
              .saturation(-8)
              .colorize(255, 200, 0, 5)
              .noise(1)
              .vignette('40%', 18)
              .render( function () {
                spinner.stop();
                shutter.prop('disabled', false);
                captionBox.show();
                arrows.show();
              });
        });
      };
    }

    var postPhoto = function() {
      console.log('getting location');
      var latitude, longitude, endpoint, base64, _this = this;
      navigator.geolocation.getCurrentPosition( function (position) {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      });
      (function(error) {
        switch (error.code) {
          case error.TIMEOUT:
            return console.log('Geolocation error: Timeout');
          case error.POSITION_UNAVAILABLE:
            return console.log('Geolocation error: Position unavailable');
          case error.PERMISSION_DENIED:
            return console.log('Geolocation error: Permission denied');
          case error.UNKNOWN_ERROR:
            return console.log('Geolocation error: Unknown error');
        }
      });
      base64 = canvas[0].toDataURL();
      console.log('posting status');
      var status = caption.val() == "" ? caption.attr('placeholder') : caption.val();
      $.post('/tweet',
            {
              'status': status,
              'photo': base64,
              'lat': latitude,
              'long': longitude
            },
            function () {
              spinner.stop();
              target.html('<i class="icon-ok-sign" style="font-size: 300%; color: white;"></i>');
              window.setTimeout(function () {
                target.html('');
                resetPage();
              }, 1000);
            }
      );
    };

    var resetPage = function () {
      shutter.fadeIn('fast');
      shutter.animate({marginTop: '50%'});
      canvas.css('margin-top', '0px');
      captionBox.hide();
      caption.val('');
      camera.val('');
    };
  });
