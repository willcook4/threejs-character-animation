import styled from 'styled-components';

export const StyledLink = styled.a`
  position: fixed;
  bottom: 1em;
  left: 2em;
  /* Converting hexadecimal eg. 0x9a0523 to css Hex e.g #9a0523
  '#' + (this.state.primaryColor + 0x00000).toString(16).toUpperCase() */
  color: ${props => '#' + (props.textColor + 0x00000).toString(16).toUpperCase()};
  text-align: center;
  font-weight: bold;
  font-family: sans-serif;
`