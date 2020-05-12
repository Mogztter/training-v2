// -- class.js
var STAGE = "{{STAGE}}";
var API_BASE_URL = "{{API_BASE_URL}}";
var LOGIN_REDIRECT_URL = "{{LOGIN_REDIRECT_URL}}" // https://neo4j.com/graphacademy/online-training/data-science/
var INTERCOM_TRACK_EVEN = "{{INTERCOM_TRACK_EVENT}}" // 'training-data-science-view'
var LOCALSTORAGE_KEY_PREFIX = "{{LOCALSTORAGE_KEY_PREFIX}}" // com.neo4j.graphacademy.neo4jadministration.
var LOCALSTORAGE_QUIZES_STATUS_KEY = LOCALSTORAGE_KEY_PREFIX + STAGE + '.quizes'

function getClassCertificate(accessToken) {
	return $.ajax
	({
		type: "POST",
		url: API_BASE_URL + "/genClassCertificate",
		contentType: "application/json",
		dataType: 'json',
		async: true,
		data: JSON.stringify(
			{
				"className": window.trainingClassName
			}),
		headers: {
			"Authorization": accessToken
		}
	});
}

function getEnrollmentForClass(accessToken) {
	return $.ajax
	({
		type: "GET",
		url: API_BASE_URL + "/getClassEnrollment?className=" + window.trainingClassName,
		async: true,
		headers: {
			"Authorization": accessToken
		}
	});
}

function enrollStudentInClass(firstName, lastName, accessToken) {
	return $.ajax
	({
		type: "POST",
		url: API_BASE_URL + "/setClassEnrollment",
		contentType: "application/json",
		dataType: 'json',
		async: true,
		data: JSON.stringify(
			{
				"className": window.trainingClassName,
				"firstName": firstName,
				"lastName": lastName
			}),
		headers: {
			"Authorization": accessToken
		}
	});
}

function logTrainingView(accessToken) {
	return $.ajax
	({
		type: "POST",
		url: API_BASE_URL + "/logTrainingView",
		contentType: "application/json",
		dataType: 'json',
		async: true,
		data: JSON.stringify(
			{
				"className": window.trainingClassName,
				"partName": window.trainingPartName || 'uknown'
			}),
		headers: {
			"Authorization": accessToken
		}
	});
}

// -- quizes.js

var quizesStatus = {};

$(".quiz-progress").find("li").css("cssText", "list-style-image: none !important");
$(".quiz-progress").find("li i").addClass("fa");
$(".quiz-progress").find("li i").addClass("fa-li");
$(".quiz-progress").find("li i").addClass("fa-circle-thin");

var quizesCookie = window.localStorage.getItem(LOCALSTORAGE_QUIZES_STATUS_KEY);
if (quizesCookie) {
	quizesStatus = JSON.parse(quizesCookie);
	updateQuizStatus();
}


$('.next-section').click(function (event) {
	event.preventDefault();

	var hrefSuccess = event.target.href;
	var quizSuccess = gradeQuiz($(".quiz").first()); // gradeQuiz($( this ).closest(".quiz"));
	if (quizSuccess) {
		$("#submit-message").remove();
	} else {
		$(".next-section").before("<div id='submit-message'><p id='submit-message'><span style='color: red'>Please correct errors</span> in quiz responses above to continue.  Questions with incorrect responses are highlighted in <span style='color: red'>red</span>.</p></div>");
		$("#submit-message").append("<div class='paragraph'><a href='" + hrefSuccess + "'>Click here</a> if you wish to advance to next section without passing the quiz.</div>")
	}
	var updateResponse = updateQuizStatus();
	postQuizStatus(updateResponse['passed'], updateResponse['failed']).then(
		function () {
			if (quizSuccess) {
				document.location = hrefSuccess;
			}
		}
	);
});

