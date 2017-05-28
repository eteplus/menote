<template>
  <div class="editor-container">
    <!-- Toolbar -->
    <div class="editor-toolbar"
      :class="{
        'is-side': isSideBySide,
        'is-readmode': isReadmode
      }">
      <template v-for="item in toolbar">
        <a :title="item.tooltips"
          :class="item.className"
          @click="executeAction(item.action || '')"
          v-if="item.type === 'button'" >
        </a>
        <i class="separator" v-else>|</i>
      </template>
    </div>
    <div class="editor-bottombar">
      <div class="status-bar">
        <img class="logo" src="static/img/logo.jpeg" alt="" />
        <span class="lines">lines: {{lines}}</span>
        <span class="words">words: {{words}}</span>
      </div>
    </div>
    <!-- Edit -->
    <div class="editor is-side" ref="editor">
    </div>
    <!-- Preview -->
    <div class="editor-preview"
      ref="preview"
      :class="{
        'is-side': isSideBySide,
        'is-readmode': isReadmode
      }">
    </div>
    <!-- Toc -->
    <div class="toc-preview" v-show="showToc">
      <toc :list="tableOfContent" v-if="tableOfContent.length > 0"/>
    </div>
    <!-- Html Code -->
    <div class="html-code-preview" v-show="showHtmlCode">
      <textarea readonly v-text="htmlCode"></textarea>
    </div>
  </div>
</template>

<script>
import IncrementalDOM from 'incremental-dom'
import { slugify } from 'transliteration'
import { debounce } from 'underscore'
import content from '@/config/content'
import toolbar from '@/config/toolbar'
import keybindings from '@/config/keybindings'
import markdown from '@/utils/markdown-it'
import anchor from 'markdown-it-anchor'
import iterator from 'markdown-it-for-inline'
import Toc from '@/components/Toc'

