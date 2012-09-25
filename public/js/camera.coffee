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
  spinnerOptions =
    lines: 12
    length: 11
    width: 4
    radius: 12
    color: "#FFF"
    hwaccel: true
  spinner = new Spinner(spinnerOptions)

  if ("standalone" of window.navigator) and not window.navigator.standalone
    shutter.hide()
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
    photo = @files[0]
    type = photo.type
    reader = new FileReader()
    reader.onload = captureOrientation
    reader.readAsBinaryString(photo)

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

  populateCanvas = (data, exif) ->
    canvas.show()
    cvs = canvas[0]
    ctx = cvs.getContext("2d")
    img = new Image()
    img.src = 'data:' + type + ';base64,' + data
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

      if parseInt(exif.Orientation, 10) in [3,6,8]
        ctx.translate(cvs.width / 2, cvs.height / 2)
        switch parseInt(exif.Orientation, 10)
          when 6 then ctx.rotate(Math.PI / 2)
          when 3 then ctx.rotate(Math.PI)
          when 8 then ctx.rotate(Math.Pi * 3/2)
        ctx.translate(-cvs.width / 2, -cvs.height / 2)

      ctx.drawImage(img, 0, 0, cvs.width, cvs.height)
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

  captureOrientation = ->
    shutter.prop("disabled", true)
    spinner.spin(spinnerTarget[0])
    shutter.animate
      marginTop: window.innerHeight
    , "swing", =>
      exif = EXIF.readFromBinaryFile(new BinaryFile(@result))
      dataURI = base64_encode(@result)
      populateCanvas(dataURI, exif)

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

  base64_encode = (data) ->
    b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    i = 0
    ac = 0
    enc = ""
    tmp_arr = []
    return data unless data
    loop # pack three octets into four hexets
      o1 = data.charCodeAt(i++)
      o2 = data.charCodeAt(i++)
      o3 = data.charCodeAt(i++)
      bits = o1 << 16 | o2 << 8 | o3
      h1 = bits >> 18 & 0x3f
      h2 = bits >> 12 & 0x3f
      h3 = bits >> 6 & 0x3f
      h4 = bits & 0x3f

      # use hexets to index into b64, and append result to encoded string
      tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4)
      break unless i < data.length
    enc = tmp_arr.join("")
    r = data.length % 3
    (if r then enc.slice(0, r - 3) else enc) + "===".slice(r or 3)
