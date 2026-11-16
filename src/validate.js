// Server-side validation + sanitization (never trust the browser).
const clean = (v, max) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : ''; // non-strings (HPP arrays) become ''

function validateRegistration(b) {
  const d = {
    full_name: clean(b.full_name, 100),
    email: clean(b.email, 120).toLowerCase(),
    phone: clean(b.phone, 20).replace(/[\s-]/g, ''),
    university: clean(b.university, 120),
    department: clean(b.department, 100),
    semester: clean(b.semester, 2),
    team_name: clean(b.team_name, 80),
    member2_name: clean(b.member2_name, 100),
    transaction_id: clean(b.transaction_id, 64),
  };
  const e = {};
  if (d.full_name.length < 3) e.full_name = 'Please enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) e.email = 'Enter a valid email address.';
  if (!/^(\+92|0)?3\d{9}$/.test(d.phone)) e.phone = 'Enter a valid Pakistani mobile number.';
  if (d.university.length < 2) e.university = 'University name is required.';
  if (d.department.length < 2) e.department = 'Department is required.';
  if (!/^[1-8]$/.test(d.semester)) e.semester = 'Select a semester from 1 to 8.';
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(d.transaction_id)) e.transaction_id = 'Transaction ID must be 4-64 letters, numbers, - or _.';
  return { data: d, errors: e };
}
module.exports = { validateRegistration, clean };