/* eslint-disable no-useless-escape */
export default {
  data() {
    return {
      editor: null,
      editSession: null,
      undoManager: null,
      toolbar: [],
      markdown: '',
      content: '',
      lines: 0,
      words: 0,
      slugCache: {},
      tableOfContent: [],
      isSideBySide: true,
      isReadmode: false,
      showToc: false,
      showHtmlCode: false,
      htmlCode: '',
      orderNum: 1,
      lastFocusRow: 0
    }
  },
  created() {
    this.$nextTick(() => {
      this.createToolbar()
      this.createEditor()
    })
  },
  methods: {
    /*
     * create toolbar
     */
    createToolbar() {
      this.toolbar = toolbar
    },
    /*
     * create markdown editor
     */
    createEditor() {
      this.editor = ace.edit(this.$refs.editor)
      this.editSession = this.editor.getSession()
      this.selection = this.editSession.getSelection()
      this.undoManager = this.editSession.getUndoManager()

      // editor options
      this.editor.setTheme('ace/theme/chrome')
      this.editor.$blockScrolling = Infinity
      this.editor.setShowPrintMargin(false)
      this.editor.setShowFoldWidgets(false)
      console.log(this.editor)

      // editor session options
      this.editSession.setMode('ace/mode/markdown')
      this.editSession.setUseWrapMode(true)

      // custom markdown renderer anchor
      this.markdownAnchor()

      // custom inline style
      this.markdownInline()

      // editor event
      this.editorEvent()

      // editor keybindings
      this.editorKeybindings()

      // insert content
      this.editSession.setValue(content)

      this.editor.focus()
    },
    /*
     * listen editor event
     */
    editorEvent() {
      // listen editor 'change' event and render markdown
      this.editSession.on('change', debounce(() => {
        const content = this.editSession.getValue()
        this.slugCache = {}
        this.tableOfContent = []
        this.lines = this.editSession.getLength()
        this.words = content.replace(/\s*/g, '').length
        IncrementalDOM.patch(
          this.$refs.preview,
          markdown.renderToIncrementalDOM(content)
        )
      }, 300))

      let editorScroll = false
      let previewScroll = false
      // sync scroll editor <-> preview
      const clientHeight = document.querySelector('.ace_scroller').clientHeight
      this.editSession.on('changeScrollTop', (scrollTop) => {
        if (editorScroll) {
          editorScroll = false
          return
        }
        previewScroll = true
        const lineHeight = this.editor.renderer.lineHeight
        const height = this.editSession.getScreenLength() * lineHeight - clientHeight
        const ratio = parseFloat(scrollTop) / height
        const calScrollTop = (this.$refs.preview.scrollHeight - this.$refs.preview.clientHeight) * ratio
        this.$refs.preview.scrollTop = calScrollTop
      })

      // editor preview sync scroll
      this.$refs.preview.addEventListener('scroll', () => {
        if (previewScroll) {
          previewScroll = false
          return
        }
        editorScroll = true
        const height = this.$refs.preview.scrollHeight - this.$refs.preview.clientHeight
        const ratio = parseFloat(this.$refs.preview.scrollTop) / height
        const lineHeight = this.editor.renderer.lineHeight
        const scrollTop = (this.editSession.getScreenLength() * lineHeight - clientHeight) * ratio
        if (scrollTop > 0) this.editSession.setScrollTop(scrollTop)
      })
    },
    /*
     * keybindings
     */
    editorKeybindings() {
      for (const action in keybindings) {
        if (!this[action] || typeof this[action] !== 'function') {
          console.error(action, 'is not found')
          continue
        }
        this.editor.commands.addCommand({
          name: action,
          bindKey: keybindings[action],
          exec: this[action]
        })
      }
    },
    /*
     * markdown heading anchor
     */
    markdownAnchor() {
      // heading level
      const levels = {
        'h1': 1,
        'h2': 2,
        'h3': 3,
        'h4': 4,
        'h5': 5,
        'h6': 6
      }
      /*
       * @param {number} level - title level
       * @param {number} childNode - children Node
       * @param {object} data children data
       */
      const recursionChildren = (level, childNode, data) => {
        const idx = data.numbers[0] - 1
        let len, len2, len3, len4, len5
        if (childNode === 5) {
          len = data.numbers[1]
          len2 = data.numbers[2]
          len3 = data.numbers[3]
          len4 = data.numbers[4]
          len5 = this.tableOfContent[idx].children[len - 1].children[len2 - 1].children[len3 - 1].children[len4 - 1].children.length
          data.numbers.push(len5 + 1)
          this.tableOfContent[idx].children[len - 1].children[len2 - 1].children[len3 - 1].children[len4 - 1].children.push(data)
          return
        }
        switch (childNode) {
          case 1:
            len = this.tableOfContent[idx].children.length
            if (len >= 1 && this.tableOfContent[idx].children[len - 1].level < level) {
              // [idx + 1, len]
              data.numbers.push(len)
              recursionChildren(level, 2, data)
            } else {
              // [idx + 1, len + 1]
              data.numbers.push(len + 1)
              this.tableOfContent[idx].children.push(data)
              return
            }
            break
          case 2:
            len = data.numbers[1]
            len2 = this.tableOfContent[idx].children[len - 1].children.length
            if (len2 >= 1 && this.tableOfContent[idx].children[len - 1].children[len2 - 1].level < level) {
              // [idx + 1, len, len2]
              data.numbers.push(len2)
              recursionChildren(level, 3, data)
            } else {
              // [idx + 1, len, len2 + 1]
              data.numbers.push(len2 + 1)
              this.tableOfContent[idx].children[len - 1].children.push(data)
              return
            }
            break
          case 3:
            len = data.numbers[1]
            len2 = data.numbers[2]
            len3 = this.tableOfContent[idx].children[len - 1].children[len2 - 1].children.length
            if (len3 >= 1 && this.tableOfContent[idx].children[len - 1].children[len2 - 1].children[len3 - 1].level < level) {
              // [idx + 1, len, len2, len3]
              data.numbers.push(len3)
              recursionChildren(level, 4, data)
            } else {
              // [idx + 1, len, len2, len3 + 1]
              data.numbers.push(len3 + 1)
              this.tableOfContent[idx].children[len - 1].children[len2 - 1].children.push(data)
              return
            }
            break
          case 4:
            len = data.numbers[1]
            len2 = data.numbers[2]
            len3 = data.numbers[3]
            len4 = this.tableOfContent[idx].children[len - 1].children[len2 - 1].children[len3 - 1].children.length
            if (len4 >= 1 && this.tableOfContent[idx].children[len - 1].children[len2 - 1].children[len3 - 1].children[len4 - 1].level < level) {
              data.numbers.push(len4)
              recursionChildren(level, 5, data)
            } else {
              data.numbers.push(len4 + 1)
              this.tableOfContent[idx].children[len - 1].children[len2 - 1].children[len3 - 1].children.push(data)
              return
            }
            break
        }
      }
      markdown.use(anchor, {
        level: 1,
        permalink: false,
        permalinkBefore: false,
        permalinkSymbol: '#',
        slugify: (str) => {
          let slug = slugify(str, {
            lowercase: true,
            separator: '-',
            ignore: []
          })
          if (this.slugCache[slug]) {
            slug = `${slug}-${this.slugCache[slug]++}`
          } else {
            this.slugCache[slug] = 1
          }
          return slug
        },
        callback: (token, { slug, title }) => {
          const len = this.tableOfContent.length
          const level = levels[token.tag]
          if (len >= 1 && this.tableOfContent[len - 1].level < level) {
            const childNode = 1
            recursionChildren(level, childNode, {
              id: slug,
              title,
              level,
              numbers: [len],
              children: []
            })
          } else {
            // [1]
            this.tableOfContent.push({
              id: slug,
              title,
              level,
              numbers: [len + 1],
              children: []
            })
          }
        }
      })
    },
    /*
     * markdown inline
     */
    markdownInline() {
      markdown.use(iterator, 'url_new_win', 'link_open', function (tokens, idx) {
        tokens[idx].attrPush([ 'target', '_blank' ])
      })
    },
    /*
     * private editor resize method
     */
    _resize() {
      setTimeout(() => {
        this.editor.resize(true)
      }, 1)
    },
    /*
     * private editor move cursor and focus
     */
    _moveCursor(row, column) {
      this.editor.moveCursorTo(row, column)
      this.editor.focus()
    },
    /*
     * toggle editor class name
     * @param {string} className - element class name
     * @param {boolean} remove - add or remove className
     */
    _toggleClass(className, remove) {
      remove ? this.editor.unsetStyle(className) : this.editor.setStyle(className)
    },
    /*
     * execute action method
     */
    executeAction(action) {
      if (action === '' || !this[action] || typeof this[action] !== 'function') {
        throw Error('command does not exist')
      }
      const actions = ['toggleSideBySide', 'toggleReadmode', 'toggleHtmlCode']
      if ((this.isReadmode || this.showHtmlCode) && actions.indexOf(action) < 0) {
        return
      }
      if (this.showHtmlCode && action !== 'toggleHtmlCode') {
        this.toggleHtmlCode()
      }
      this[action]()
    },
    /*
     * Toggle Read Mode
     */
    toggleReadmode() {
      if (this.isSideBySide) {
        this.editor.unsetStyle('is-side')
        this.isSideBySide = false
        this._resize()
      }
      this._toggleClass('is-readmode', this.isReadmode)
      this.isReadmode = !this.isReadmode
    },
    /*
     * Toggle Side By Side - F9
     */
    toggleSideBySide() {
      if (this.isReadmode) {
        this.editor.unsetStyle('is-readmode')
        this.isReadmode = false
      }
      this._toggleClass('is-side', this.isSideBySide)
      this.isSideBySide = !this.isSideBySide
      this._resize()
    },
    toggleTocPreview() {
      this.showToc = !this.showToc
    },
    /* Ctrl/Cmd-B */
    toggleBold() {
      if (!this.selection.isEmpty()) {
        const range = this.selection.getRange()
        const text = this.editSession.getTextRange(range)
        this.editSession.replace(range, `**${text}**`)
        this.selection.clearSelection()
        return
      }
      const { row, column } = this.selection.getCursor()
      this.editor.insert('****')
      this._moveCursor(row, column + 2)
    },
    /* Shift-Ctrl/Cmd-I */
    toggleItalic() {
      const selection = this.editor.getSelection()
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        const text = this.editSession.getTextRange(range)
        this.editSession.replace(range, `*${text}*`)
        return
      }
      const position = selection.getCursor()
      this.editor.insert('**')
      this._moveCursor(position.row, position.column + 1)
    },
    /* Ctrl/Cmd-Alt-T */
    toggleStrikeThrough() {
      const selection = this.editor.getSelection()
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        const text = this.editSession.getTextRange(range)
        this.editSession.replace(range, `~~${text}~~`)
        return
      }
      const position = selection.getCursor()
      this.editor.insert('~~~~')
      this._moveCursor(position.row, position.column + 2)
    },
    /* Shift-Ctrl/Cmd-M */
    toggleMarked() {
      const selection = this.editor.getSelection()
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        const text = this.editSession.getTextRange(range)
        this.editSession.replace(range, `==${text}==`)
        return
      }
      const position = selection.getCursor()
      this.editor.insert('====')
      this._moveCursor(position.row, position.column + 2)
    },
    /* Shift-Ctrl/Cmd-U */
    toggleUnderline() {
      const selection = this.editor.getSelection()
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        const text = this.editSession.getTextRange(range)
        this.editSession.replace(range, `++${text}++`)
        return
      }
      const position = selection.getCursor()
      this.editor.insert('++++')
      this._moveCursor(position.row, position.column + 2)
    },
    toggleSuperscript() {
      const selection = this.editor.getSelection()
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        const text = this.editSession.getTextRange(range)
        this.editSession.replace(range, `^${text}^`)
        return
      }
      const position = selection.getCursor()
      this.editor.insert('^^')
      this._moveCursor(position.row, position.column + 1)
    },
    toggleSubscript() {
      const selection = this.editor.getSelection()
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        const text = this.editSession.getTextRange(range)
        this.editSession.replace(range, `~${text}~`)
        return
      }
      const position = selection.getCursor()
      this.editor.insert('~~')
      this._moveCursor(position.row, position.column + 1)
    },
    /* Ctrl/Cmd-H */
    toggleHeading() {
      const selection = this.editor.getSelection()
      const { row } = selection.getCursor()
      const lineText = this.editSession.getLine(row)
      const length = lineText.length
      const level = lineText.search(/[^#]/)
      // console.log(row, column, level, length)
      const range = {
        start: {
          row,
          column: 0
        },
        end: {
          row,
          column: length
        }
      }
      if (level >= 6) {
        return
      }
      const heading = level <= 0 ? '# ' : '#'
      this.editSession.replace(range, heading + lineText)
      this.editor.focus()
    },
    /* Ctrl/Cmd-. */
    toggleBlockquote() {
      const selection = this.editor.getSelection()
      const { row } = selection.getCursor()
      const lineText = this.editSession.getLine(row)
      const length = lineText.length
      const index = lineText.search(/[^>]/)
      // console.log(row, column, index, length)
      const range = {
        start: {
          row,
          column: 0
        },
        end: {
          row,
          column: length
        }
      }
      if (index <= 0) {
        this.editSession.replace(range, `> ${lineText}`)
      } else {
        this.editSession.replace(range, lineText.replace(/^(\s*)>\s+/, ''))
      }
      this.editor.focus()
    },
    /* Ctrl/Cmd-L */
    toggleUnorderedList() {
      const selection = this.editor.getSelection()
      const { row } = selection.getCursor()
      const lineText = this.editSession.getLine(row)
      const length = lineText.length
      const index = lineText.search(/[^\*]/)
      // console.log(row, column, index, length)
      const range = {
        start: {
          row,
          column: 0
        },
        end: {
          row,
          column: length
        }
      }
      if (index <= 0) {
        this.editSession.replace(range, `* ${lineText}`)
      } else {
        this.editSession.replace(range, lineText.replace(/^(\s*)\*\s+/, ''))
      }
      this.editor.focus()
    },
    /* Ctrl/Cmd-Alt-L */
    toggleOrderedList() {
      const selection = this.editor.getSelection()
      const { row } = selection.getCursor()
      const lineText = this.editSession.getLine(row)
      const length = lineText.length
      const index = lineText.search(/[^\d{1}]/)
      // console.log(row, column, index, length)
      const range = {
        start: {
          row,
          column: 0
        },
        end: {
          row,
          column: length
        }
      }
      if (index <= 0) {
        // follow last row order num
        // console.log(this.lastFocusRow, this.orderNum)
        if (this.lastFocusRow + 1 === row) {
          this.orderNum += 1
          this.lastFocusRow += 1
        } else {
          this.lastFocusRow = row
          this.orderNum = 1
        }
        this.editSession.replace(range, `${this.orderNum}. ${lineText}`)
      } else {
        this.lastFocusRow = row
        this.orderNum = 1
        this.editSession.replace(range, lineText.replace(/^(\s*)\d{1}\.\s+/, ''))
      }
      this.editor.focus()
    },
    insertHorizontalRule() {
      const horizontalRule = '\n\n----------\n\n'
      const selection = this.selection
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        this.editSession.replace(range, horizontalRule)
        selection.clearSelection()
        this.editor.focus()
        return
      }
      this.editor.insert(horizontalRule)
      this.editor.focus()
    },
    /* Ctrl/Cmd-K */
    insertLink() {
      const selection = this.editor.getSelection()
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        this.editSession.replace(range, '[](http://)')
        const { row, column } = selection.getSelectionAnchor()
        selection.clearSelection()
        this._moveCursor(row, column - 10)
        return
      }
      this.editor.insert('[](http://)')
      const { row, column } = selection.getSelectionAnchor()
      this._moveCursor(row, column - 10)
    },
    /* Ctrl/Cmd-I */
    insertImage() {
      const selection = this.selection
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        this.editSession.replace(range, '![](http://)')
        const { row, column } = selection.getSelectionAnchor()
        selection.clearSelection()
        this._moveCursor(row, column - 10)
        return
      }
      this.editor.insert('![](http://)')
      const { row, column } = selection.getSelectionAnchor()
      this._moveCursor(row, column - 10)
    },
    /* Shift-Ctrl/Cmd-C */
    insertCode() {
      const code = '\n' +
      '```\n' +
      '```\n'
      const selection = this.selection
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        this.editSession.replace(range, code)
        const { row, column } = selection.getSelectionAnchor()
        selection.clearSelection()
        this._moveCursor(row - 2, column + 3)
        return
      }
      this.editor.insert(code)
      const { row, column } = selection.getSelectionAnchor()
      this._moveCursor(row - 2, column + 3)
    },
    /* Ctrl/Cmd-Alt-T */
    insertTable() {
      const table = '\n\n' +
      '| Column 1 | Column 2 | Column 3 |\n' +
      '| -------- | -------- | -------- |\n' +
      '| Text     | Text     | Text     |\n\n'
      const selection = this.editor.getSelection()
      if (!selection.isEmpty()) {
        const range = selection.getRange()
        this.editSession.replace(range, table)
        selection.clearSelection()
        this.editor.focus()
        return
      }
      this.editor.insert(table)
      this.editor.focus()
    },
    redo() {
      if (this.undoManager.hasRedo()) {
        this.undoManager.redo()
      }
    },
    undo() {
      if (this.undoManager.hasUndo()) {
        this.undoManager.undo()
      }
    },
    /* clear editor content */
    clear() {
      this.editSession.setValue('')
      this.undoManager.reset()
      this.editor.focus()
    },
    /* export markdown file */
    downloadFile() {
      const aTag = document.createElement('a')
      const blob = new Blob([this.editSession.getValue()])
      aTag.download = 'markdown.md'
      aTag.href = URL.createObjectURL(blob)
      aTag.click()
      URL.revokeObjectURL(blob)
    },
    /* show HTML code */
    toggleHtmlCode() {
      if (this.showHtmlCode) {
        this.showHtmlCode = false
        return
      }
      this.htmlCode = this.$refs.preview.innerHTML
      this.showHtmlCode = true
      // console.log(this.$refs.preview.innerHTML)
    }
  },
  components: {
    Toc
  }
}
</script>

