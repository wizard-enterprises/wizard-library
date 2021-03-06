import { LitElement, html, customElement, property } from 'lit-element'

@customElement('test-element-2')
export class TestElement2 extends LitElement {
  @property() arg
  defaultArg = 'default'

  render() {
    return html`
      <h1>Test Element 2</h1>
      <h2>(with arg: ${this.makeArg()})
    `
  }

  makeArg() {
    return (this.arg || this.defaultArg) + ' 2'
  }
}