const {Plugin} = require("prosemirror-state")

// ::- Input rules are regular expressions describing a piece of text
// that, when typed, causes something to happen. This might be
// changing two dashes into an emdash, wrapping a paragraph starting
// with `"> "` into a blockquote, or something entirely different.
class InputRule {
  // :: (RegExp, union<string, (state: EditorState, match: [string], start: number, end: number) → ?EditorTransform>)
  // Create an input rule. The rule applies when the user typed
  // something and the text directly in front of the cursor matches
  // `match`, which should probably end with `$`.
  //
  // The `handler` can be a string, in which case the matched text, or
  // the first matched group in the regexp, simply be replaced by that
  // string.
  //
  // Or a it can be a function, which will be called with the match
  // array produced by
  // [`RegExp.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec),
  // as well as the start and end of the matched range, and which can
  // return a [transform](#state.EditorTransform) that describes the
  // rule's effect, or null to indicate the input was not handled.
  constructor(match, handler) {
    this.match = match
    this.handler = typeof handler == "string" ? stringHandler(handler) : handler
  }
}
exports.InputRule = InputRule

function stringHandler(string) {
  return function(state, match, start, end) {
    let insert = string
    if (match[1]) {
      let offset = match[0].lastIndexOf(match[1])
      insert += match[0].slice(offset + match[1].length)
      start += offset
      let cutOff = start - end
      if (cutOff > 0) {
        insert = match[0].slice(offset - cutOff, offset) + insert
        start = end
      }
    }
    let marks = state.doc.marksAt(start)
    return state.tr.replaceWith(start, end, state.schema.text(insert, marks))
  }
}

const MAX_MATCH = 100

// :: (config: {rules: [InputRule]}) → Plugin
// Create an input rules plugin. When enabled, it will cause text
// input that matches any of the given rules to trigger the rule's
// action, and binds the backspace key, when applied directly after an
// input rule triggered, to undo the rule's effect.
function inputRules({rules}) {
  return new Plugin({
    state: {
      init() { return null },
      applyAction(action, prev) {
        if (action.type == "transform") return action.fromInputRule
        if (action.type == "selection") return null
        return prev
      }
    },

    props: {
      handleTextInput(view, from, to, text) {
        let state = view.state, $from = state.doc.resolve(from)
        let textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - MAX_MATCH), $from.parentOffset,
                                                  null, "\ufffc") + text
        for (let i = 0; i < rules.length; i++) {
          let match = rules[i].match.exec(textBefore)
          let transform = match && rules[i].handler(state, match, from - (match[0].length - text.length), to)
          if (!transform) continue
          view.props.onAction(transform.action({fromInputRule: {transform, from, to, text}}))
          return true
        }
        return false
      },

      handleKeyDown(view, event) {
        if (event.keyCode == 8) return maybeUndoInputRule(view.state, view.props.onAction, this.getState(view.state))
        return false
      }
    }
  })
}
exports.inputRules = inputRules

function maybeUndoInputRule(state, onAction, undoable) {
  if (!undoable) return false
  let tr = state.tr, toUndo = undoable.transform
  for (let i = toUndo.steps.length - 1; i >= 0; i--)
    tr.step(toUndo.steps[i].invert(toUndo.docs[i]))
  let marks = tr.doc.marksAt(undoable.from)
  tr.replaceWith(undoable.from, undoable.to, state.schema.text(undoable.text, marks))
  onAction(tr.action())
  return true
}
