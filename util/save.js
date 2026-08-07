const nextId = require('./id');

// util/id.js is max(id)+1, which is not atomic: two writes arriving together read
// the same maximum and pick the same id. Both model/user.js and model/cart.js have
// a unique index on `id`, which turns that into a duplicate-key error rather than
// two records sharing one - so recompute and retry. A handful of attempts is
// plenty even under the contention jest's parallel workers produce.
const MAX_ATTEMPTS = 5;

const isDuplicateKey = (err) => !!err && err.code === 11000;

// build(id) returns an unsaved document; the save is ours so we can retry it
const saveWithFreshId = (Model, build, attempt = 1) =>
	nextId(Model)
		.then((id) => build(id).save())
		.catch((err) => {
			if (isDuplicateKey(err) && attempt < MAX_ATTEMPTS) {
				return saveWithFreshId(Model, build, attempt + 1);
			}
			throw err;
		});

module.exports = saveWithFreshId;
