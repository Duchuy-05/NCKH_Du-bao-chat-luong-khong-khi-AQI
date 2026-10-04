import test from 'node:test';
import assert from 'node:assert/strict';
import { User, UserRole } from '../src/models/entities/User.entity';

test('User entity has password hashing hook and safe object transformation', async () => {
  const user = new User();
  user.fullName = 'Test User';
  user.email = 'test@example.com';
  user.passwordHash = 'plainPassword123';
  user.role = UserRole.USER;
  user.isActive = true;

  await user.hashPasswordOnInsert();
  assert.notEqual(user.passwordHash, 'plainPassword123');
  
  const isMatch = await user.comparePassword('plainPassword123');
  assert.equal(isMatch, true);

  const safe = user.toSafeObject();
  assert.equal('passwordHash' in safe, false);
  assert.equal(safe.email, 'test@example.com');
});
