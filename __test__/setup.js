const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
	dotenvExpand.expand(dotenv.config({ path: '.env.local' }));
}
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

mongoose.set('useFindAndModify', false);
mongoose.set('useUnifiedTopology', true);

jest.setTimeout(30000);

beforeAll(async () => {
	await mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });
});

afterAll(async () => {
	await mongoose.disconnect();
});
