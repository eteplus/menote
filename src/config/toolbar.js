import keybindings from './keybindings'

/**
 * create button object
 * @param {string} title
 * @param {string} className
 * @param {string} action
 */
function createButton(title, className, action) {
  const button = {
    type: 'button',
    tooltips: createTooltips(title, action),
    className
  }
  if (action) {
    button.action = action
  }
  return button
}

/**
 * create tooltips
 * @param {string} title
 * @param {string} action
 */
function createTooltips(title, action) {
  let tooltips = ''
  if (action && keybindings[action]) {
    const keybinding = keybindings[action].mac
    tooltips = keybinding.indexOf('Cmd') >= 0
    ? keybinding.replace('Cmd', 'Ctrl/Cmd')
    : keybinding
  }
  return tooltips !== '' ? `${title} (${tooltips})` : title
}

/*
 * create separator
 */
function createSeparator() {
  return {
    type: 'separator',
    className: 'separator'
  }
}

// (title, icon, action)
const toolbar = [
  createButton('Bold', 'icon-bold', 'toggleBold'),
  createButton('Italic', 'icon-italic', 'toggleItalic'),
  createButton('Heading', 'icon-header', 'toggleHeading'),
  createButton('Marked', 'icon-magic', 'toggleMarked'),
  createButton('StrikeThrough', 'icon-strike', 'toggleStrikeThrough'),
  createButton('Underline', 'icon-underline', 'toggleUnderline'),
  createButton('Horizontal Rule', 'icon-ellipsis', 'insertHorizontalRule'),
  createSeparator(),
  createButton('Quote', 'icon-quote-left', 'toggleBlockquote'),
  createButton('Generic List', 'icon-list-bullet', 'toggleUnorderedList'),
  createButton('Numbered List', 'icon-list-numbered', 'toggleOrderedList'),
  createButton('Superscript', 'icon-superscript', 'toggleSuperscript'),
  createButton('Subscript', 'icon-subscript', 'toggleSubscript'),
  createSeparator(),
  createButton('Link', 'icon-link', 'insertLink'),
  createButton('Image', 'icon-picture', 'insertImage'),
  createButton('Code', 'icon-code', 'insertCode'),
  createButton('Table', 'icon-table', 'insertTable'),
  createSeparator(),
  createButton('Undo (Ctrl/Cmd-Z)', 'icon-reply', 'undo'),
  createButton('Redo (Shift-Ctrl/Cmd-Z)', 'icon-forward', 'redo'),
  createSeparator(),
  // createButton('Clear', 'icon-eraser', 'clear'),
  createButton('Show Table of Content', 'icon-book', 'toggleTocPreview'),
  createButton('Toggle Side by Side', 'icon-columns', 'toggleSideBySide'),
  createButton('Toggle Read mode', 'icon-eye', 'toggleReadmode'),
  // createButton('Toggle Fullscreen', 'icon-resize-full', 'toggleFullScreen'),
  createSeparator(),
  // createButton('Keyboard', 'icon-keyboard', 'showKeyboard'),
  // createButton('Markdown Guide', 'icon-help-circled', 'showMarkdownGuide'),
  // createButton('Export Markdown File', 'icon-book', 'exportMarkdownFile')
  createButton('Show Html Code', 'icon-html5', 'toggleHtmlCode'),
  createButton('Download markdown file', 'icon-download-cloud', 'downloadFile')
]

export default toolbar
