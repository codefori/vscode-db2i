# vscode-db2i

Db2 for IBM i tools is a reimplementation of the Schemas tool inside of Access Client Solutions. There is a lot to do so it will not likely be on the Marketplace any time soon.

![](./media/main.png)

## Want to help?

See the [Projects](https://github.com/halcyon-tech/vscode-db2i/projects) tab to see our progress and what you could work on.

### Contribution notes

* Each object type in the tree list has a Defintion View (by clicking on the object). Each Definition View exists in it's own folder. For example the table definition exists at `./src/panels/table`. This means other types will get their own folder for their Definition View. Views might be `./src/panels/view` and procedures might be `./src/panels/procedure`.
* Each object type has a class in the `./src/database` folder. For example, the table Definition View has the class `./src/view/table.js` which has all the methods needed to fetch information for that view. You may also add other static methods which could be used for commands specific to the table. Other objects would also get their own class.
* **The best example to work from is `src/panels/view/index.js`.**

## Building from source

1. This project requires VS Code and Node.js.
2. fork & clone repo
3. `npm i`
4. 'Run Extension' from vscode debug.