import CodeMirror from 'codemirror/lib/codemirror'
import 'codemirror/mode/markdown/markdown'

export default {
  bind() {
    this.editor = CodeMirror(this.el, {
      mode: 'markdown',
      tabMode: 'indent',
      lineNumbers: true,
      lineWrapping: true
    })

    this.editor.on('change', (editor) => {
      this.set(editor.getValue())
    })
  },

  update(value) {
    this.editor.setValue(value || '')
  },

  unbind() {
    this.editor.markClean()
  }
}
