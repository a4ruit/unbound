// The phone as a window into the world just past the monitor's right edge.
// Unity owns the simulation and streams the character's world position plus
// the "seam" (world X of the monitor's right edge). This page draws the slice
// of the world that begins at that seam.

(function () {
  'use strict';

  // ---- the two calibration knobs -----------------------------------------
  // WORLD_WIDTH: how many Unity units this phone screen spans.
  //   Bigger  = world looks smaller on the phone.
  //   Tune until the character is the same physical size as on the monitor.
  var WORLD_WIDTH = 6;

  // WORLD_CENTER_Y: the world Y sitting at the middle of the phone screen.
  //   Raise or lower until the floor lines up with the monitor's floor.
  var WORLD_CENTER_Y = 1;

  var CHAR_SIZE = 1;    // character size in world units (a 1-unit cube)

  // ---- state streamed from Unity ------------------------------------------
  var seam = 0;
  var floorY = 0;
  var target = { x: 0, y: 0 };   // latest position from Unity
  var shown = { x: 0, y: 0 };    // smoothed position we actually draw
  var haveData = false;

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var statusEl = document.getElementById('status');

  // ---- rendering -----------------------------------------------------------
  function frame() {
    var W = window.innerWidth;
    var H = window.innerHeight;
    var scale = W / WORLD_WIDTH;            // pixels per world unit

    // world -> screen
    function px(wx) { return (wx - seam) * scale; }
    function py(wy) { return H / 2 - (wy - WORLD_CENTER_Y) * scale; }

    ctx.clearRect(0, 0, W, H);

    // The ground, continuing past the monitor.
    var groundTop = py(floorY);
    ctx.fillStyle = '#ededed';
    ctx.fillRect(0, groundTop, W, H - groundTop);

    if (haveData) {
      // Smooth the 30 Hz stream up to the display's frame rate.
      shown.x += (target.x - shown.x) * 0.5;
      shown.y += (target.y - shown.y) * 0.5;

      // Drawn even when partly off-screen, so it straddles the seam as it
      // crosses instead of popping into view.
      var size = CHAR_SIZE * scale;
      ctx.fillStyle = '#111111';
      ctx.fillRect(px(shown.x) - size / 2, py(shown.y) - size / 2, size, size);
    }

    requestAnimationFrame(frame);
  }

  // ---- connection ----------------------------------------------------------
  function connect() {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var ws = new WebSocket(proto + '//' + location.host + '/ws');

    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type !== 'world') return;

      seam = msg.seam;
      floorY = msg.floor;
      target.x = msg.x;
      target.y = msg.y;

      if (!haveData) {            // first packet: jump rather than glide in
        shown.x = target.x;
        shown.y = target.y;
        haveData = true;
        statusEl.classList.add('hidden');
      }
    };

    ws.onclose = function () { setTimeout(connect, 2000); };
  }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize);
  resize();
  connect();
  requestAnimationFrame(frame);

  // Live calibration from the browser console while the phone is in place:
  //   setWorldWidth(7)   setCenterY(0.5)
  window.setWorldWidth = function (n) { WORLD_WIDTH = n; };
  window.setCenterY = function (n) { WORLD_CENTER_Y = n; };
})();
