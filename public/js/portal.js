(function () {
  var $ = function (s) { return document.querySelector(s); };
  var STATUS = {
    pending: ['Pending', 'Your payment has not been verified yet. The organizers are checking your receipt.'],
    verified: ['Paid', 'Your payment is verified. You are confirmed for the competition.'],
    rejected: ['Rejected', 'Your payment could not be verified. Please contact the organizers with a correct receipt.']
  };
  function api(url, opt) {
    opt = opt || {}; opt.credentials = 'same-origin';
    opt.headers = Object.assign({ 'X-Requested-With': 'XMLHttpRequest' }, opt.headers || {});
    return fetch(url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.message || 'Request failed'); e.status = r.status; throw e; }
        return d;
      });
    });
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : '#'; }
  function panel(title) { var p = el('div', null, 'panel'); p.appendChild(el('h2', title)); return p; }

  function render(d) {
    var p = d.participant, out = $('#out'); out.replaceChildren();
    $('#login').hidden = true; $('#app').hidden = false;
    out.appendChild(el('h1', 'Welcome, ' + p.name));

    var a = panel('Your registration');
    a.append(el('div', p.reference, 'refno'), el('p', p.email + ' · ' + p.university + ' · ' + p.department, 'mu'));
    if (p.team || p.member2) a.appendChild(el('p', 'Team: ' + (p.team || '-') + (p.member2 ? ' + ' + p.member2 : ''), 'mu'));
    out.appendChild(a);

    var s = STATUS[p.status] || STATUS.pending, b = panel('Payment status');
    b.append(el('span', s[0], 'tag ' + p.status), el('p', s[1]));
    b.lastChild.style.marginTop = '10px';
    out.appendChild(b);

    var c = panel('Project submission');
    if (d.driveLink) {
      c.appendChild(el('p', 'Upload your project to the shared Drive folder below.', 'mu'));
      var l = el('a', 'Open submission folder', 'btnl'); l.href = safeUrl(d.driveLink); l.target = '_blank'; l.rel = 'noopener noreferrer'; c.appendChild(l);
    } else c.appendChild(el('p', 'The submission link has not been shared yet. Please check back later.', 'mu'));
    out.appendChild(c);

    if (d.links.length) {
      var k = panel('Important links');
      d.links.forEach(function (x) { var a2 = el('a', x.label, 'lnk'); a2.href = safeUrl(x.url); a2.target = '_blank'; a2.rel = 'noopener noreferrer'; k.appendChild(a2); });
      out.appendChild(k);
    }

    var r = panel('Result');
    if (d.result) {
      r.appendChild(el('p', 'Position: ' + d.result.position + (d.result.score != null ? '   |   Score: ' + d.result.score : '')));
      if (d.result.remark) r.appendChild(el('p', d.result.remark, 'mu'));
    } else r.appendChild(el('p', d.resultsPublished ? 'You are not on the published list.' : 'Results have not been published yet.', 'mu'));
    var ra = el('a', 'View full results'); ra.href = '/results'; r.appendChild(ra);
    out.appendChild(r);
  }

  function load() { return api('/api/portal/me').then(render); }
  function signIn() {
    $('#lerr').textContent = '';
    api('/api/portal/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('#em').value, reference: $('#rf').value }) })
      .then(load).catch(function (e) { $('#lerr').textContent = e.message || 'Sign in failed.'; });
  }
  $('#lb').onclick = signIn;
  ['#em', '#rf'].forEach(function (q) { $(q).addEventListener('keydown', function (e) { if (e.key === 'Enter') signIn(); }); });
  $('#lo').onclick = function () { api('/api/portal/logout', { method: 'POST' }).then(function () { location.reload(); }); };
  load().catch(function () { $('#login').hidden = false; });
})();
