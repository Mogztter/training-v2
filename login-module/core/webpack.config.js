const path = require('path');

module.exports = {
	entry: './src/index.js',
	output: {
		library: 'GraphAcademyCore',
		filename: 'graphacademy-core.js',
		path: path.resolve(__dirname, 'dist'),
	},
};
