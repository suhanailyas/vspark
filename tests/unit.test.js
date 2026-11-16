const test = require('node:test');
const assert = require('node:assert');
const { validateRegistration } = require('../src/validate');
const { detect } = require('../src/upload');

const good = { full_name: 'Ayesha Khan', email: 'Ayesha@Example.com', phone: '0300-1234567', university: 'COMSATS', department: 'SE', semester: '5', transaction_id: 'TX12345' };

test('valid registration passes and is normalised', () => {
  const { data, errors } = validateRegistration(good);
  assert.deepStrictEqual(errors, {});
  assert.strictEqual(data.email, 'ayesha@example.com');
  assert.strictEqual(data.phone, '03001234567');
});
test('bad email, phone, semester and transaction id are rejected', () => {
  const { errors } = validateRegistration({ ...good, email: 'x', phone: '123', semester: '9', transaction_id: "1' OR 1=1" });
  assert.ok(errors.email && errors.phone && errors.semester && errors.transaction_id);
});
test('HTTP parameter pollution (array values) is rejected', () => {
  const { errors } = validateRegistration({ ...good, full_name: ['a', 'b'] });
  assert.ok(errors.full_name);
});
test('control characters are stripped', () => {
  const { data } = validateRegistration({ ...good, full_name: 'Ali\u0000 Raza\n' });
  assert.strictEqual(data.full_name, 'Ali Raza');
});
test('file type is decided by real signature, not by name', () => {
  assert.strictEqual(detect(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d])).ext, 'png');
  assert.strictEqual(detect(Buffer.from([0xff, 0xd8, 0xff, 0xe0])).ext, 'jpg');
  assert.strictEqual(detect(Buffer.from('%PDF-1.7')).ext, 'pdf');
  assert.strictEqual(detect(Buffer.from('MZ\x90\x00 fake.png')), null);
  assert.strictEqual(detect(Buffer.from('<script>alert(1)</script>')), null);
});
