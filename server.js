const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const fs = require('fs');
const app = require('./app');

if (fs.existsSync('.env.local')) {
	dotenvExpand.expand(dotenv.config({ path: '.env.local' }));
}
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const port = process.env.PORT || 6400;

mongoose.set('useFindAndModify', false);
mongoose.set('useUnifiedTopology', true);
mongoose
	.connect(process.env.DATABASE_URL, { useNewUrlParser: true })
	.then(() => {
		app.listen(port, () => {
			console.log(`Server running at http://localhost:${port}`);
		});
	})
	.catch((err) => {
		console.log(err);
	});
