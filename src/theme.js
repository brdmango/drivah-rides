export const C = {
  bg:      '#0B0C0F',
  surface: '#111318',
  card:    '#16191F',
  card2:   '#1C2028',
  border:  '#252A35',
  borderL: '#2E3545',

  blue:    '#1A56FF',
  blueL:   '#4B7BFF',
  amber:   '#F5A623',
  amberL:  '#FFD166',
  green:   '#00D68F',
  red:     '#FF4757',
  yellow:  '#FFD166',

  uf:      '#0021A5',
  ufO:     '#FA4616',

  white:   '#F0F4FF',
  sub:     '#6B7A99',
  muted:   '#2E3545',
  dim:     '#3D4560',
}

export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};overflow:hidden;-webkit-font-smoothing:antialiased;}
  input,textarea,select{outline:none;font-family:'DM Sans',sans-serif;}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;}
  ::-webkit-scrollbar{width:2px;}
  ::-webkit-scrollbar-thumb{background:${C.muted};border-radius:4px;}

  @keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes in{from{opacity:0}to{opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes pop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes slide{from{transform:translateX(100%)}to{transform:translateX(0)}}

  .up{animation:up .4s cubic-bezier(.22,1,.36,1) both;}
  .in{animation:in .3s ease both;}
  .shake{animation:shake .35s ease;}
  .spin{animation:spin .8s linear infinite;display:inline-block;}
  .pulse{animation:pulse 2s ease infinite;}
  .pop{animation:pop .3s cubic-bezier(.22,1,.36,1) both;}
  .slide{animation:slide .35s cubic-bezier(.22,1,.36,1) both;}
  .card-hover{transition:border-color .2s,background .2s;}
  .card-hover:hover{border-color:${C.borderL}!important;background:${C.card2}!important;}
`
