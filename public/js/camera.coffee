$ ->
  camera = $("input[type=\"file\"]")
  shutter = $(".shutter")
  canvas = $("canvas")
  arrows = $(".arrows")
  shareBox = $(".share-box")
  share = $(".share")
  locateButton = $(".locate")
  caption = $("textarea")
  captionBox = $(".caption")
  counter = $(".counter")
  appPrompt = $(".prompt")
  spinnerTarget = $(".spinnerContainer")
  tweetLength = 0
  spinnerOptions =
    lines: 9 # The number of lines to draw
    length: 11 # The length of each line
    width: 4 # The line thickness
    radius: 12 # The radius of the inner circle
    corners: 1 # Corner roundness (0..1)
    rotate: 0 # The rotation offset
    color: "#FFF" # #rgb or #rrggbb
    speed: 1.2 # Rounds per second
    trail: 10 # Afterglow percentage
    hwaccel: true # Whether to use hardware acceleration
    className: "spinner" # The CSS class to assign to the spinner
    zIndex: 2e9 # The z-index (defaults to 2000000000)
  spinner = Spinner(spinnerOptions)

  if ("standalone" of window.navigator) and not window.navigator.standalone
    shutter.hide()
    appPrompt.show()

  shutter.on "touchend", (event) ->
    camera.trigger("click")
    $.get "/twitter_config", (data) ->
      tweetLength = 140 - parseInt($.parseJSON(data).characters_reserved_per_media, 10)
      caption.attr("maxLength", tweetLength)
      status = if caption.val() is "" then caption.attr("placeholder") else caption.val()
      counter.text(status.length + "/" + tweetLength)

    _gaq.push ["_trackEvent", "Photos", "Camera"]

  caption.on "keyup", ->
    status = if caption.val() is "" then caption.attr("placeholder") else caption.val()
    counter.text(status.length + "/" + tweetLength)

  camera.on "change", (event) ->
    photo = @files[0]
    reader = new FileReader()
    reader.onload = showSpinner
    reader.readAsDataURL(photo)

  $("body").hammer().bind "swipe", (event) ->
    if event.direction is "up"
      console.log "swiped up"
      if canvas.is(":visible")
        canvas.animate
          marginTop: "-2000px"
        , "fast", ->
          $(this).hide()
          captionBox.hide()
          spinner.spin(spinnerTarget[0])
          shutter.fadeOut("fast")
          arrows.hide()
          postPhoto()

      _gaq.push ["_trackEvent", "Photos", "Tweet"]

  showSpinner = (event) ->
    spinner.spin(spinnerTarget[0])
    shutter.animate
      marginTop: window.innerHeight
    , "swing", ->
      populateCanvas(event)

  populateCanvas = (event) ->
    shutter.prop("disabled", true)
    canvas.show()
    cvs = canvas[0]
    ctx = cvs.getContext("2d")
    img = new Image()
    img.src = event.target.result
    img.onload = ->
      ratio = 1
      maxWidth = 1000
      maxHeight = 1000
      if img.width > img.height
        if img.width > maxWidth
          cvs.height = maxWidth / img.width * img.height
          cvs.width = maxWidth
      else
        if img.height > maxHeight
          cvs.width = maxHeight / img.height * img.width
          cvs.height = maxHeight
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height)
      Caman "#photo-canvas", ->
        @.exposure(10)
          .saturation(10)
          .colorize(255, 200, 0, 10)
          .noise(1)
          .vignette("40%", 20)
          .render ->
            spinner.stop();
            shutter.prop("disabled", false)
            captionBox.show()
            arrows.show()

  postPhoto = ->
    console.log "getting location"
    latitude = undefined
    longitude = undefined
    endpoint = undefined
    base64 = undefined
    _this = this
    navigator.geolocation.getCurrentPosition (position) ->
      latitude = position.coords.latitude
      longitude = position.coords.longitude
    (error) ->
      switch error.code
        when error.TIMEOUT
          console.log "Geolocation error: Timeout"
        when error.POSITION_UNAVAILABLE
          console.log "Geolocation error: Position unavailable"
        when error.PERMISSION_DENIED
          console.log "Geolocation error: Permission denied"
        when error.UNKNOWN_ERROR
          console.log "Geolocation error: Unknown error"

    base64 = canvas[0].toDataURL()
    console.log "posting status"
    status = (if caption.val() is "" then caption.attr("placeholder") else caption.val())
    $.post "/tweet",
      status: status
      photo: base64
      lat: latitude
      long: longitude
    , (data) ->
      spinner.stop()
      spinnerTarget.html "<i class=\"icon-ok-sign\" style=\"font-size: 300%; color: white;\"></i>"
      window.setTimeout (->
        spinnerTarget.html ""
        resetPage()
      ), 1000

  resetPage = ->
    shutter.fadeIn("fast")
    shutter.animate(marginTop: "50%")
    canvas.css("margin-top", "0px")
    captionBox.hide()
    caption.val("")
    camera.val("")
