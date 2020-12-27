/**
 * @desc
 *   API_TOKEN https://id.atlassian.com/manage-profile/security/api-tokens
 *   ACCOUNT_ID https://foo.atlassian.net/rest/api/3/user/search?query=foo@example.com
 */
var BASE_URL = 'https://foo.atlassian.net';
var ISSUE_URL = BASE_URL + '/rest/api/3/issue/';
var EMAIL = 'foo@example.com';
var API_TOKEN = '{{ api-token }}';
var ACCOUNT_ID = '{{ account-it }}';
var PROJECT_KEY = "{{ project-key }}";

/**
 * Googleフォームの結果をJiraにポストする
 * @param e {Object} Googleフォームのイベント
 * @see https://developers.google.com/apps-script/reference/forms/form-response
 */
function formsToJira(e) {
  const itemResponses = e.response.getItemResponses();
  const respondentEmail = e.response.getRespondentEmail();

  const title = itemResponses.filter(function(ir) {
    return ir.getItem().getTitle() === "JIRAタイトル";
  }).map(function(ir) {
    return ir.getResponse();
  })[0];

  const description = itemResponses.filter(function(ir) {
    return ir.getItem().getTitle() !== "JIRAタイトル";
  }).map(function(ir) {
    return `■ ${ir.getItem().getTitle()}\n${ir.getResponse()}`;
  }).concat([`■ 起票者\n${respondentEmail}`]).join("\n");

  var labels = itemResponses.filter(function(ir) {
    return ir.getItem().getTitle() === "OS";
  }).map(function(ir) {
    var rc;
    switch (ir.getResponse()) {
    case 'iOS':
    case 'Android':
      rc = 'アプリ';
      break;
    default:
      rc = 'ウェブ';
    }
    return rc;
  }).concat(
    itemResponses.filter(function(ir) {
      return ir.getItem().getTitle() === "緊急度";
    }).map(function(ir) {
      var rc;
      switch (ir.getResponse()) {
      case '中（2週間以内）':
      case '高（1週間以内）':
      case '緊急（当日）':
        rc = '実装';
        break;
      default:
        rc = 'トリアージ';
      }
      return rc;
    })
  );

  return sendToJira(title, description, labels);
}

/**
 * Jiraにリクエストする
 * @param title {string}
 * @param description {string}
 * @param labels {string[]}
 * @return {string} 生成したJiraエピックのURL
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/
 */
function sendToJira(title, description, labels) {
  var fields = {
    fields: {
      project: { key: PROJECT_KEY },
      issuetype: { name: "エピック" },
      summary: title,
      description: {
        type: "doc",
        version: 1,
        content: [{ type: "paragraph", content: [{ text: description, type: "text" }] }]
      },
      labels: labels,
      reporter: { id: ACCOUNT_ID }
    }
  };
  var payload = JSON.stringify(fields);
  var options = {
    method: "post",
    payload: payload,
    contentType: "application/json",
    headers: { "Authorization": " Basic " + getToken() },
    muteHttpExceptions: false
  };
  var response = UrlFetchApp.fetch(ISSUE_URL, options);
  var key = getKey(response);

  return `${BASE_URL}/browse/${key}`;
}

function getToken() {
  return Utilities.base64Encode(EMAIL + ":" + API_TOKEN);
}

function getKey(response){
  var jobj = JSON.parse(response);
  var key = jobj["key"];
  return key;
}
