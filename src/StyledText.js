import React from 'react'
import styled from 'styled-components'

const StyledTxt = styled.div`
  position: fixed;
  top: 0;
  left: 1em;
  width: 100%;
`
let Heading = styled('h1')`
  color: ${props => '#' + (props.textColor + 0x00000).toString(16).toUpperCase()};
  font-weight: 200;
  margin-bottom: 0.5em;
`
let StyledP = styled('p')`
  color: ${props => '#' + (props.textColor + 0x00000).toString(16).toUpperCase()};
  margin-top: -10px;
  font-weight: 600;
  width: fit-content;
  font-size: 0.8em;
`

export const StyledText = (props) => (
  <StyledTxt>
    <Heading
      textColor={props.textColor}>
      {props.title}
    </Heading>
    <p>{props.subTitle}</p>
    <StyledP
      textColor={props.textColor}>
      Click/Touch on Eric to see what he has in him
    </StyledP>
  </StyledTxt>
)