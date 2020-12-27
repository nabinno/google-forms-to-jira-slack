/**
 * @desc
 *   WEBHOOK_URL https://foo.slack.com/apps
 */
var WEBHOOK_URL = "{{ webhook-url }}";
var CHANNEL = "{{ foo-channel }}";

/**
 * Googleフォームの入力結果をSlackにポストする
 * @param e {Object} Googleフォームのイベント
 * @param jiraUrl {string}
 * @see https://developers.google.com/apps-script/reference/forms/form-response
 */
function formsToSlack(e, jiraUrl){
  const itemResponses = e.response.getItemResponses();
  const respondentEmail = e.response.getRespondentEmail();

  const fallback = itemResponses.map(function(ir) {
    return ir.getItem().getTitle() + ": " + ir.getResponse();
  }).join("\n");

  const fields = itemResponses.map(function(ir) {
    const value = responseToText(ir);
    var short;
    switch (ir.getItem().getTitle()) {
    case 'JIRAタイトル':
    case '再現手順と結果':
    case '期待される結果':
      short = false;
      break;
    default:
      short = true;
    }
    return {
      "title": ir.getItem().getTitle(),
      "value": value,
      "short": short,  // 左右2列で表示
    };
  }).concat([{
    "title": "起票者",
    "value": respondentEmail,
    "short": true
  }]);

  var mentionSet = itemResponses.filter(function(ir) {
    return ir.getItem().getTitle() === "OS";
  }).map(function(ir) {
    var rc;
    switch (ir.getResponse()) {
    case 'iOS':
    case 'Android':
      rc = '<!subteam^foo> '; // モバイル関連の起票の場合
      break;
    default:
      rc = '<!subteam^bar> '; // それ以外の起票の場合
    }
    return rc;
  }).concat(
    itemResponses.filter(function(ir) {
      return ir.getItem().getTitle() === "緊急度";
    }).map(function(ir) {
      var rc;
      switch (ir.getResponse()) {
      case '高（1週間以内）':
      case '緊急（当日）':
        rc = true;
        break;
      default:
        rc = false;
      }
      return rc;
    })
  );
  var mention = "";
  if (mentionSet[1]) {
    mention = mentionSet[0];
  }

  sendToSlack(jiraUrl, fallback, fields, mention);
}

/**
 * Slackにリクエストする
 * @see
 *   - https://api.slack.com/messaging/webhooks
 *   - https://api.slack.com/reference/surfaces/formatting
 */
function sendToSlack(jiraUrl, fallback, fields, mention) {
  const url = WEBHOOK_URL;
  const data = {
    "channel" : CHANNEL,
    "username" : "Googleフォーム Bot",  // bot 名
    "text" : `${mention}バグ報告がありました - ${jiraUrl}`,
    "attachments" : [{
      "fallback" : fallback,
      "fields": fields,
      "color": "good",  // 左線の色
    }],
    "icon_emoji" : ":bug:"  // アイコン画像
  };
  const payload = JSON.stringify(data);
  const options = {
    "method" : "POST",
    "contentType" : "application/json",
    "payload" : payload,
    "muteHttpExceptions": true,
  };
  const response = UrlFetchApp.fetch(url, options);
  Logger.log(response);
}

/**
 * GoogleフォームのイベントのItemResponseからResponseを取得する
 * @param itemResponse {Object}
 */
function responseToText(itemResponse) {
  switch (itemResponse.getItem().getType()) {
  case FormApp.ItemType.CHECKBOX:
    return itemResponse.getResponse().join("\n");
    break;
  case FormApp.ItemType.GRID:
    const gridResponses = itemResponse.getResponse();
    return itemResponse.getItem().asGridItem().getRows().map(function(rowName, index) {
      Logger.log(rowName);
      return rowName + ": " + gridResponses[index];
    }).join("\n");
    break;
  case FormApp.ItemType.CHECKBOX_GRID:
    const checkboxGridResponses = itemResponse.getResponse();
    return itemResponse.getItem().asCheckboxGridItem().getRows().map(function(rowName, index) {
      Logger.log(rowName);
      return rowName + ": " + checkboxGridResponses[index];
    }).join("\n");
    break;
  default:
    return itemResponse.getResponse();
  }
}
