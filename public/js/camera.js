// Generated by CoffeeScript 1.3.3
(function() {
  $(function() {
    var e, t, n, r, i, s, o, u, a, f, l, c, h, p, d, v;
    t = $('input[type="file"]');
    l = $(".shutter");
    n = $("canvas");
    f = $(".share");
    o = $(".locate");
    r = $("textarea");
    i = $(".caption");
    s = $(".counter");
    e = $(".prompt");
    p = $(".spinnerContainer");
    d = 0;
    v = void 0;
    h = {
      lines: 12,
      length: 11,
      width: 4,
      radius: 12,
      color: "#FFF",
      hwaccel: !0
    };
    c = new Spinner(h);
    if ("standalone" in window.navigator && !window.navigator.standalone) {
      l.hide();
      e.show();
    }
    l.on("touchend", function() {
      t.trigger("click");
      $.get("/twitter_config", function(e) {
        var t;
        d = 140 - parseInt($.parseJSON(e).characters_reserved_per_media, 10);
        0 < d && d < 140 || (d = 119);
        r.attr("maxLength", d);
        t = r.val() === "" ? r.attr("placeholder") : r.val();
        return s.text(t.length + "/" + d);
      });
      return _gaq.push([ "_trackEvent", "Photos", "Camera" ]);
    });
    r.on("keyup", function() {
      var e;
      e = r.val() === "" ? r.attr("placeholder") : r.val();
      return s.text(e.length + "/" + d);
    });
    t.on("change", function() {
      var e, t;
      t = this.files[0];
      v = t.type;
      e = new MegaPixImage(t);
      e.render(n[0], {
        maxWidth: 1e3,
        maxHeight: 1e3
      });
      return Caman("#photo-canvas", function() {
        return this.exposure(10).saturation(10).colorize(255, 200, 0, 10).vignette("40%", 20).render(function() {
          console.log("finished");
          c.stop();
          l.prop("disabled", !1);
          f.prop("disabled", !1);
          return i.show();
        });
      });
    });
    f.on("click", function() {
      var e = this;
      console.log("tweeting photo");
      n.is(":visible") && n.animate({
        marginTop: "-2000px"
      }, "fast", function() {
        n.hide();
        i.hide();
        c.spin(p[0]);
        l.fadeOut("fast");
        u();
        return f.prop("disabled", !0);
      });
      return _gaq.push([ "_trackEvent", "Photos", "Tweet" ]);
    });
    u = function() {
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
        c.stop();
        p.html('<i class="icon-ok-sign" style="font-size: 300%; color: white;"></i>');
        return window.setTimeout(function() {
          p.html("");
          return a();
        }, 1e3);
      });
    };
    return a = function() {
      l.fadeIn("fast");
      l.animate({
        marginTop: "50%"
      });
      n.css("margin-top", "0px");
      i.hide();
      r.val("");
      return t.val("");
    };
  });
}).call(this);