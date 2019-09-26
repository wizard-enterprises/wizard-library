import { Suite, Test, TestSuite } from "../src/public-api";
import { decorateSuite, decorateTest, decorateSubSuite } from "../src/public-api/decorators";
import { TestRunningSuite, TestReportForTests } from "./test-running-suite";
import { TestEntityType as Type, TestEntityStatus as Status } from "../src/core/abstract-test-entity";

@Suite() class PlainTests extends TestRunningSuite {
  @Test() async 'run empty suite'(t) {
    let config = this.decoratorConfig
    @decorateSuite(config) class EmptySuite extends TestSuite {}
    let report = await this.runSuiteAndGetReport()
    t.assert.objectMatches(report, [this.suiteReport('EmptySuite')])
    t.assert.identical(report.length, 1)
  }

  @Test() async 'run suite with subsuite with empty tests'(t) {
    let config = this.decoratorConfig
    @decorateSuite(config) class ParentSuite extends TestSuite {
      @decorateTest(config) test() {}
    }
    @decorateSubSuite(config, ParentSuite) class ChildSuite extends TestSuite {
      @decorateTest(config) test() {}
    }
    let report = await this.runSuiteAndGetReport()
    t.assert.objectMatches(report, [
      this.suiteReport('ParentSuite', { children: [
        this.testReport('ParentSuite: test'),
        this.suiteReport('ParentSuite_ChildSuite', { children: [
          this.testReport('ParentSuite_ChildSuite: test')
        ]}),
      ]})
    ])
  }

  @Test() async 'run async test'(t) {
    let testDuration = 10, 
      config = this.decoratorConfig
    @decorateSuite(config) class ExampleSuite extends TestSuite {
      @decorateTest(config) 'async test'(t) {
        return new Promise(resolve => setTimeout(resolve, testDuration))
      }
    }
    let report = await this.runSuiteAndGetReport()
    t.assert.objectMatches(report, [
      this.suiteReport('ExampleSuite', {children: [this.testReport('ExampleSuite: async test')]})
    ])
    let testReport = report[0].children[0]
    t.assert(testReport.end.getTime() > testReport.start.getTime() + testDuration)
  }

  @Test() async 'timeout according to test configuration'(t) {
    let config = this.decoratorConfig
    @decorateSuite(config) class TimeoutSuite extends TestSuite {
      testTimeout = 1
      @decorateTest(config) 'should timeout'(t) {
        return new Promise(resolve => setTimeout(resolve, 2))
      }
      @decorateTest(config) 'should not timeout'(t) {
        t.timeout = 3
        return new Promise(resolve => setTimeout(resolve, 2))
      }
    }
    let report = await this.runSuiteAndGetReport()
    t.assert.objectMatches(report, [
      this.suiteReport('TimeoutSuite', {status: Status.failed, children: [
        this.testReport('TimeoutSuite: should timeout', Status.failed),
        this.testReport('TimeoutSuite: should not timeout')
      ]})
    ])
    t.assert.includes(report[0][0].reason.message, '"should timeout" timed out at 1ms')
  }

  private testReport(id: string, status = Status.passed, reason?: string): TestReport {
    let r: TestReport = {id, status, type: Type.test}
    if (reason) r['reason'] = {message: reason}
    return r
  }
  
  private suiteReport(id: string, {status = Status.passed, children = []} = {}): SuiteReport {
    return {
      ...this.testReport(id, status),
      type: Type.suite,
      children,
    }
  }

  protected runSuiteAndGetReport() {
    return super.runSuiteAndGetReport() as Promise<any>
  }

  protected getReport() {
    return this.reporter['makeEndReport']()
  }
}

interface TestEntityReport {id: string, status: Status, type: Type}
interface TestReport extends TestEntityReport {type: Type.test, reason?: {message: string}}
interface SuiteReport extends TestEntityReport {type: Type.suite, children: (TestReport|SuiteReport)[]}