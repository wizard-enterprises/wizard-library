import { Suite, TestSuite, SubSuite, Test } from 'polymorphic-tests'
import { makeComposableFunction, Strategies as _Strategies } from '../..'

@Suite() export class Strategies extends TestSuite {}
export abstract class ComposableFunctionSuite extends TestSuite {
  abstract strategy: _Strategies
  protected composeArgs: any[]//[Function, ...any[]]
  protected funcCallArgs: any[] = []
  
  protected composeAndCall(funcCallArgs = this.funcCallArgs, composeArgs = this.composeArgs,) {
    return this.compose(...composeArgs)(...funcCallArgs)
  }

  protected compose(...args) {
    //@ts-ignore
    return makeComposableFunction(this.strategy, ...args)
  } 
}
