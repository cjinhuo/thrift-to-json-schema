import { json } from '@codemirror/lang-json'
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { useMemo } from 'react'

const thrift = StreamLanguage.define({
	startState: () => ({ inComment: false }),
	token(stream, state) {
		if (state.inComment || stream.match('/*')) {
			state.inComment = !stream.skipTo('*/')
			if (state.inComment) stream.skipToEnd()
			else stream.match('*/')
			return 'comment'
		}
		if (stream.eatSpace()) return null
		if (stream.match(/^(?:#|\/\/).*/)) return 'comment'
		if (stream.match(/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/)) return 'string'
		if (stream.match(/^-?\d+(?:\.\d+)?/)) return 'number'
		if (stream.match(/^(?:struct|enum|optional|required|namespace|include|const|typedef|union|service|exception)\b/))
			return 'keyword'
		if (stream.match(/^(?:string|binary|bool|byte|i8|i16|i32|i64|double|list|set|map)\b/)) return 'typeName'
		if (stream.match(/^[A-Z]\w*/)) return 'className'
		if (stream.match(/^[a-z_]\w*/)) return 'variableName'
		stream.next()
		return null
	},
})

const colors = syntaxHighlighting(
	HighlightStyle.define([
		{ tag: tags.keyword, color: '#8855a6', fontWeight: '500' },
		{ tag: [tags.typeName, tags.className], color: '#985521' },
		{ tag: tags.propertyName, color: '#805092' },
		{ tag: tags.string, color: '#2d7167' },
		{ tag: [tags.number, tags.bool, tags.null], color: '#9f4d24' },
		{ tag: tags.comment, color: '#68757c', fontStyle: 'italic' },
	])
)
const languages = { thrift, json: json() }
const basicSetup = {
	highlightActiveLine: false,
	highlightActiveLineGutter: false,
	foldGutter: false,
	highlightSelectionMatches: false,
	autocompletion: false,
	indentOnInput: false,
}

interface Props {
	language: keyof typeof languages
	label: string
	value: string
	onChange?: (value: string) => void
}

export default function CodeEditor({ language, label, value, onChange }: Props) {
	const readOnly = !onChange
	const extensions = useMemo(
		() => [
			languages[language],
			colors,
			EditorView.lineWrapping,
			EditorView.contentAttributes.of({
				'aria-label': label,
				role: 'textbox',
				'aria-readonly': String(readOnly),
				tabindex: '0',
			}),
		],
		[language, label, readOnly]
	)
	return (
		<CodeMirror
			className='code-editor'
			height='100%'
			value={value}
			readOnly={readOnly}
			editable={!readOnly}
			indentWithTab={false}
			basicSetup={basicSetup}
			extensions={extensions}
			onChange={onChange}
		/>
	)
}
