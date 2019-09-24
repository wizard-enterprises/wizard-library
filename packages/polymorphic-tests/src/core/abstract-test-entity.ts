import { Suite, SuiteOpts } from "../suite"
import { TestMethodOpts } from "../test-method"
import { TestReporterDelegate } from "./reporters/test-reporter"

export enum TestEntityStatus {
  pending,
  executing,
  passed,
  failed,
  skipped,
}

export enum TestEntityType {
  suite = 'suite',
  test = 'test',
}

export interface TestEntityOpts {
  skip?: true,
  skipBecauseOfOnly?: boolean,
  only?: true,
}

export class TestEntityIdStore {
  private static instance: TestEntityIdStore
  public static getInstance() {
    return this.instance || (this.instance = new this)
  }

  private constructor() {}

  private ids: string[] = []
  private entities: TestEntity[] = []
  private idEntityMap: WeakMap<TestEntity, string> = new WeakMap

  public getIdForEntity(entity: TestEntity) {
    return this.idEntityMap.get(entity) || this.makeIdForEntity(entity)
  }

  private makeIdForEntity(entity: TestEntity) {
    let parentNameChain = this.getEntityParentNameChain(entity),
      baseId = `${entity.type}__${parentNameChain.join('_')}: ${entity.name}`,
      id = baseId
    for (let i = 0; this.ids.includes(id); i++)
      id = [baseId, i].join('_')
    this.ids.push(id)
    this.entities.push(entity)
    this.idEntityMap.set(entity, id)
    return id
  }

  private getEntityParentNameChain(entity: TestEntity) {
    let parents = [],
      lastSuite = entity.parentSuite
    while (lastSuite){// && !lastSuite.opts.rootSuite) {
      parents.unshift(lastSuite.name)
      lastSuite = lastSuite.parentSuite
    }
    return parents
  }
}

export abstract class TestEntity {
  public abstract type: TestEntityType
  get id(): string {
    return TestEntityIdStore.getInstance().getIdForEntity(this)
  }
  public parentSuite: Suite = null
  private _status: TestEntityStatus = TestEntityStatus.pending
  public get status() { return this._status}

  private _shouldSkipBecauseOfOnly = false
  protected get shouldSkipBecauseOfOnly() { return this._shouldSkipBecauseOfOnly }
  protected set shouldSkipBecauseOfOnly(shouldSkipBecauseOfOnly) {
    this._shouldSkipBecauseOfOnly = shouldSkipBecauseOfOnly
    this.updateForSkipBecauseOfOnly()
  }

  protected updateForSkipBecauseOfOnly() {}

  constructor(public name: string, public opts: SuiteOpts | TestMethodOpts) {
    this.name = name
    this.opts = opts
  }

  public async run(reporter: TestReporterDelegate) {
    this.shouldSkipBecauseOfOnly = this.doesEntityHaveSubentitiesWithOnly(this) || !!this.opts.skipBecauseOfOnly
    if (this.shouldSkipEntity(this)) {
      reporter.testEntitySkipped(this)
      if (this.type === TestEntityType.suite) await this.runTestEntity(reporter)
      return
    }
    reporter.testEntityIsExecuting(this)
    try {
      await this.runTestEntity(reporter)
      reporter.testEntityPassed(this)
    } catch (e) {
      let reasons = this.failureReasonsOverride.length ? this.failureReasonsOverride : [e]
      reporter.testEntityFailed(this, ...reasons)
    }
  }

  private doesEntityHaveSubentitiesWithOnly(entity: TestEntity) {
    if (entity.type === TestEntityType.test) return false
    let e: Suite = entity as Suite
    return !!(e.subTestEntities.find(entity => entity.opts.only))
  }

  private shouldSkipEntity(entity: TestEntity) {
    return entity.opts.skip || entity.opts.skipBecauseOfOnly
  }

  protected failureReasonsOverride: Error[] = []

  protected abstract runTestEntity(reporter: TestReporterDelegate)

  public setStatus(status: TestEntityStatus) {
    this._status = status
  }
}
