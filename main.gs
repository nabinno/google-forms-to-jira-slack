function onFormSubmit(e) {
  var jiraUrl = formsToJira(e);
  formsToSlack(e, jiraUrl);
}
