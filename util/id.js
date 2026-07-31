module.exports = (Model) =>
	Model.findOne({}, 'id')
		.sort({ id: -1 })
		.then((doc) => (doc ? doc.id + 1 : 1));
