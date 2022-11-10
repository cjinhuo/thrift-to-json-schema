import { Layout } from '@arco-design/web-react'
import styled from '@emotion/styled'
import HeaderContent from './components/HeaderContent'
import FooterContent from './components/FooterContent'
import MainContent from './components/MainContent'
import { useEffect } from 'react'
const LayoutWrapper = styled(Layout)`
  height: 100%;
`
const Header = styled(Layout.Header)`
  height: 48px;
  box-shadow: 0px 2px 6px rgba(255, 255, 255, 0.08);
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
  useEffect(() => {
    document.body.setAttribute('arco-theme', 'dark')
  }, [])
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
