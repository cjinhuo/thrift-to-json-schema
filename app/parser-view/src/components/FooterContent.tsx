import styled from '@emotion/styled'
import React from 'react'

const FooterWrapper = styled.div`
  color: grey;
  text-align: center;
`
export default function FooterContent() {
  return <FooterWrapper>Copyright © {new Date().getFullYear()} Powered by Shanks.</FooterWrapper>
}
