// Der komplette Effekt in einem Durchlauf. Alle Regler kommen als Werte von 0 bis 1 an.
window.FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 outC;
uniform sampler2D uV, uO;
uniform vec2 uR;
uniform float uT, uSplit, uFps;
uniform float sharp, bleed, shift_, over, noise_, jitter, track, drop_, scan, head, flick, vig, sat, hue, con, pop;
uniform vec3 uC0, uC1, uC2;
const float L = 480.0;
const mat3 RY = mat3(.299,-.147,.615, .587,-.289,-.515, .114,.436,-.100);
const mat3 YR = mat3(1.,1.,1., 0.,-.395,2.032, 1.14,-.581,0.);
float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float n1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(h(vec2(i,1.)),h(vec2(i+1.,1.)),f); }
vec3 src(vec2 uv){
  uv=clamp(uv,vec2(.001),vec2(.999));
  vec4 o=texture(uO,uv);
  return mix(texture(uV,uv).rgb,o.rgb,o.a);
}
void main(){
  vec2 uv=vUv;
  if(uSplit>.5 && uv.x<.5){ outC=vec4(texture(uV,uv).rgb,1.); if(uv.x>.4985) outC=vec4(1.); return; }
  float line=floor(uv.y*L), fr=floor(uT*uFps+.001);
  float dx=(n1(line*.09+uT*6.)-.5)*.014*jitter+(h(vec2(line,fr))-.5)*.005*jitter;
  float c=fract(uT*.09+.2*n1(uT*.4));
  float on=step(.5,n1(uT*.9+7.));
  float band=smoothstep(.09,.0,abs(uv.y-c))*on*track;
  dx+=band*.14*(h(vec2(fr,floor(line/3.)))-.25);
  float hsH=.012+.03*head;
  float r=head>0.?smoothstep(1.-hsH,1.,uv.y):0.;
  dx+=r*r*.11*head*(.8+.4*h(vec2(fr,2.)));
  float x=uv.x+dx;
  float rl=(1.-sharp)*.011+.0006;
  float Y=0., W=0.;
  for(int i=-3;i<=3;i++){ float k=4.-abs(float(i)); Y+=dot(src(vec2(x+float(i)*rl/3.,uv.y)),vec3(.299,.587,.114))*k; W+=k; }
  Y/=W;
  float wide=0.;
  for(int i=-2;i<=2;i++) wide+=dot(src(vec2(x+float(i)*.0045,uv.y)),vec3(.299,.587,.114));
  Y+=(Y-wide/5.)*over*1.8;
  vec2 C=vec2(0.); W=0.;
  float rc=.0015+bleed*.04, cs=shift_*.022;
  for(int i=-4;i<=4;i++){ float k=5.-abs(float(i)); C+=(RY*src(vec2(x-cs+float(i)*rc/4.,uv.y))).yz*k; W+=k; }
  C/=W;
  float nb=noise_+band*.8;
  Y+=(h(vec2(floor(x*360.),line)+fr*.37)-.5)*nb*.34;
  Y+=(h(vec2(line,fr*.71))-.5)*nb*.03;
  vec2 cn=vec2(h(vec2(floor(x*40.),line)+fr*.13),h(vec2(floor(x*40.),line+9.)+fr*.19))-.5;
  C+=cn*nb*.14;
  float p=h(vec2(line,fr+3.));
  if(p>1.-drop_*.016){
    float s=h(vec2(line+3.,fr)), l=.02+.13*h(vec2(line+5.,fr));
    if(x>s && x<s+l) Y=max(Y,.92);
  }
  Y=mix(Y,h(vec2(floor(x*300.),line+fr))*.9,r*head*.7);
  Y=(Y-.5)*(con*2.)+.5;
  float a=(hue-.5)*6.2832, ca=cos(a), sa=sin(a);
  C=mat2(ca,sa,-sa,ca)*C*(sat*2.);
  vec3 rgb=YR*vec3(Y,C);
  float yy=clamp(Y,0.,1.);
  vec3 g=yy<.5?mix(uC0,uC1,yy*2.):mix(uC1,uC2,(yy-.5)*2.);
  rgb=mix(rgb,mix(g,g*(.5+.5*rgb/max(yy,.05)),.35),pop);
  rgb*=1.+(h(vec2(fr,5.))-.5)*.1*flick;
  rgb*=1.-scan*.38*mod(line,2.);
  vec2 d=uv-.5;
  rgb*=1.-vig*dot(d,d)*2.;
  outC=vec4(clamp(rgb,0.,1.),1.);
}`;
window.VERT = `#version 300 es
out vec2 vUv;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); vUv=vec2(p.x,1.-p.y); gl_Position=vec4(p*2.-1.,0.,1.); }`;
