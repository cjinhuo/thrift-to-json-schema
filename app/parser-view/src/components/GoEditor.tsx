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
  const structString = `  struct EmptyStruct {
    string field_string
    double field_double
    i8 field_i8
    i16 field_i16
    i32 field_i32
    i64 field_i64
    bool field_bool
    optional string field_optional_string
    optional map<string, string> map_string_string
    optional map<string, i32> map_string_number
    PayloadStruct payload
    map<string, PayloadStruct> map_nest_payload
  }
  struct PayloadStruct {
    string field_string
    double field_double
  }`
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
