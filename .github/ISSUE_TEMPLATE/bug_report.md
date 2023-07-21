---
name: Bug report
about: Create a report to help us improve
title: ''
labels: ''
assignees: ''

---

⚠️⚠️ **How to collection debug information** ⚠️⚠️

After connecting to a system, use the 'Db2 for i Server Component' Output tab to see installation/debug information flow it. By default, it will only show installation information and errors if any. If you need to collect information for a specific job:

1. right click on any job (in the SQL Job Manager) and select the option to enabing tracing
2. recreate the issue with tracing enabled
3. right click on the same job again and get the tracing data
4. copy and paste that data into your new issue

**Describe the bug**

A clear and concise description of what the bug is.

**To Reproduce**

Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**

A clear and concise description of what you expected to happen.

**Screenshots**

If applicable, add screenshots to help explain your problem.

**Environment**

 - OS: [e.g. Windows/Max]
 - Extension Version [e.g. 0.3.0]

**Additional context**

Add any other context about the problem here.
