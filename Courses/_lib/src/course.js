/* global $, auth0, CodeMirror */

// IE polyfill closest
// https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function (s) {
    var el = this
    if (!document.documentElement.contains(el)) {
      return null
    }
    do {
      if (el.matches(s)) {
        return el
      }
      el = el.parentElement || el.parentNode
    } while (el !== null && el.nodeType == 1)
    return null
  }
}

window.intercomSettings = {
  app_id: 'dt0ig5ab',
  hide_default_launcher: true
}

document.addEventListener('DOMContentLoaded', function () {
  var stage = "{{STAGE}}"
  var backendBaseUrl = "{{API_BASE_URL}}"
  var localStoragePrefixKey = window.trainingLocalStoragePrefixKey
  var quizCount = window.trainingQuizCount
  var quizStatusLocalStorageKey = stage ? localStoragePrefixKey + stage + '.quizes' : localStoragePrefixKey + '.quizes'
  var trainingName = window.trainingClassName
  var siteUrl = window.location
  var enrollmentUrl = window.trainingEnrollmentUrl

  function getQuizStatus(accessToken) {
    return $.ajax({
      type: 'GET',
      url: backendBaseUrl + '/getQuizStatus?className=' + trainingName,
      contentType: 'application/json',
      dataType: 'json',
      async: true,
      headers: {
        'Authorization': accessToken
      }
    })
  }

  function setQuizStatus(passed, failed, accessToken) {
    var data = {
      'className': window.trainingClassName,
      'passed': passed,
      'failed': failed
    }
    return $.ajax({
      type: 'POST',
      url: backendBaseUrl + '/setQuizStatus',
      contentType: 'application/json',
      dataType: 'json',
      async: true,
      data: JSON.stringify(data),
      headers: {
        'Authorization': accessToken
      }
    })
  }

  function getClassCertificate(accessToken) {
    return $.ajax({
      type: 'POST',
      url: backendBaseUrl + '/genClassCertificate',
      contentType: 'application/json',
      dataType: 'json',
      async: true,
      data: JSON.stringify({ 'className': trainingName }),
      headers: {
        'Authorization': accessToken
      }
    })
  }

  function getEnrollmentForClass(accessToken) {
    return $.ajax({
      type: 'GET',
      url: backendBaseUrl + '/getClassEnrollment?className=' + trainingName,
      async: true,
      headers: {
        'Authorization': accessToken
      }
    })
  }

  function gradeQuiz(theQuiz) {
    var quizName = theQuiz.getAttribute("id")
    var quizSuccess = true
    if (quizName in currentQuizStatus && currentQuizStatus[quizName]) {
      return true
    }
    theQuiz.querySelector("h3").style.color = "#525865"
    var requiredAnswers = theQuiz.querySelectorAll(".required-answer")
    Array.prototype.forEach.call(requiredAnswers, function(el) {
      if (!el.previousElementSibling.checked) {
        quizSuccess = false
        var section = el.closest(".sect2")
        var sectionTitle = section.querySelector("h3")
        if (sectionTitle) {
          sectionTitle.style.color = "red"
        }
      }
    })
    var falseAnswers = theQuiz.querySelectorAll(".false-answer")
    Array.prototype.forEach.call(falseAnswers, function(el) {
      if (el.previousElementSibling.checked) {
        quizSuccess = false
        const section = el.closest(".sect2")
        var sectionTitle = section.querySelector("h3")
        if (sectionTitle) {
          sectionTitle.style.color = "red"
        }
      }
    })
    currentQuizStatus[quizName] = quizSuccess
    return quizSuccess
  }

  function updateProgressIndicators(quizStatus) {
    var passedArray = []
    var failedArray = []
    for (var quizName in quizStatus) {
      const quizItemProgress = document.getElementById(quizName + '-progress')
      quizItemProgress.classList.remove('fa-circle-thin', 'fa-close', 'fa-check')
      if (quizStatus[quizName]) {
        passedArray.push(quizName)
        document.getElementById('menu-' + quizName + ' .fa-stack').style.color = 'green'
        document.getElementById('menu-' + quizName + ' .fa-stack-1x').innerHTML('<span class="fa fa-check" style="padding-top: 6px"></span>')
        quizItemProgress.style.color = 'green'
        quizItemProgress.classList.add('fa-check')
      } else {
        failedArray.push(quizName)
        quizItemProgress.style.color = 'red'
        quizItemProgress.classList.add('fa-close')
      }
    }
    const quizesResult = document.getElementById('quizes-result')
    if (passedArray.length == quizCount) {
      quizesResult.innerHTML('<p>All quizes taken successfully.</p>')
    } else {
      quizesResult.innerHTML('<p>Some quizes not answered successfully. Return to course modules by clicking on the numbers  in the navigation at the top of the page.</p>')
    }
    return { passed: passedArray, failed: failedArray }
  }

  var logout = function () {
    // todo: use a temporary URL during the Auth0 migration (notice the "login-b" instead of "login")
    //window.location = 'http://neo4j.com/accounts/login/?targetUrl=' + encodeURIComponent(siteUrl)
    window.location = 'http://neo4j.com/accounts/login-b/?targetUrl=' + encodeURIComponent(siteUrl)
  }

  // events
  var nextSectionButton = document.getElementsByClassName('next-section')
  if( nextSectionButton) {
    nextSectionButton.addEventListener("click", function (event) {
      event.preventDefault()
      var hrefSuccess = event.target.href
      var quizSuccess = gradeQuiz(document.querySelector(".quiz"))
      var submitMessageElement = document.getElementById("submit-message")
      if (quizSuccess) {
        submitMessageElement.parentNode.removeChild(submitMessageElement)
      } else {
        const submitMessageElement = document.createElement('div')
        submitMessageElement.id = 'submit-message'
        submitMessageElement.innerHTML = '<p id="submit-message"><span style="color: red">Please correct errors</span> in quiz responses above to continue. Questions with incorrect responses are highlighted in <span style="color: red">red</span>.</p></div>'
        // before
        nextSectionButton.insertAdjacentElement('beforebegin', submitMessageElement)
        const divElement = document.createElement('div');
        divElement.classList.add('paragraph')
        divElement.innerHTML = '<a href="'+ hrefSuccess + '">Click here</a> if you wish to advance to next section without passing the quiz.'
        submitMessageElement.append(divElement)
      }

      // update indicators
      currentQuizStatus = updateProgressIndicators(currentQuizStatus)
      setQuizStatus(currentQuizStatus['passed'], currentQuizStatus['failed'], accessToken)
        .then(() => {
          window.localStorage.setItem(quizStatusLocalStorageKey, JSON.stringify(currentQuizStatus))
          if (quizSuccess) {
            document.location = hrefSuccess
          }
        }, function (jqXHR, textStatus, error) {
          // question: what should we do? display an error message to the user?
          console.error('Unable to update quiz status', error)
        })
    })
  }

  const quizProgress = document.getElementsByClassName("quiz-progress")
  quizProgress.querySelectorAll("li").forEach(function(el){
    el.style['list-style-image'] = 'none !important'
  })
  quizProgress.querySelectorAll("li i").forEach(function(el){
    el.classList.add('fa', 'fa-li', 'fa-circle-thin')
  })

  // initial state
  var currentQuizStatus
  var quizStatus = window.localStorage.getItem(quizStatusLocalStorageKey)
  if (quizStatus) {
    currentQuizStatus = JSON.parse(quizStatus)
    updateProgressIndicators(currentQuizStatus)
  } else {
    currentQuizStatus = {
      failed: [],
      passed: []
    }
  }

  if (typeof trainingPartName !== 'undefined') {
    var webAuth = new auth0.WebAuth({
      clientID: 'hoNo6B00ckfAoFVzPTqzgBIJHFHDnHYu',
      domain: 'login.neo4j.com',
      redirectUri: window.location.origin + '/accounts/login-b',
      audience: 'neo4j://accountinfo/',
      scope: 'read:account-info openid email profile user_metadata',
      responseType: 'token id_token'
    })
    var accessToken
    webAuth.checkSession({}, function (err, authResult) {
      if (err) {
        console.error('User is not authenticated', err)
        logout()
      } else if (authResult && authResult.accessToken) {
        // we're authenticated!
        accessToken = authResult.accessToken
        // get the enrollment status
        getEnrollmentForClass(accessToken)
          .then(function (data) {
            if (data) {
              if (data.enrolled === false) {
                // you should be enrolled, redirect to the enrollment page!
                window.location = enrollmentUrl
              }
            }
          }, function (jqXHR, textStatus, error) {
            console.error('Unable to get enrollment', error)
          })
        // get the current quiz status from the server
        getQuizStatus(accessToken)
          .then(function (response) {
            var quizStatus = response['quizStatus']
            if (quizStatus) {
              var quizesStatusL = {}
              var failed = quizStatus['failed']
              var passed = quizStatus['passed']
              var untried = quizStatus['untried']
              for (var i in failed) {
                quizesStatusL[failed[i]] = false
              }
              for (var i in passed) {
                quizesStatusL[passed[i]] = true
              }
              for (var i in untried) {
                quizesStatusL[untried[i]] = null
              }
              window.localStorage.setItem(quizStatusLocalStorageKey, JSON.stringify(quizesStatusL))
              var quizesStatus = quizesStatusL
              updateProgressIndicators(quizesStatus)
              const quizElement = document.querySelector(".quiz");
              const quizId = quizElement.getAttribute("id");
              var currentPageQuizStatus = quizesStatus[quizId]
              if (currentPageQuizStatus) {
                var sectionTitle = document.getElementById("_grade_quiz_and_continue").getElementsByTagName('h3')
                sectionTitle.textContent = "Quiz successfully submitted."
                quizElement.style.display = 'none'
                nextSectionButton.removeEventListener("click")
                nextSectionButton.addEventListener("click", function (event) {
                  document.location = event.target.href
                })
              }
            } else {
              console.warn('Unable to update the current quiz status, response from the server is empty', response)
            }
          }, function (jqXHR, textStatus, error) {
            console.error('Unable to get quiz status', error)
          })
        var certificateResultElement = document.getElementById('cert-result')
        if (certificateResultElement) {
          certificateResultElement.innerHTML = "<i>... Checking for certificate ...</i>"
          getClassCertificate(accessToken)
            .then(function (value) {
              if ('url' in value) {
                certificateResultElement.innerHTML = "<a href=\"" + value['url'] + "\">Download Certificate</a>"
              } else {
                certificateResultElement.innerHTML = "Certificate not available yet.  Did you complete the quizzes at the end of each section?"
              }
            }, function (jqXHR, textStatus, error) {
              console.error('Unable to get certificate', error)
            })
        }
        var userInfo = authResult.idTokenPayload;
        if (window.intercomSettings && window.intercomSettings.app_id && userInfo) {
          try {
            Intercom('update', {
              app_id: window.intercomSettings.app_id,
              name: userInfo.name,
              email: userInfo.email,
              user_id: userInfo.sub,
              hide_default_launcher: true
            })
          } catch (err) {
            console.error('Unable to call Intercom with user info', err)
          }
        }
        Intercom('trackEvent', 'course-' + trainingName + '-' + trainingPartName)
      } else {
        console.warn('Unable to get the access token from the authentication result', authResult)
      }
    })
  }
})

