export default class GraphAcademyEnrollmentPageV2 {
	constructor(core, options) {
		this.core = core;
		this.options = options;
	}

	async init() {
		const result = await core.checkSession();
		if (result) {
			const accessToken = result.accessToken;
			// TODO
		}
	}
}
