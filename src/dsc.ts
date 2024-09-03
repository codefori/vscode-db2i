import path from "path";

import fetch from "node-fetch";
import { Octokit } from "octokit";
import { writeFile } from "fs/promises";
import { SERVER_VERSION_FILE, SERVER_VERSION_TAG } from "./connection/SCVersion";

async function work() {
  const octokit = new Octokit();

  const owner = `Mapepire-IBMi`;
  const repo = `mapepire-server`;

  try {
    const result = await octokit.request(`GET /repos/{owner}/{repo}/releases/tags/${SERVER_VERSION_TAG}`, {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const newAsset = result.data.assets.find(asset => asset.name.endsWith(`.jar`));

    if (newAsset) {
      console.log(`Asset found: ${newAsset.name}`);

      const url = newAsset.browser_download_url;

      const dist = path.join(`.`, `dist`, SERVER_VERSION_FILE);

      await downloadFile(url, dist);

      console.log(`Asset downloaded.`);

    } else {
      console.log(`Release found but no asset found.`);
    }


  } catch (e) {
    console.log(e);
  }
}

function downloadFile(url, outputPath) {
  return fetch(url)
      .then(x => x.arrayBuffer())
      .then(x => writeFile(outputPath, Buffer.from(x)));
}

work();