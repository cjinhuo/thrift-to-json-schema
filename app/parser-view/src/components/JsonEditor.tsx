import styled from '@emotion/styled'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { useAtomValue } from 'jotai'
import { EditorAtom } from '../atoms'
import { useEffect, useState } from 'react'
import { parseThriftToTypeBox } from '@trasm/thrift-jsma'
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
      console.log('err', err)
    })
    if (typeBox) {
      setJsonSchema(JSON.stringify(typeBox, null, 2))
    }
  }, [goContent])
  return (
    <Container>
      <CodeMirror value={jsonSchema} extensions={[json()]}></CodeMirror>
    </Container>
  )
}
