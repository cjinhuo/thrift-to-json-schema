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
    string field_string // this is field_string description
    # @schema maxLength:66
    double field_double
    i8 field_i8 // int8 >= 0 && int8 <= 255
    i16 field_i16
    i32 field_i32
    i64 field_i64
    bool field_bool
    optional string field_optional_string // could customize key of JSON schema,like pattern
    # @schema pattern:'^[^$<>]+$'
    optional map<string, string> map_string_string
    # @schema value.maxLength:256
    optional map<string, i32> map_string_number
    PayloadStruct payload // field points to another struct
    map<string, PayloadStruct> map_nest_payload // map nests another struct
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
