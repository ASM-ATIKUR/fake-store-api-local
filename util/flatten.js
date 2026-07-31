module.exports = (obj, prefix = '', out = {}) => {
	for (const key of Object.keys(obj)) {
		const val = obj[key];
		const path = prefix ? `${prefix}.${key}` : key;
		if (val && typeof val === 'object' && !Array.isArray(val)) {
			module.exports(val, path, out);
		} else {
			out[path] = val;
		}
	}
	return out;
};
