import { TestArg } from "../../test-method"
import { PolymorphicTestMethod } from "../../test-method/polymorphic"
import { TestReporterDelegate } from "../../core/reporters/test-reporter"

export interface TestSuiteRunnerDelegate {
  runTestPolymorphically(reporter: TestReporterDelegate, testMethod: PolymorphicTestMethod, testArg: TestArg): Promise<void>,
}

export class TestSuite implements TestSuiteRunnerDelegate {
  timeout?: number
  setup(): any|Promise<any> {}
  teardown(): any|Promise<any> {}
  before(t: TestArg): any|Promise<any> {}
  after(t: TestArg): any|Promise<any> {}

  static onDecorate() {}

  public async runTestPolymorphically(reporter: TestReporterDelegate, testMethod: PolymorphicTestMethod, testArg: TestArg) {
    let clone = this.cloneSelf()
    // testMethod.testSuite = clone
    testMethod.methodBinding = clone
    try {
      await clone.before(testArg)
      await testMethod.superRunTestEntity(reporter, testArg)
    } catch (e) {
      throw e
    } finally {
      await clone.after(testArg)
    }
  }

  private cloneSelf(obj = this) {
    if (obj === null || typeof obj !== 'object')
      return obj
    let props = Object.getOwnPropertyDescriptors(obj)
    for (let key in props)
      props[key].value = this.cloneSelf(props[key].value)
    let clone = Object.create(
      Object.getPrototypeOf(obj), 
      props,
    )
    if (clone instanceof Array) clone = Array.from(clone)
    return clone
  }
}