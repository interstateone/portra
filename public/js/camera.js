// Generated by CoffeeScript 1.3.3
(function() {
  $(function() {
    var e, t, n, r, i, s, o, u, a, f, l, c, h, p, d, v, m, g;
    t = $('input[type="file"]');
    h = $(".shutter");
    n = $("canvas");
    c = $(".share");
    u = $(".locate");
    r = $("textarea");
    i = $(".caption");
    o = $(".counter");
    e = $(".prompt");
    v = $(".spinnerContainer");
    m = 0;
    g = void 0;
    a = void 0;
    d = {
      lines: 12,
      length: 11,
      width: 4,
      radius: 12,
      color: "#FFF",
      hwaccel: !0
    };
    p = new Spinner(d);
    if ("standalone" in window.navigator && !window.navigator.standalone) {
      h.hide();
      e.show();
    }
    h.on("touchend", function() {
      t.trigger("click");
      $.get("/twitter_config", function(e) {
        var t;
        m = 140 - parseInt($.parseJSON(e).characters_reserved_per_media, 10);
        0 < m && m < 140 || (m = 119);
        r.attr("maxLength", m);
        t = r.val() === "" ? r.attr("placeholder") : r.val();
        return o.text(t.length + "/" + m);
      });
      return _gaq.push([ "_trackEvent", "Photos", "Camera" ]);
    });
    r.on("keyup", function() {
      var e;
      e = r.val() === "" ? r.attr("placeholder") : r.val();
      return o.text(e.length + "/" + m);
    });
    t.on("change", function() {
      var e;
      n.show();
      h.prop("disabled", !0);
      p.spin(v[0]);
      h.animate({
        marginTop: window.innerHeight
      }, "swing");
      a = this.files[0];
      g = a.type;
      e = new FileReader;
      e.onload = s;
      e.readAsBinaryString(a);
      return Caman("#photo-canvas", function() {
        return this.exposure(10).saturation(10).colorize(255, 200, 0, 10).vignette("40%", 20).render(function() {
          console.log("finished");
          p.stop();
          h.prop("disabled", !1);
          c.prop("disabled", !1);
          return i.show();
        });
      });
    });
    s = function() {
      var e, t;
      e = EXIF.readFromBinaryFile(new BinaryFile(this.result));
      t = new MegaPixImage(a);
      return t.render(n[0], {
        maxWidth: 1e3,
        maxHeight: 1e3,
        orientation: e.Orientation
      });
    };
    c.on("click", function() {
      var e = this;
      console.log("tweeting photo");
      n.is(":visible") && n.animate({
        marginTop: "-2000px"
      }, "fast", function() {
        n.hide();
        i.hide();
        p.spin(v[0]);
        h.fadeOut("fast");
        f();
        return c.prop("disabled", !0);
      });
      return _gaq.push([ "_trackEvent", "Photos", "Tweet" ]);
    });
    f = function() {
      var e, t, i, s;
      console.log("getting location");
      t = null;
      i = null;
      navigator.geolocation.getCurrentPosition(function(e) {
        t = e.coords.latitude;
        return i = e.coords.longitude;
      });
      (function(e) {
        switch (e.code) {
         case e.TIMEOUT:
          return console.log("Geolocation error: Timeout");
         case e.POSITION_UNAVAILABLE:
          return console.log("Geolocation error: Position unavailable");
         case e.PERMISSION_DENIED:
          return console.log("Geolocation error: Permission denied");
         case e.UNKNOWN_ERROR:
          return console.log("Geolocation error: Unknown error");
        }
      });
      e = n[0].toDataURL();
      console.log("posting status");
      s = r.val() === "" ? r.attr("placeholder") : r.val();
      return $.post("/tweet", {
        status: s,
        photo: e,
        lat: t,
        "long": i
      }, function() {
        p.stop();
        v.html('<i class="icon-ok-sign" style="font-size: 300%; color: white;"></i>');
        return window.setTimeout(function() {
          v.html("");
          return l();
        }, 1e3);
      });
    };
    return l = function() {
      h.fadeIn("fast");
      h.animate({
        marginTop: "50%"
      });
      n.css("margin-top", "0px");
      i.hide();
      r.val("");
      return t.val("");
    };
  });
}).call(this);