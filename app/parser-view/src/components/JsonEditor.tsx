import { json } from '@codemirror/lang-json'
import styled from '@emotion/styled'
import { parseThriftToTypeBox } from '@trasm/thrift-jsma'
import CodeMirror from '@uiw/react-codemirror'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import { EditorAtom } from '../atoms'

const Container = styled.div`
  height: 100%;
  max-height: calc(100vh - 100px);
  overflow: scroll;
`
export default function JsonEditor() {
	const [jsonSchema, setJsonSchema] = useState('')
	const { goContent } = useAtomValue(EditorAtom)
	useEffect(() => {
		const typeBox = parseThriftToTypeBox(goContent, (err) => {
			console.log('parser error', err)
		})
		if (typeBox) {
			setJsonSchema(JSON.stringify(typeBox, null, 2))
		}
	}, [goContent])
	return (
		<Container>
			<CodeMirror value={jsonSchema} theme='dark' extensions={[json()]} />
		</Container>
	)
}