<style>
@import '../assets/css/normalize.css';
@import '../../node_modules/highlight.js/styles/atom-one-light.css';
@import '../../static/themes/github.css';
@import '../assets/css/icons.css';
@import '../assets/css/toolbar.css';
@import '../assets/css/scrollbar.css';

html,
body {
  overflow: hidden;
}

.pull-right {
  float: right;
}

.editor {
  position: fixed !important;
  left: 0;
  right: 0;
  top: 50px;
  font-size: 14px !important;
  opacity: 1;
}

.editor.is-side {
  width: 50%;
  border: 1px dashed #BBB;
  border-bottom: 0;
  border-top-width: 0;
  border-left-width: 0;
}

.editor.is-readmode {
  opacity: 0;
}

.editor, .editor-preview {
  bottom: 40px;
}

.editor-preview {
  position: fixed;
  left: 0;
  right: 0;
  top: 50px;
  padding: 30px;
  padding-top: 15px;
  overflow: auto;
  display: none;
  letter-spacing: 1px;
}

.editor-preview::-webkit-scrollbar {
  display: none;
}

.editor-preview:hover::-webkit-scrollbar {
  display: inherit;
}

.editor-preview.is-side {
  width: 50%;
  left: 50%;
  display: block;
}

.editor-preview.is-readmode {
  display: block;
}