function gradeQuiz(theQuiz) {
	var quizName = theQuiz.attr("id");
	var quizSuccess = true;

	if (quizName in quizesStatus && quizesStatus[quizName]) {
		return true;
	}

	theQuiz.find("h3").css("color", "#525865");

	theQuiz.find(".required-answer").each(function () {
		if (!$(this).prev(":checkbox").prop("checked")) {
			$(this).closest(".ulist").siblings("h3").css("color", "red");
			quizSuccess = false;
		}
	});
	theQuiz.find(".false-answer").each(function () {
		if ($(this).prev(":checkbox").prop("checked")) {
			$(this).closest(".ulist").siblings("h3").css("color", "red");
			quizSuccess = false;
		}
	});
	quizesStatus[quizName] = quizSuccess;
	return quizSuccess;
}

function postQuizStatus(passed, failed, accessToken) {
	return $.ajax
	({
		type: "POST",
		url: API_BASE_URL + "/setQuizStatus",
		contentType: "application/json",
		dataType: 'json',
		async: true,
		data: JSON.stringify(
			{
				"className": window.trainingClassName,
				"passed": passed,
				"failed": failed
			}),
		headers: {
			"Authorization": accessToken
		}
	});
}

function getQuizStatusRemote(accessToken) {
	return $.ajax
	({
		type: "GET",
		url: API_BASE_URL + "/getQuizStatus?className=" + window.trainingClassName,
		contentType: "application/json",
		dataType: 'json',
		async: true,
		headers: {
			"Authorization": accessToken
		}
	});
}

function updateQuizStatus() {
	passedArray = []
	failedArray = []
	for (quizName in quizesStatus) {
		$("#" + quizName + "-progress").removeClass("fa-circle-thin");
		$("#" + quizName + "-progress").removeClass("fa-close");
		$("#" + quizName + "-progress").removeClass("fa-check");

		if (quizesStatus[quizName]) {
			passedArray.push(quizName);
			$('#menu-' + quizName + ' .fa-stack').css('color', 'green');
			$('#menu-' + quizName + ' .fa-stack-1x').html('<span class="fa fa-check" style="padding-top: 6px"></span>');
			$("#" + quizName + "-progress").css("color", "green");
			$("#" + quizName + "-progress").addClass("fa-check");
		} else {
			failedArray.push(quizName);
			$("#" + quizName + "-progress").css("color", "red");
			$("#" + quizName + "-progress").addClass("fa-close");
		}
	}
	if (passedArray.length == 7) {
		$('#module-8').find('#quizes-result').html("<p>All quizes taken successfully.</p>");
	} else {
		$('#module-8').find('#quizes-result').html("<p>Some quizes not answered successfully.  Return to course modules by clicking on the numbers  in the navigation at the top of the page.</p>");
	}
	return { "passed": passedArray, "failed": failedArray };
}

function getQuizStatus() {
	return getQuizStatusRemote().then(function (value) {
		quizesStatusL = {};
		failed = value['quizStatus']['failed'];
		passed = value['quizStatus']['passed'];
		untried = value['quizStatus']['untried'];
		for (i in failed) {
			quizesStatusL[failed[i]] = false;
		}
		for (i in passed) {
			quizesStatusL[passed[i]] = true;
		}
		for (i in untried) {
			quizesStatusL[untried[i]] = null;
		}
		window.localStorage.setItem(LOCALSTORAGE_QUIZES_STATUS_KEY, JSON.stringify(quizesStatusL));
		quizesStatus = quizesStatusL;
		updateQuizStatus();
		currentQuizStatus = quizesStatus[$(".quiz").attr("id")];
		if (currentQuizStatus) {
			$("#_grade_quiz_and_continue h3").text("Quiz successfully submitted.");
			$(".quiz").hide();
			$(".next-section").unbind("click");
			$(".next-section").click(function (event) {
				document.location = event.target.href;
				return false;
			});
		}
		return true;
	}, function () {
		return false;
	});
}

