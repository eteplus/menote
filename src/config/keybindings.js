/* eslint-disable no-unused-vars */
const Command = 'Cmd'
const Shift = 'Shift'
const Alt = 'Alt'

function createKeyBinding(keys) {
  const keybinding = keys.join('-')
  return {
    win: keybinding.replace('Cmd', 'Ctrl'),
    mac: keybinding
  }
}

// action: keybinding
const keybindings = {
  'toggleBold': createKeyBinding([Command, 'B']),
  'toggleItalic': createKeyBinding([Shift, Command, 'I']),
  'toggleHeading': createKeyBinding([Command, 'H']),
  'toggleStrikeThrough': createKeyBinding([Shift, Command, 'S']),
  'toggleMarked': createKeyBinding([Shift, Command, 'M']),
  'toggleUnderline': createKeyBinding([Shift, Command, 'U']),
  'insertImage': createKeyBinding([Command, 'I']),
  'insertLink': createKeyBinding([Command, 'K']),
  'insertTable': createKeyBinding([Command, Alt, 'T']),
  'insertCode': createKeyBinding([Shift, Command, 'C']),
  'toggleBlockquote': createKeyBinding([Command, '.']),
  'toggleUnorderedList': createKeyBinding([Command, 'L']),
  'toggleOrderedList': createKeyBinding([Command, Alt, 'L']),
  'toggleReadmode': createKeyBinding([Command, 'P']),
  'toggleSideBySide': createKeyBinding(['F9'])
}

export default keybindings
