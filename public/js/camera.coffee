$ ->
  camera = $("input[type=\"file\"]")
  shutter = $(".shutter")
  canvas = $("canvas")
  share = $(".share")
  locateButton = $(".locate")
  caption = $("textarea")
  captionBox = $(".caption")
  counter = $(".counter")
  appPrompt = $(".prompt")
  spinnerTarget = $(".spinnerContainer")
  tweetLength = 0
  type = undefined
  photo = undefined
  spinnerOptions =
    lines: 12
    length: 11
    width: 4
    radius: 12
    color: "#FFF"
    hwaccel: true
  spinner = new Spinner(spinnerOptions)

  if ("standalone" of window.navigator) and not window.navigator.standalone
    appPrompt.show()

  shutter.on "touchend", ->
    camera.trigger("click")
    $.get "/twitter_config", (data) ->
      tweetLength = 140 - parseInt($.parseJSON(data).characters_reserved_per_media, 10)
      tweetLength = 119 unless 0 < tweetLength < 140
      caption.attr("maxLength", tweetLength)
      status = if caption.val() is "" then caption.attr("placeholder") else caption.val()
      counter.text(status.length + "/" + tweetLength)

    _gaq.push ["_trackEvent", "Photos", "Camera"]

  caption.on "keyup", ->
    status = if caption.val() is "" then caption.attr("placeholder") else caption.val()
    counter.text(status.length + "/" + tweetLength)

  camera.on "change", ->
    shutter.prop("disabled", true)
    spinner.spin(spinnerTarget[0])
    if window.orientation is 0
      newShutterHeight = window.innerHeight
    else
      newShutterHeight = window.innerWidth - shutter.height() / 4
    shutter.animate marginTop: newShutterHeight, "swing", =>
      canvas.show()
      photo = @files[0]
      type = photo.type
      reader = new FileReader()
      reader.onload = captureExifAndRender
      reader.readAsBinaryString(photo)

  canvas.on "rendered", ->
    Caman '#photo-canvas', ->
      @exposure(10)
        .saturation(10)
        .colorize(255, 200, 0, 10)
        .vignette("40%", 20)
        .render ->
          console.log 'finished'
          spinner.stop()
          shutter.prop("disabled", false)
          share.prop('disabled', false)
          captionBox.show()

  captureExifAndRender = ->
    exif = EXIF.readFromBinaryFile(new BinaryFile(@result))
    mpImg = new MegaPixImage(photo)
    mpImg.render canvas[0],
      maxWidth: 1000
      maxHeight: 1000
      orientation: exif.Orientation

  share.on 'click', ->
    console.log "tweeting photo"
    if canvas.is(":visible")
      canvas.animate
        marginTop: "-2000px"
      , "fast", =>
        canvas.hide()
        captionBox.hide()
        spinner.spin(spinnerTarget[0])
        shutter.fadeOut("fast")
        postPhoto()
        share.prop('disabled', true)
    _gaq.push ["_trackEvent", "Photos", "Tweet"]

  postPhoto = ->
    console.log "getting location"
    latitude = null
    longitude = null
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
    , ->
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
