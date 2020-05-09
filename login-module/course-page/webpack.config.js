const path = require('path');

module.exports = {
	entry: './src/index.js',
	output: {
		library: 'GraphAcademyCoursePageV2',
		filename: 'graphacademy-course-v2.js',
		path: path.resolve(__dirname, 'dist'),
	},
};
