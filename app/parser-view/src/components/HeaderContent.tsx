import styled from '@emotion/styled'
import parser from '../assets/parser.svg'

const TitleWrapper = styled.div`
  font-size: 20px;
  font-weight: 500;
`
const Container = styled.div`
  display: flex;
  flex-direction: row;
  justify-items: center;
  align-items: center;
`
const ImgWrapper = styled.img`
  height: 40px;
  width: 100px;
  transform: scale(4);
  margin-right: 20px;
`
export default function HeaderContent() {
  console.log('parser', parser)
  return (
    <Container>
      <ImgWrapper src={parser}></ImgWrapper>
      {/* <TitleWrapper>Thrift To JSON Schema</TitleWrapper> */}
    </Container>
  )
}
