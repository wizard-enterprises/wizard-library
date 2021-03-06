import { property } from 'lit-element'
import { CachedReturn } from 'wizard-decorators'
import { PipeStatus } from 'wizard-patterns/lib/pipeline'
import { WizardElement } from 'wizard-element'
import { PipelineElementIOType } from '../abstract/types'
import { ComponentPipe } from './component-pipe'

export abstract class PipeComponent<inputT = any, outputT = inputT> extends WizardElement {
  @property({type: PipelineElementIOType, noAccessor: true})
  type = PipelineElementIOType.inMemory
  @property({noAccessor: true}) ioFactoryArgs: any[] = []

  protected waitForInput = true
  protected UNDEFINED_INPUT = Symbol('UNDEFINED_INPUT')
  @property({attribute: false}) protected input: inputT | Symbol = this.UNDEFINED_INPUT 
  public async pipedInto() {
    await this.pipe.manual.waitForStatus(PipeStatus.piping)
    this.input = this.pipe.manual.input
  }

  @CachedReturn get pipe() {
    let pipe = new ComponentPipe(this.type)
    pipe.factoryArgs = this.ioFactoryArgs
    pipe.slot = Number(this.slot)
    return pipe
  }

  shouldUpdate() {
    return Boolean(
      (
        this.shouldExpectIoFactoryArgs() === false
        || this.ioFactoryArgs.length > 0
      ) && (
        this.waitForInput === false
        || (this.input !== this.UNDEFINED_INPUT)
      )
    )
  }

  shouldExpectIoFactoryArgs() {
    return [
      PipelineElementIOType.localStorage,
      PipelineElementIOType.sessionStorage,
    ].includes(this.type)
  }

  protected async pipeOut(output: outputT) {
    await this.pipe.manual.next(output)
    await this.pipe.waitForStatus(PipeStatus.piped)
    this.dispatchEvent(new CustomEvent('pipe-done', {detail: output}))
  }
}
