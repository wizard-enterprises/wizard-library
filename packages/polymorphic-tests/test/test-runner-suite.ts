import { TestEntityIdStore, TestEntityType as Type, TestEntityStatus as Status } from "../lib/core/abstract-test-entity"
import { getReporterOfType, TestReporterType } from "../lib/core/reporters"
import { RawReporter } from "../lib/core/reporters/raw"
import { TestReporter } from "../lib/core/reporters/test-reporter"
import { TestEntityRegistery } from "../lib/core/test-registery"
import { TestRunner } from "../lib/core/test-runner"
import { TestSuite } from "../lib/public-api"
import { DecoratorConfig } from "../lib/public-api/decorators"
import { Suite as InternalSuite } from '../lib/suite'
import { GlobalSuite } from "../lib/suite/global"
import { ConsoleSpy, DecoratorConfigForTests, GlobalSuiteForTests, TestEntityIdStoreForTests } from "./mocks"

export abstract class TestRunnerSuite extends TestSuite {
  protected globalSuite: GlobalSuite
  protected decoratorConfig: DecoratorConfig
  protected registery: TestEntityRegistery
  protected consoleSpy: ConsoleSpy
  protected idStore: TestEntityIdStore
  protected reporter?: TestReporter = null
  protected shouldMockConsole: boolean = true

  async before(t) {
    await super.before(t)
    this.globalSuite = GlobalSuiteForTests.getNewInstance()
    this.decoratorConfig = DecoratorConfigForTests.getNewInstance()
    t.config = this.decoratorConfig
    this.idStore = TestEntityIdStoreForTests.getNewInstance()
    this.registery = new TestEntityRegistery(this.globalSuite, this.idStore)
    this.decoratorConfig.registery = this.registery
    this.consoleSpy = new ConsoleSpy
    this.reporter = null
  }

  protected async runSuite(
    rootSuite: InternalSuite = this.globalSuite,
    reporterCtor: typeof TestReporter = RawReporter,
  ) {
    if (!this.reporter)
      //@ts-ignore
      this.reporter = new reporterCtor(rootSuite)
    if (this.shouldMockConsole)
      this.reporter['console'] = this.consoleSpy as unknown as Console
    await new TestRunner(rootSuite, this.reporter).run()
  }

  protected reporterType: TestReporterType = TestReporterType.raw
  protected async runSuiteAndGetReport(suite: InternalSuite = this.globalSuite) {
    await this.runSuite(suite, getReporterOfType(this.reporterType))
    return this.getReport()
  }
  
  protected getReport() {
    return new (getReportForTestsByType(this.reporterType))(this.consoleSpy)
  }
}

function getReportForTestsByType(type: TestReporterType) {
  switch (type) {
    case TestReporterType.raw:
    case TestReporterType.tap:
    case TestReporterType.simple:
    default:
      return TestReportForTests
  }
}

export class TestReportForTests {
  constructor(public spy: ConsoleSpy) {}
  protected get calls(): ConsoleSpy['calls'] { return this.spy.calls }
  get lastLine(): string {return this.lines[this.lines.length - 1]}
  get lines(): string[] {
    return this.calls.args().map(args => args.join('\n'))
  }
  get full(): string {
    return this.calls.args().reduce((acc, arr) => acc = [...acc, ...arr], []).join('\n')
  }
}

export abstract class RawTestRunnerSuite extends TestRunnerSuite {
  protected testReport(id: string, status = Status.passed, {reason = '', assertions = []} = {}): TestReport {
    let r: TestReport = {id, status, type: Type.test}
    if (reason) r['reason'] = {message: reason}
    if (assertions.length) r['assertions'] = assertions
    return r
  }
  
  protected suiteReport(id: string, {status = Status.passed, children = []} = {}): SuiteReport {
    let o = {
      ...this.testReport(id, status),
      type: Type.suite,
      children,
    }
    delete o.status
    return o as SuiteReport
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