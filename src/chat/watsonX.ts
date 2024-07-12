
// https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-credentials.html?context=wx&audience=wdp
// https://cloud.ibm.com/iam/apikeys
// https://cloud.ibm.com/docs/account?topic=account-iamtoken_from_apikey#response-curl

import fetch from "node-fetch";
import * as vscode from "vscode";
import Configuration from "../configuration";

const WATSONX_KEY = `watsonx.apiKey`;
const WATSONX_ACCESS_TOKEN = `watsonx.accessToken`;

export function getWatsonXAccessToken() {
  return Configuration.getSecret(WATSONX_ACCESS_TOKEN);
}

export async function initWatsonX(withPrompt = false) {
  let apiKey = await Configuration.getSecret(WATSONX_KEY);

  if (withPrompt) {
    apiKey = await vscode.window.showInputBox({
      prompt: `Please enter your WatsonX API key.`,
      title: `WatsonX API Key`,
      password: true,
      value: apiKey,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) {
          return `API key is required.`;
        }
      }
    });
  }

  if (apiKey) {
    const authenticated = await authenticateToWatsonX(apiKey);

    return authenticated;
  }

  return false;
}

// TODO: convert to API call to get model list
export async function getWatsonXModels() {
  return [
    `ibm/granite-13b-chat-v2`,
    `ibm-mistralai/merlinite-7b`,
    `ibm/granite-13b-instruct-v2`,
    `ibm/granite-20b-code-instruct`
  ];
}

// TODO: Consider swapping out this fetch call with the official sdk
export async function authenticateToWatsonX(newApiKey?: string) {
  const apiKey = newApiKey || await Configuration.getSecret(WATSONX_KEY);

  if (apiKey) {
    try {
      // curl -X POST 'https://iam.cloud.ibm.com/identity/token' -H 'Content-Type: application/x-www-form-urlencoded' -d 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=MY_APIKEY'
      const iamResult = await fetch(`https://iam.cloud.ibm.com/identity/token`, {
        headers: {
          "Content-Type": `application/x-www-form-urlencoded`,
        },
        method: `POST`,
        body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
      });

      if (iamResult.ok) {
        const iamJson = await iamResult.json() as any;
        const accessToken = iamJson.access_token;

        if (newApiKey) {
          await Configuration.setSecret(WATSONX_KEY, newApiKey);
        }

        await Configuration.setSecret(WATSONX_ACCESS_TOKEN, accessToken);

        return true;
      }
    } catch (e) {
      console.log(e);
    }

    await Configuration.deleteSecret(WATSONX_KEY);
  }

  return false;
}