.editor-preview input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  margin-top: 0.3rem;
}

.editor-preview a {
  text-decoration: none;
}

.editor-preview img {
  max-width: 100%;
  box-sizing: content-box;
}

.editor-preview .contains-task-list {
  padding-left: 0;
}

.editor-preview .task-list-item {
  list-style: none;
}

.editor-toolbar.is-readmode .icon-eye:before {
  content: '\e80c';
}

.toc-preview {
  position: absolute;
  background: white;
  top: 50px;
  bottom: 0;
  right: 0;
  border: 1px dashed #ccc;
  overflow: auto;
  width: 300px;
  z-index: 2;
  padding: 18px;
  padding-bottom: 30px;
}

.editor-bottombar {
  width: 100%;
  height: 40px;
  padding: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  box-sizing: border-box;
  user-select: none;
  background: #fcfcfc;
  position: fixed;
  border-top: 1px dashed #BBB;
  left: 0;
  bottom: 0;
  opacity: 1;
  z-index: 9;
}

.status-bar {
  /*position: absolute;
  right: 30px;
  top: 15px;
  margin: auto;*/
  height: 100%;
  margin-right: 20px;
  font-size: 12px;
  color: #959694;
  text-align: right;
}

.logo {
  width: auto;
  float: left;
  height: 100%;
}

.status-bar span {
  display: inline-block;
  min-width: 4em;
  margin-left: 1em;
}

.html-code-preview {
  position: fixed;
  top: 50px;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  background: white;
}

.html-code-preview textarea {
  width: 100%;
  height: 100%;
  padding: 25px;
  border: 0;
  font-size: 1rem;
}

.code-block {
  border: 0.5px dashed #ccc;
}

.hljs {
  border: 0;
}

.hljs-line-numbers {
  float: left;
  text-align: right;
  border: 0;
  border-right: 1px dashed #ccc;
  color: #999;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.ace_gutter {
  background: rgba(235, 235, 235, 0.32) !important;
  border-right: 0.5px dashed rgb(204, 204, 204);
}

.ace_gutter-layer {
  text-align: center;
}

</style>
