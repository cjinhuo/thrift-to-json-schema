import { Grid, ResizeBox } from '@arco-design/web-react'
import styled from '@emotion/styled'
import GoEditor from './GoEditor'
import JsonEditor from './JsonEditor'

const SplitWrapper = styled(ResizeBox.Split)`
  height: 100%;
`
export default function MainContent() {
  return <SplitWrapper direction='horizontal' panes={[<GoEditor></GoEditor>, <JsonEditor></JsonEditor>]}></SplitWrapper>
}
