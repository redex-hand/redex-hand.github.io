document.addEventListener('DOMContentLoaded', function() {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var illustrations = Array.from(document.querySelectorAll('[data-story-animation]'));
  var visibleIllustrations = new Set();

  if (!('IntersectionObserver' in window)) return;

  function updateMotion() {
    illustrations.forEach(function(illustration) {
      illustration.classList.toggle('is-animating',
        visibleIllustrations.has(illustration) && !document.hidden && !reducedMotion.matches);
    });
  }
  var animationObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) visibleIllustrations.add(entry.target);
      else visibleIllustrations.delete(entry.target);
    });
    updateMotion();
  }, { threshold: 0 });
  illustrations.forEach(function(illustration) { animationObserver.observe(illustration); });
  document.addEventListener('visibilitychange', updateMotion);
  reducedMotion.addEventListener('change', updateMotion);
});

// A one-joint virtual spring: fixed pose and stiffness, variable contact force.
document.addEventListener('DOMContentLoaded', function() {
  var demo = document.querySelector('[data-spring-demo]');
  if (!demo) return;
  var slider = demo.querySelector('input');
  var toggle = demo.querySelector('[data-spring-toggle]');
  var virtualFinger = demo.querySelector('[data-virtual-finger]');
  var forceVector = demo.querySelector('[data-force-vector]');
  var halo = demo.querySelector('[data-force-halo]');
  var arc = demo.querySelector('[data-target-arc]');
  var coil = demo.querySelector('[data-torsion-coil]');
  var leader = demo.querySelector('[data-target-leader]');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var automatic = !reducedMotion.matches;
  var visible = false;
  var frame = null;
  var lastTime = null;
  var elapsed = Math.acos(1 - 2 * Number(slider.value) / 100) / (Math.PI * 2) * 9000;
  var startAngle = Math.atan2(-105, 195);

  function render(load) {
    // Relative illustration, not measured sensor data or controller parameters.
    var offset = load * 0.245;
    virtualFinger.setAttribute('transform', 'rotate(' + (offset * 180 / Math.PI).toFixed(3) + ' 155 240)');
    var forceEnd = 350 + load * 123;
    forceVector.setAttribute('d', 'M350 135H' + forceEnd + 'm-8-5 8 5-8 5');
    forceVector.style.opacity = Math.min(1, load * 12);
    halo.setAttribute('r', 10 + load * 10);
    halo.style.opacity = load * 0.22;
    var r = 69;
    var x1 = 155 + Math.cos(startAngle) * r;
    var y1 = 240 + Math.sin(startAngle) * r;
    var x2 = 155 + Math.cos(startAngle + offset) * r;
    var y2 = 240 + Math.sin(startAngle + offset) * r;
    arc.setAttribute('d', 'M' + x1 + ' ' + y1 + 'A' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + y2);
    var spiral = '';
    for (var i = 0; i <= 64; i++) {
      var t = i / 64;
      var angle = startAngle + t * (Math.PI * 3.3 + offset);
      var radius = 17 + t * 10;
      spiral += (i ? 'L' : 'M') + (155 + Math.cos(angle) * radius).toFixed(2) + ' ' + (240 + Math.sin(angle) * radius).toFixed(2);
    }
    coil.setAttribute('d', spiral);
    var tipX = 155 + 195 * Math.cos(offset) + 105 * Math.sin(offset);
    var tipY = 240 + 195 * Math.sin(offset) - 105 * Math.cos(offset);
    leader.setAttribute('d', 'M381 248L' + (tipX + 10) + ' ' + (tipY + 10));
    slider.setAttribute('aria-valuetext', (load < .33 ? 'Low' : load < .67 ? 'Moderate' : 'High') + ' illustrative contact load');
  }

  function updateToggle() {
    toggle.classList.toggle('is-paused', !automatic);
    var label = automatic ? 'Pause spring animation' : 'Animate contact load';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }
  function tick(time) {
    if (lastTime !== null) elapsed += Math.min(64, time - lastTime);
    lastTime = time;
    var phase = (elapsed % 9000) / 9000;
    var load = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    slider.value = Math.round(load * 100);
    render(load);
    frame = requestAnimationFrame(tick);
  }
  function updatePlayback() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    if (automatic && visible && !document.hidden) frame = requestAnimationFrame(tick);
    updateToggle();
  }
  slider.addEventListener('input', function() {
    automatic = false;
    render(Number(slider.value) / 100);
    updatePlayback();
  });
  toggle.addEventListener('click', function() {
    automatic = !automatic;
    // Resume at the selected load, avoiding a sudden target jump.
    var normalized = Math.max(0, Math.min(1, Number(slider.value) / 100));
    elapsed = Math.acos(1 - 2 * normalized) / (Math.PI * 2) * 9000;
    updatePlayback();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(entries) {
      visible = entries[0].isIntersecting;
      updatePlayback();
    }).observe(demo);
  }
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', function() {
    automatic = !reducedMotion.matches;
    updatePlayback();
  });
  render(Number(slider.value) / 100);
  updateToggle();
});
