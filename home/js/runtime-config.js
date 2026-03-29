window.__HOME_AUTH_CONFIG__ = Object.assign({
  region: '',
  userPoolId: '',
  clientId: '',
  storageMode: 'session',
}, window.__HOME_AUTH_CONFIG__ || {});

window.__HOME_AWS_CONFIG__ = Object.assign({
  region: '',
  mode: 'api_gateway_lambda_dynamo',
  activityApiUrl: '',
  dataSyncUrl: '',
}, window.__HOME_AWS_CONFIG__ || {});
