import { Layout } from '@arco-design/web-react'
import styled from '@emotion/styled'
import HeaderContent from './components/HeaderContent'
import FooterContent from './components/FooterContent'
import MainContent from './components/MainContent'
const LayoutWrapper = styled(Layout)`
  height: 100%;
`
const Header = styled(Layout.Header)`
  background-color: #fcfdfe;
  height: 48px;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  padding: 0 24px;
`
const Footer = styled(Layout.Footer)`
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
`
const Content = styled(Layout.Content)`
  padding: 12px;
`
function App() {
  return (
    <div className='App'>
      <LayoutWrapper>
        <Header>
          <HeaderContent></HeaderContent>
        </Header>
        <Content>
          <MainContent></MainContent>
        </Content>
        <Footer>
          <FooterContent></FooterContent>
        </Footer>
      </LayoutWrapper>
    </div>
  )
}

export default App
