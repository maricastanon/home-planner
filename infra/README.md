# Home Planner AWS Backend

This folder contains the AWS backend definition for the app's authenticated sync path:

- `POST /activity` -> Lambda -> DynamoDB activity table
- `POST /state` -> Lambda -> DynamoDB state table
- JWT auth handled by API Gateway against the Cognito User Pool and App Client

## Deploy Inputs

Required parameters:

- `UserPoolId`
- `UserPoolClientId`

Optional parameters:

- `AppName` default: `home-planner`
- `EnvironmentName` default: `prod`
- `StateTableName` default: `home-planner-user-state`
- `ActivityTableName` default: `home-planner-activity`

## Manual Deploy

```powershell
aws cloudformation deploy `
  --template-file infra/home-planner-stack.yaml `
  --stack-name home-planner-prod `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides `
    UserPoolId=eu-central-1_example `
    UserPoolClientId=exampleclientid
```

## Outputs Used By The Frontend

- `ActivityApiUrl` -> `AWS_ACTIVITY_API_URL`
- `StateApiUrl` -> `AWS_DATA_SYNC_API_URL`

Those values are injected into [`runtime-config.js`](W:/_Apps_Ready/home-planner/home/js/runtime-config.js) by the GitHub Actions workflow.
