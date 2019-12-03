import { SubSuite, Test } from 'polymorphic-tests'
import { Pipes, PipeSuite } from '../index.spec'
import { Pipeline as _Pipeline } from '.'
import { TransformPipe } from '../transform'

@SubSuite(Pipes) class Pipeline extends PipeSuite<_Pipeline> {
  protected underTest = _Pipeline

  @Test() 'run pipeline'(t) {
    t.expect(this.pipe(1, ...this.makeTestPipes())).to.equal(31)
    t.expect(this.pipe(100, ...this.makeTestPipes())).to.equal(130)
  }

  @Test() async 'run async pipeline'(t) {
    let inputs = [1, 100],
      pipeProms = inputs.map(x => this.pipe(x, ...this.makeTestPipes(true)))
    for (let [index, prom] of Object.entries(pipeProms)) {
      let i = Number(index)
      t.expect(prom).to.be.an.instanceof(Promise)
      t.expect(await prom).to.equal(inputs[i] + 30)
    }
  }

  @Test() 'run pipeline of pipelines'(t) {
    let pipe = this.makePipe(...Array.from(Array(3), () =>
      this.makePipe(...this.makeTestPipes())))
    t.expect(pipe.run(1)).to.equal(91)
    t.expect(pipe.run(100)).to.equal(190)
  }

  @Test() async 'run pipeline from middle'(t) {
    let pipe = this.makePipe(...this.makeTestPipes(true))
    t.expect(await pipe.run(0)).to.equal(30)
    pipe.startFrom = 1
    t.expect(await pipe.run(0)).to.equal(20)
    pipe.startFrom = 2
    t.expect(await pipe.run(0)).to.equal(10)
    pipe.startFrom = 3
    t.expect(await pipe.run(0)).to.equal(0)
    pipe.startFrom = 4
    t.expect(() => pipe.run(0)).to.throw(`startFrom index 4 is out of bounds for pipe array of length 3`)
  }

  private makeTestPipes(beAsync = false) {
    return Array(3).fill(null).map(() =>
      new TransformPipe(x => beAsync
        ? new Promise(res => setTimeout(() => res(x + 10), 1))
        : x + 10))
  }
}