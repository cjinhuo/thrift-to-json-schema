import styled from '@emotion/styled'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { go } from '@codemirror/legacy-modes/mode/go'
import { useSetAtom } from 'jotai'
import { EditorAtom } from '../atoms'
const Container = styled.div`
  height: 100%;
  max-height: calc(100vh - 100px);
  overflow: scroll;
`
export default function GoEditor() {
  const setGoContent = useSetAtom(EditorAtom)
  const onChange = (content: string) => {
    setGoContent({
      goContent: content,
    })
  }
  const structString = `
  # @flag header
  # @schema additionalProperties:true
  struct EmptyStruct {
    string field_string
    double field_double
    i32 field_i32
    i64 field_i64
    bool field_bool
    optional string field_optional_string
  }
  `
  setGoContent({
    goContent: structString,
  })
  return (
    <Container className='go-gggg'>
      <CodeMirror
        value={structString}
        height='100%'
        extensions={[StreamLanguage.define(go)]}
        onChange={onChange}
      />
    </Container>
  )
}
