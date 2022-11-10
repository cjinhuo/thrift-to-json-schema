import styled from '@emotion/styled'
import parser from '../assets/parser.svg'
import { IconGithub, IconLink } from '@arco-design/web-react/icon'
import { Tooltip } from '@arco-design/web-react'

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-items: center;
  align-items: center;
  justify-content: space-between;
`
const ImgWrapper = styled.img`
  height: 40px;
  width: 100px;
  transform: scale(4);
  margin-right: 20px;
`
const IconGithubWrapper = styled(IconGithub)`
  font-size: 18px;
  cursor: pointer;
  color: #ececec;
  &:hover {
    background-color: #585858;
  }
`

const IconLinkWrapper = styled(IconLink)`
  font-size: 18px;
  cursor: pointer;
  color: #ececec;
  margin-left: 16px;
  &:hover {
    background-color: #585858;
  }
`
const TooltipWrapper = styled(Tooltip)`
  /* .arco-tooltip-content-inner {
    color: black !important;
  } */
`
export default function HeaderContent() {
  return (
    <Container>
      <ImgWrapper src={parser}></ImgWrapper>
      <RightIcons></RightIcons>
    </Container>
  )
}
function RightIcons() {
  const onClickGithubIcon = () => {
    window.open('https://github.com/cjinhuo/thrift-to-json-schema')
  }
  const onClickLinkIcon = () => {
    window.open('https://www.jsonschemavalidator.net')
  }
  return (
    <div>
      <IconGithubWrapper onClick={onClickGithubIcon} />
      <TooltipWrapper content='validator'>
        <IconLinkWrapper onClick={onClickLinkIcon} />
      </TooltipWrapper>
    </div>
  )
}
