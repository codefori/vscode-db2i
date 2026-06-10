---
name: create-pr
description: Create a PR from the working tree
metadata:
    user-invocable: true
    disable-model-invocation: true
---

Please create a PR from my branch using the GitHub CLI (`gh`). Push the branch if I have not pushed it. If I'm not in a branch for this fix, then create a branch and push that.

If I provide an issue number, the issue belongs to the codefori/vscode-db2i repository. Use this command to find out the info for it: gh issue view <ISSUENUMBER> -R codefori/vscode-db2i

When creating the issue body, mention in the PR "Closes <link to issue>" in the related issue section.

Please use the PR template when creating the PR: .github/PULL_REQUEST_TEMPLATE.md