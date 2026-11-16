(function () {
  var out = document.getElementById('out');
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function msg(t) { out.replaceChildren(); var p = el('div', t, 'panel'); out.appendChild(p); }
  var MEDAL = { 1: '1st', 2: '2nd', 3: '3rd' };
  fetch('/api/results', { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (d) {
      if (!d.published || !d.results.length) return msg('Results have not been announced yet. Please check back soon.');
      out.replaceChildren();
      var top = d.results.filter(function (r) { return r.position <= 3; });
      if (top.length) {
        var pod = el('div', null, 'podium');
        top.forEach(function (r) {
          var c = el('div', null, 'pod p' + r.position);
          c.append(el('div', MEDAL[r.position], 'm'), el('h3', r.full_name), el('div', r.university, 'mu'));
          if (r.team_name) c.appendChild(el('div', 'Team: ' + r.team_name, 'mu'));
          if (r.score != null) c.appendChild(el('div', 'Score: ' + r.score));
          if (r.remark) c.appendChild(el('div', r.remark, 'mu'));
          pod.appendChild(c);
        });
        out.appendChild(pod);
      }
      var wrap = el('div', null, 'scroll'), t = el('table'), th = el('thead'), tr = el('tr');
      ['Position', 'Participant', 'University', 'Team', 'Score', 'Remark'].forEach(function (h) { tr.appendChild(el('th', h)); });
      th.appendChild(tr); t.appendChild(th);
      var tb = el('tbody');
      d.results.forEach(function (r) {
        var x = el('tr');
        [r.position, r.full_name, r.university, r.team_name || '', r.score == null ? '' : r.score, r.remark || ''].forEach(function (v, i) {
          x.appendChild(el('td', String(v), i === 0 ? 'n' : ''));
        });
        tb.appendChild(x);
      });
      t.appendChild(tb); wrap.appendChild(t); out.appendChild(wrap);
    })
    .catch(function () { msg('Could not load results. Please try again later.'); });
})();
