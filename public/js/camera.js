// Generated by CoffeeScript 1.3.3
(function() {
  $(function() {
    var e, t, n, r, i, s, o, u, a, f, l, c, h, p, d, v, m, g, y;
    n = $('input[type="file"]');
    d = $(".shutter");
    r = $("canvas");
    t = $(".arrows");
    h = $(".share-box");
    c = $(".share");
    u = $(".locate");
    i = $("textarea");
    s = $(".caption");
    o = $(".counter");
    e = $(".prompt");
    g = $(".spinnerContainer");
    y = 0;
    m = {
      lines: 9,
      length: 11,
      width: 4,
      radius: 12,
      corners: 1,
      rotate: 0,
      color: "#FFF",
      speed: 1.2,
      trail: 10,
      hwaccel: !0,
      className: "spinner",
      zIndex: 2e9
    };
    v = Spinner(m);
    if ("standalone" in window.navigator && !window.navigator.standalone) {
      d.hide();
      e.show();
    }
    d.on("touchend", function(e) {
      n.trigger("click");
      $.get("/twitter_config", function(e) {
        var t;
        y = 140 - parseInt($.parseJSON(e).characters_reserved_per_media, 10);
        i.attr("maxLength", y);
        t = i.val() === "" ? i.attr("placeholder") : i.val();
        return o.text(t.length + "/" + y);
      });
      return _gaq.push([ "_trackEvent", "Photos", "Camera" ]);
    });
    i.on("keyup", function() {
      var e;
      e = i.val() === "" ? i.attr("placeholder") : i.val();
      return o.text(e.length + "/" + y);
    });
    n.on("change", function(e) {
      var t, n;
      t = this.files[0];
      n = new FileReader;
      n.onload = p;
      return n.readAsDataURL(t);
    });
    $("body").hammer().bind("swipe", function(e) {
      if (e.direction === "up") {
        console.log("swiped up");
        r.is(":visible") && r.animate({
          marginTop: "-2000px"
        }, "fast", function() {
          $(this).hide();
          s.hide();
          v.spin(g[0]);
          d.fadeOut("fast");
          t.hide();
          return f();
        });
        return _gaq.push([ "_trackEvent", "Photos", "Tweet" ]);
      }
    });
    p = function(e) {
      v.spin(g[0]);
      return d.animate({
        marginTop: window.innerHeight
      }, "swing", function() {
        return a(e);
      });
    };
    a = function(e) {
      var n, i, o;
      d.prop("disabled", !0);
      r.show();
      i = r[0];
      n = i.getContext("2d");
      o = new Image;
      o.src = e.target.result;
      return o.onload = function() {
        var e, r, u;
        u = 1;
        r = 1e3;
        e = 1e3;
        if (o.width > o.height) {
          if (o.width > r) {
            i.height = r / o.width * o.height;
            i.width = r;
          }
        } else if (o.height > e) {
          i.width = e / o.height * o.width;
          i.height = e;
        }
        n.clearRect(0, 0, i.width, i.height);
        n.drawImage(o, 0, 0, i.width, i.height);
        return Caman("#photo-canvas", function() {
          return this.exposure(10).saturation(10).colorize(255, 200, 0, 10).noise(1).vignette("40%", 20).render(function() {
            v.stop();
            d.prop("disabled", !1);
            s.show();
            return t.show();
          });
        });
      };
    };
    f = function() {
      var e, t;
      console.log("getting location");
      navigator.geolocation.getCurrentPosition(function(e) {
        var t, n;
        t = e.coords.latitude;
        return n = e.coords.longitude;
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
      e = r[0].toDataURL();
      console.log("posting status");
      t = i.val() === "" ? i.attr("placeholder") : i.val();
      return $.post("/tweet", {
        status: t,
        photo: e,
        lat: latitude,
        "long": longitude
      }, function(e) {
        v.stop();
        g.html('<i class="icon-ok-sign" style="font-size: 300%; color: white;"></i>');
        return window.setTimeout(function() {
          g.html("");
          return l();
        }, 1e3);
      });
    };
    return l = function() {
      d.fadeIn("fast");
      d.animate({
        marginTop: "50%"
      });
      r.css("margin-top", "0px");
      s.hide();
      i.val("");
      return n.val("");
    };
  });
}).call(this);