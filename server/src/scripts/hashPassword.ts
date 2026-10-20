import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Usage: npm run hash-password -w server -- "a-password-of-10+-chars"');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 12));
