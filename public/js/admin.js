(function () {
  var $ = function (s) { return document.querySelector(s); };
  var role = '', es = null, tab = 'dash', rows = [], toastT = null;

  function api(url, opt) {
    opt = opt || {}; opt.credentials = 'same-origin';
    opt.headers = Object.assign({ 'X-Requested-With': 'XMLHttpRequest' }, opt.headers || {});
    return fetch(url, opt).then(function (r) {
      if (r.status === 401 && url.indexOf('/login') < 0 && url.indexOf('/refresh') < 0) {
        return fetch('/api/admin/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
          .then(function (rr) { if (!rr.ok) throw new Error('auth'); return fetch(url, opt); });
      }
      return r;
    });
  }
  // JSON helper: resolves with data, rejects with Error(message)
  function j(url, method, body) {
    var opt = { method: method || 'GET' };
    if (body !== undefined) { opt.headers = { 'Content-Type': 'application/json' }; opt.body = JSON.stringify(body); }
    return api(url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || 'Request failed (' + r.status + ')');
        return d;
      });
    });
  }
  function show(on) { $('#login').hidden = on; $('#app').hidden = !on; }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function td(content) { var c = el('td'); if (content instanceof Node) c.appendChild(content); else c.textContent = content == null ? '' : content; return c; }
  function btn(text, cls, fn) { var b = el('button', text, cls); b.type = 'button'; b.onclick = fn; return b; }
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : '#'; }
  function link(text, url) { var a = el('a', text); a.href = safeUrl(url); a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  function copy(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Link copied'); }, function () { window.prompt('Copy this link:', text); });
  }
  function toast(m, bad) {
    var t = $('#toast'); t.textContent = m; t.className = 'show' + (bad ? ' bad' : '');
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = ''; }, 3200);
  }
  function fail(e) { if (e && e.message === 'auth') { show(false); toast('Session expired. Please sign in again.', true); } else toast((e && e.message) || 'Something went wrong', true); }
  function tag(status) { return el('span', status === 'verified' ? 'paid' : status, 'tag ' + status); }
  function table(heads, min) {
    var wrap = el('div', null, 'scroll'), t = el('table'), th = el('thead'), tr = el('tr');
    if (min) t.style.minWidth = min;
    heads.forEach(function (h) { tr.appendChild(el('th', h)); });
    th.appendChild(tr); t.appendChild(th); var tb = el('tbody'); t.appendChild(tb); wrap.appendChild(t);
    return { wrap: wrap, body: tb };
  }
  function note(tb, cols, text) { var tr = el('tr'), c = td(text); c.colSpan = cols; c.className = 'mu'; tr.appendChild(c); tb.appendChild(tr); }

  // ---- actions ----
  function removeP(r) {
    if (!confirm('Remove "' + r.full_name + '" (' + (r.reference || '-') + ')? Their registration, receipt and result will be deleted permanently.')) return;
    j('/api/admin/registrations/' + r.id, 'DELETE').then(function () { toast('Participant removed'); refresh(); }).catch(fail);
  }
  function setStatus(id, status) {
    j('/api/admin/registrations/' + id, 'PATCH', { status: status }).then(function () { toast('Payment updated'); refresh(); }).catch(fail);
  }

  // ---- Dashboard ----
  function renderDash() {
    var root = $('#t-dash');
    Promise.all([j('/api/admin/stats'), j('/api/admin/settings'), j('/api/admin/links')]).then(function (a) {
      var st = a[0], se = a[1], links = a[2], sa = role === 'superadmin';
      root.replaceChildren();
      var stats = el('div', null, 'stats');
      [['Participants', st.total], ['Paid (verified)', st.verified], ['Pending', st.pending], ['Rejected', st.rejected]].forEach(function (x) {
        var d = el('div', x[0], 'stat'); d.prepend(el('b', String(x[1]))); stats.appendChild(d);
      });
      root.appendChild(stats);

      var bd = el('div', null, 'box');
      bd.append(el('h2', 'Project submission (Drive link)'), el('p', 'Every participant sees this link in their portal as the "Open submission folder" button.', 'mu'));
      var rf = el('div', null, 'rowf'), di = el('input'); di.placeholder = 'https://drive.google.com/...'; di.value = se.driveLink || ''; di.maxLength = 500;
      rf.appendChild(di);
      if (sa) rf.appendChild(btn('Save', '', function () {
        j('/api/admin/settings', 'PUT', { driveLink: di.value.trim() }).then(function () { toast('Drive link saved'); }).catch(fail);
      })); else di.disabled = true;
      bd.appendChild(rf); root.appendChild(bd);

      var bl = el('div', null, 'box');
      bl.append(el('h2', 'Important links'), el('p', 'Share these. "Participants" links also appear in the participant portal.', 'mu'));
      var t = table(['Name', 'Link', 'Visible to', 'Actions'], '640px');
      [['Website (registration)', location.origin + '/'], ['Participant portal', location.origin + '/portal'], ['Results page', location.origin + '/results']].forEach(function (x) {
        var tr = el('tr'), acts = el('div');
        acts.append(link('Open', x[1]), document.createTextNode(' '), btn('Copy', 'g', function () { copy(x[1]); }));
        tr.append(td(x[0]), td(el('span', x[1], 'url')), td('built-in'), td(acts)); t.body.appendChild(tr);
      });
      links.forEach(function (l) {
        var tr = el('tr'), acts = el('div');
        acts.append(link('Open', l.url), document.createTextNode(' '), btn('Copy', 'g', function () { copy(l.url); }));
        if (sa) { acts.append(document.createTextNode(' '), btn('Delete', 'danger', function () {
          if (confirm('Delete this link?')) j('/api/admin/links/' + l.id, 'DELETE').then(renderDash).catch(fail);
        })); }
        tr.append(td(l.label), td(el('span', l.url, 'url')), td(l.is_public ? 'participants + admin' : 'admin only'), td(acts)); t.body.appendChild(tr);
      });
      bl.appendChild(t.wrap);
      if (sa) {
        var f = el('div', null, 'rowf'); f.style.marginTop = '14px';
        var ln = el('input'), lu = el('input'), ls = el('select');
        ln.placeholder = 'Name, e.g. WhatsApp group'; ln.maxLength = 80; lu.placeholder = 'https://...'; lu.maxLength = 500;
        [['1', 'Show to participants'], ['0', 'Admin only']].forEach(function (o) { var op = el('option', o[1]); op.value = o[0]; ls.appendChild(op); });
        f.append(ln, lu, ls, btn('Add link', '', function () {
          j('/api/admin/links', 'POST', { label: ln.value, url: lu.value, isPublic: ls.value === '1' }).then(function () { toast('Link added'); renderDash(); }).catch(fail);
        }));
        bl.appendChild(f);
      }
      root.appendChild(bl);

      var br = el('div', null, 'box');
      br.append(el('h2', 'Recent participants'), el('p', 'Added by mistake? Use Remove. See the Participants tab for the full list.', 'mu'));
      var rt = table(['Ref', 'Participant', 'Payment', 'Action'], '560px');
      rows.slice(0, 8).forEach(function (r) { rt.body.appendChild(partRow(r, true)); });
      if (!rows.length) note(rt.body, 4, 'No participants yet.');
      br.appendChild(rt.wrap); root.appendChild(br);
    }).catch(fail);
  }

  function partRow(r, compact) {
    var tr = el('tr'), who = el('div'), acts = el('div');
    who.append(el('b', r.full_name), el('br'), r.email);
    if (!compact) {
      who.append(el('br'), r.phone);
      if (r.team_name || r.member2_name) who.append(el('br'), 'Team: ' + (r.team_name || '-') + (r.member2_name ? ' + ' + r.member2_name : ''));
    }
    if (role === 'superadmin') acts.appendChild(btn('Remove', 'danger', function () { removeP(r); }));
    if (compact) tr.append(td(r.reference || '-'), td(who), td(tag(r.status)), td(acts));
    else tr.append(td(r.reference || '-'), td(who), td(r.university + ' · ' + r.department + ' · Sem ' + r.semester), td(r.transaction_id), td(tag(r.status)), td(new Date(r.created_at).toLocaleDateString()), td(acts));
    return tr;
  }

  // ---- Participants ----
  function renderParts() {
    var root = $('#t-parts'); root.replaceChildren();
    var hd = el('div', null, 'hd'), cnt = el('h2', ''), q = el('input');
    q.placeholder = 'Search name, email, reference, phone, transaction ID'; q.style.maxWidth = '380px';
    hd.append(cnt, q); root.appendChild(hd);
    var t = table(['Ref', 'Participant', 'University', 'Txn ID', 'Payment', 'Registered', 'Action'], '900px'); root.appendChild(t.wrap);
    function draw() {
      var s = q.value.trim().toLowerCase();
      var list = rows.filter(function (r) { return !s || [r.reference, r.full_name, r.email, r.phone, r.university, r.transaction_id, r.team_name].join(' ').toLowerCase().indexOf(s) >= 0; });
      cnt.textContent = 'Participants (' + list.length + ')'; t.body.replaceChildren();
      list.forEach(function (r) { t.body.appendChild(partRow(r, false)); });
      if (!list.length) note(t.body, 7, 'No participants found.');
    }
    q.oninput = draw; draw();
  }

  // ---- Payments ----
  function renderPay() {
    var root = $('#t-pay'); root.replaceChildren();
    var hd = el('div', null, 'hd'), sel = el('select');
    [['', 'All'], ['pending', 'Pending'], ['verified', 'Paid'], ['rejected', 'Rejected']].forEach(function (o) { var op = el('option', o[1]); op.value = o[0]; sel.appendChild(op); });
    hd.append(el('h2', 'Payment verification'), sel); root.appendChild(hd);
    root.appendChild(el('p', 'Open each receipt, compare it with the transaction ID and your bank/wallet, then mark it paid or reject it.', 'mu'));
    var t = table(['Ref', 'Participant', 'Txn ID', 'Receipt', 'Status', 'Actions'], '760px'); root.appendChild(t.wrap);
    function draw() {
      var list = rows.filter(function (r) { return !sel.value || r.status === sel.value; });
      t.body.replaceChildren();
      list.forEach(function (r) {
        var tr = el('tr'), who = el('div'), acts = el('div'), rc = el('a', 'View receipt');
        who.append(el('b', r.full_name), el('br'), r.phone);
        rc.href = '/api/admin/registrations/' + r.id + '/receipt'; rc.target = '_blank'; rc.rel = 'noopener';
        [['verified', 'Mark paid', 'ok'], ['rejected', 'Reject', 'no'], ['pending', 'Reset', 'g']].forEach(function (a) {
          if (r.status === a[0]) return; acts.append(btn(a[1], a[2], function () { setStatus(r.id, a[0]); }), document.createTextNode(' '));
        });
        tr.append(td(r.reference || '-'), td(who), td(r.transaction_id), td(rc), td(tag(r.status)), td(acts)); t.body.appendChild(tr);
      });
      if (!list.length) note(t.body, 6, 'No records.');
    }
    sel.onchange = draw; draw();
  }

  // ---- Results ----
  function renderRes() {
    var root = $('#t-res'); root.replaceChildren();
    j('/api/admin/settings').then(function (se) {
      var sa = role === 'superadmin', inputs = [];
      var hd = el('div', null, 'hd'), left = el('div'), right = el('div');
      left.append(el('h2', 'Results'), el('p', 'Status: ' + (se.resultsPublished ? 'PUBLISHED (visible to everyone on /results)' : 'Draft (nobody sees it yet)') + '. Positions 1, 2, 3 appear on the winners podium. Leave Position empty to keep someone off the list.', 'mu'));
      function collect() { return inputs.map(function (x) { return { id: x.id, rank: x.rank.value, score: x.score.value, remark: x.remark.value }; }); }
      if (sa) {
        right.append(btn('Save', 'g', function () { j('/api/admin/results', 'PUT', { items: collect() }).then(function () { toast('Results saved'); refresh(); }).catch(fail); }), document.createTextNode(' '),
          btn(se.resultsPublished ? 'Unpublish' : 'Publish results', se.resultsPublished ? 'danger' : 'ok', function () {
            var pub = !se.resultsPublished;
            if (pub && !confirm('Publish results? Everyone will be able to see them on the Results page.')) return;
            j('/api/admin/results', 'PUT', { items: collect() }).then(function () { return j('/api/admin/results/publish', 'POST', { published: pub }); })
              .then(function () { toast(pub ? 'Results published' : 'Results unpublished'); renderRes(); }).catch(fail);
          }));
      }
      hd.append(left, right); root.appendChild(hd);
      var t = table(['Ref', 'Participant', 'Payment', 'Position', 'Score', 'Remark'], '760px'); root.appendChild(t.wrap);
      var list = rows.slice().sort(function (a, b) { return (a.rank_pos == null ? 1e9 : a.rank_pos) - (b.rank_pos == null ? 1e9 : b.rank_pos) || a.full_name.localeCompare(b.full_name); });
      list.forEach(function (r) {
        var tr = el('tr'), ri = el('input'), si = el('input'), mi = el('input', null, 'rm');
        ri.type = 'number'; ri.min = '1'; ri.value = r.rank_pos == null ? '' : r.rank_pos;
        si.type = 'number'; si.step = '0.01'; si.min = '0'; si.value = r.score == null ? '' : r.score;
        mi.maxLength = 200; mi.placeholder = 'e.g. Winner'; mi.value = r.remark || '';
        if (!sa) { ri.disabled = si.disabled = mi.disabled = true; }
        inputs.push({ id: r.id, rank: ri, score: si, remark: mi });
        tr.append(td(r.reference || '-'), td(r.full_name), td(tag(r.status)), td(ri), td(si), td(mi)); t.body.appendChild(tr);
      });
      if (!list.length) note(t.body, 6, 'No participants yet.');
    }).catch(fail);
  }

  // ---- tabs / data ----
  function refresh() {
    return j('/api/admin/registrations').then(function (r) { rows = r; draw(); }).catch(fail);
  }
  function draw() {
    ['dash', 'parts', 'pay', 'res'].forEach(function (k) { $('#t-' + k).hidden = k !== tab; });
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    if (tab === 'dash') renderDash(); else if (tab === 'parts') renderParts(); else if (tab === 'pay') renderPay(); else renderRes();
  }
  document.querySelectorAll('#tabs button').forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; refresh(); }; });

  function live() {
    if (es) es.close();
    es = new EventSource('/api/admin/stream');
    es.onopen = function () { $('#live').textContent = '● live'; $('#live').className = 'live on'; };
    es.onerror = function () { $('#live').textContent = '● reconnecting'; $('#live').className = 'live'; };
    es.addEventListener('registration', function () { toast('New registration received'); refresh(); });
  }
  function enter(me) { role = me.role; $('#who').textContent = (me.email || '') + ' (' + me.role + ')'; show(true); refresh(); live(); }

  /* show/hide password + Enter to sign in */
  $('#eye').onclick = function () {
    var s = $('#pw').type === 'password';
    $('#pw').type = s ? 'text' : 'password';
    this.classList.toggle('show', s);
    this.setAttribute('aria-pressed', s);
    this.setAttribute('aria-label', s ? 'Hide password' : 'Show password');
  };
  ['#em', '#pw'].forEach(function (s) { $(s).addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#lb').click(); }); });
  $('#lb').onclick = function () {
    $('#lerr').textContent = '';
    j('/api/admin/login', 'POST', { email: $('#em').value, password: $('#pw').value })
      .then(function (d) { $('#pw').value = ''; enter(d); })
      .catch(function (e) { $('#lerr').textContent = e.message || 'Login failed.'; });
  };
  $('#lo').onclick = function () { api('/api/admin/logout', { method: 'POST' }).then(function () { if (es) es.close(); show(false); }); };

  api('/api/admin/me').then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('auth')); }).then(enter)
    .catch(function (e) { if (e && e.message === 'auth') show(false); else { show(false); $('#lerr').textContent = 'Could not reach the server.'; } });
})();