// --

var auth0Options = {
	configurationBaseUrl: 'https://cdn.auth0.com',
	allowedConnections: ['google-oauth2', 'linkedin', 'twitter', 'Username-Password-Authentication'],
	additionalSignUpFields: [
		{
			name: 'first_name',
			placeholder: 'First Name'
		},
		{
			name: 'last_name',
			placeholder: 'Last Name'
		}
	],
	closable: false,
	languageDictionary: {
		signUpTerms: "I agree to the <a href='https://neo4j.com/terms/online-trial-agreement/' style='text-decoration: underline' target='_blank'>terms of service</a> of Neo4j."
	},
	mustAcceptTerms: true,
	auth: {
		redirect: true,
		redirectUrl: 'https://neo4j.com/accounts/login',
		responseType: 'token id_token',
		audience: 'neo4j://accountinfo/',
		params: {
			scope: 'read:account-info write:account-info openid email profile user_metadata'
		}
	}
}

const classStates = {
	loggedIn: 'graph-academy-for-logged-in',
	notLoggedIn: 'graph-academy-for-not-logged-in'
}

class GraphAcademyLogin {
	constructor(options = {}) {
		console.log('constructor called');
		if (!Auth0Lock || typeof Auth0Lock !== 'function') return;
		console.log(options);
		this.lock = new Auth0Lock('DxhmiF8TCeznI7Xoi08UyYScLGZnk4ke', 'login.neo4j.com', auth0Options);
		this.options = options;
		this.checkSession(options.callback);
	}

	checkSession(cb) {
		this.lock.checkSession({}, async (err, result) => {
			console.log(result);
			if (result) {
				this.isLoggedIn = true;
				this.authResult = result;
				if (this.callback && typeof this.callback === 'function') this.callback()
			} else {
				this.isLoggedIn = false;
			}
			if (err && this.options.loginRedirectUrl) {
				this.redirectToLogin();
			}
			this.handleHtmlOnState(result ? 'loggedIn' : 'notLoggedIn');
			if (cb && typeof cb === 'function') cb(err, result);
		})
	}

	handleHtmlOnState(state = null) {
		const loggedInElements = document.getElementsByClassName(classStates['loggedIn']) || [];
		const notLoggedInElements = document.getElementsByClassName(classStates['notLoggedIn']) || [];
		if (state === 'loggedIn') {
			for (let item of loggedInElements) {
				item.style.display = 'inherit';
			}
			for (let item of notLoggedInElements) {
				item.style.display = 'none';
			}
		} else if (state === 'notLoggedIn') {
			for (let item of loggedInElements) {
				item.style.display = 'none';
			}
			for (let item of notLoggedInElements) {
				item.style.display = 'inherit';
			}
		}
	}

	logout() {
		const logoutOptions = {};
		if (this.options.redirectOnLogout) logoutOptions.redirectTo = this.options.redirectOnLogout;
		this.lock.logout(logoutOptions);
		this.handleHtmlOnState('notLoggedIn');
	}

	redirectToLogin() {
		return window.location.href = this.options.loginRedirectUrl;
	}
}

const login = new GraphAcademyLogin();

const SITE_URL = window.location;

$(document).ready(function () {
	const login = new GraphAcademyLogin({ loginRedirectUrl: LOGIN_REDIRECT_URL });

	login.checkSession((err, result) => {
		if (result) {
			getQuizStatus();
			var userInfoIntercom = result.idTokenPayload;
			if (userInfoIntercom) {
				try {
					window.Intercom("update", {
						app_id: "dt0ig5ab",
						name: userInfoIntercom.name,
						email: userInfoIntercom.email,
						user_id: userInfoIntercom.sub,
						hide_default_launcher: true
					});
				} catch (err) {
					console.error(err);
				}
			}
			Intercom('trackEvent', INTERCOM_TRACK_EVEN);
		}
	})
});
