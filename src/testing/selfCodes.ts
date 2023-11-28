import { TestSuite } from ".";
import { testSelfCodes } from "../views/jobManager/selfCodes/selfCodesTest";

export const SelfCodesTestSuite: TestSuite = {
  name: `Self Codes Tests`,
  tests: [...testSelfCodes()]
}