//

document.querySelectorAll('.admonitionblock.note').forEach(function(admonitionElement) {
  admonitionElement.querySelector('icon').innerHTML = 'NOTE'
})
document.querySelectorAll('.admonitionblock.warning').forEach(function(admonitionElement) {
  admonitionElement.querySelector('icon').innerHTML = 'WARNING'
})
document.querySelectorAll('.admonitionblock.information').forEach(function(admonitionElement) {
  admonitionElement.querySelector('icon').innerHTML = 'INFO'
})

var isBlock = /^(p|li|div|h\\d|pre|blockquote|td)$/

function textContent(node, out) {
  if (node.nodeType == 3) {
    return out.push(node.nodeValue)
  }
  for (var ch = node.firstChild; ch; ch = ch.nextSibling) {
    textContent(ch, out)
    if (isBlock.test(node.nodeType)) {
      out.push("\n")
    }
  }
}

CodeMirror.colorize = function (collection, defaultMode) {
  if (!collection) {
    collection = document.body.getElementsByTagName("pre");
  }

  for (var i = 0; i < collection.length; ++i) {
    var syntax = false;
    var node = collection[i];
    var mode = node.getAttribute("data-lang") || defaultMode;
    if (mode == "cypher-syntax") {
      syntax = true;
      mode = "cypher";
    }
    if (!mode) continue;

    var text = [];
    textContent(node, text);
    node.innerHTML = "";
    CodeMirror.runMode(text.join(""), mode, node);

    node.className += " cm-s-default";
    if (syntax) {
      node.className += " cypher-syntax";
    }
  }
}

function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

ready(function () {
  if (CodeMirror.colorize) {
    CodeMirror.colorize(document.body.getElementsByTagName("pre"), 'cypher');
  }
})

// Intercom
;(function () {
  var w = window;
  var ic = w.Intercom;
  if (typeof ic === "function") {
    ic('reattach_activator');
    ic('update', window.intercomSettings);
  } else {
    var d = document;
    var i = function () {
      i.c(arguments)
    };
    i.q = [];
    i.c = function (args) {
      i.q.push(args)
    };
    w.Intercom = i;

    function l() {
      var s = d.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = 'https://widget.intercom.io/widget/' + window.intercomSettings.app_id;
      var x = d.getElementsByTagName('script')[0];
      x.parentNode.insertBefore(s, x);
    }

    if (w.attachEvent) {
      w.attachEvent('onload', l);
    } else {
      w.addEventListener('load', l, false);
    }
  }
})()
