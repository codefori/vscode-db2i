import { commands } from "vscode";
import { getInstance } from "./base";
import { ServerComponent } from "./connection/serverComponent";

export type Db2FeatureIds = `SELF`;

const featureRequirements: { [id in Db2FeatureIds]: { [osVersion: number]: number } } = {
  'SELF': {
    7.4: 26,
    7.5: 5,
    7.6: 1
  }
};

export class IBMiDetail {
  private version: number = 0;
  private db2Level: number = 0;
  private features: { [id in Db2FeatureIds]: boolean } = {
    'SELF': false
  };

  setFeatureSupport(featureId: Db2FeatureIds, supported: boolean) {
    this.features[featureId] = supported;
    commands.executeCommand(`setContext`, `vscode-db2i:${featureId}Supported`, supported);
  }

  getVersion() {
    return this.version;
  }

  getDb2Level() {
    return this.db2Level;
  }

  async fetchSystemInfo() {
    // Disable all features
    const features = Object.keys(featureRequirements) as Db2FeatureIds[];
    for (const featureId of features) {
      this.setFeatureSupport(featureId, false);
    }

    const connection = getInstance().getConnection();

    let levelCheckFailed = false;
    
    const versionResults = await connection.runSQL(`select OS_VERSION concat '.' concat OS_RELEASE as VERSION from sysibmadm.env_sys_info`);
    this.version = Number(versionResults[0].VERSION);
  
    try {
      const db2LevelResults = await connection.runSQL([
        `select max(ptf_group_level) as HIGHEST_DB2_PTF_GROUP_LEVEL`,
        `from qsys2.group_ptf_info`,
        `where PTF_GROUP_DESCRIPTION like 'DB2 FOR IBM I%' and`,
        `ptf_group_status = 'INSTALLED';`
      ].join(` `));
  
      this.db2Level = Number(db2LevelResults[0].HIGHEST_DB2_PTF_GROUP_LEVEL);
    } catch (e) {
      ServerComponent.writeOutput(`Failed to get Db2 level. User does not have enough authority: ${e.message}`);
      levelCheckFailed = true;
    }

    for (const featureId of features) {
      const requiredLevelForFeature = featureRequirements[featureId][String(this.version)];
      const supported = requiredLevelForFeature && this.db2Level >= requiredLevelForFeature;
      this.setFeatureSupport(featureId, supported);
    }

    if (levelCheckFailed) {
      const selfSupported = await this.validateSelfInstallation();
      this.setFeatureSupport('SELF', selfSupported);
    }
  }

  getFeatures() {
    return this.features;
  }

  private async validateSelfInstallation() {
    try {
      await getInstance().getConnection().runSQL(`values SYSIBMADM.SELFCODES`);

      // This means we have the SELF feature
      return true;
    } catch (e) {
      // If we can't run this, then we don't have the SELF feature
      return false;
    }
  }
}